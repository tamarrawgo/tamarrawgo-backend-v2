import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';
import { SocketEvent, BookingRequestPayload, BookingStatusUpdate, ChatMessage } from '@tamarrawgo/shared-types';
import { UpdateLocationDto } from '../riders/dto/rider.dto';

@WebSocketGateway({
  cors: { origin: '*', credentials: true },
  namespace: '/ws',
  transports: ['websocket', 'polling'],
})
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  private readonly logger = new Logger(SocketGateway.name);
  private connectedUsers = new Map<string, string>(); // userId → socketId
  private connectedRiders = new Map<string, string>(); // riderId → socketId

  constructor(
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async afterInit(server: Server) {
    const redisUrl = this.config.get<string>('REDIS_URL');
    if (redisUrl) {
      try {
        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();
        await Promise.all([pubClient.connect(), subClient.connect()]);
        server.adapter(createAdapter(pubClient, subClient));
        this.logger.log('Socket.IO Redis adapter connected');
      } catch (err) {
        this.logger.warn(`Redis adapter failed, running single-instance: ${err}`);
      }
    } else {
      this.logger.log('No REDIS_URL — running without Redis adapter');
    }
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token || client.handshake.headers?.authorization?.replace('Bearer ', '');
      if (!token) { client.disconnect(); return; }

      const payload = this.jwt.verify(token, { secret: this.config.getOrThrow('JWT_SECRET') });
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      client.data.riderId = payload.riderId;

      this.connectedUsers.set(payload.sub, client.id);
      client.join(`user:${payload.sub}`);

      this.logger.log(`Client connected: ${payload.sub} (${payload.role})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      this.connectedUsers.delete(client.data.userId);
      this.logger.log(`Client disconnected: ${client.data.userId}`);
    }
  }

  @SubscribeMessage(SocketEvent.JOIN_ROOM)
  handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.join(room);
    return { joined: room };
  }

  @SubscribeMessage(SocketEvent.LEAVE_ROOM)
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() room: string) {
    client.leave(room);
    return { left: room };
  }

  @SubscribeMessage(SocketEvent.CHAT_MESSAGE)
  handleChatMessage(@ConnectedSocket() client: Socket, @MessageBody() msg: ChatMessage) {
    this.server.to(`booking:${msg.bookingId}`).emit(SocketEvent.CHAT_MESSAGE, msg);
    return msg;
  }

  // Called by RidersService every 3 seconds
  broadcastRiderLocation(riderId: string, location: UpdateLocationDto, passengerId?: string) {
    const payload = { riderId, ...location, timestamp: Date.now() };
    // Send to tracking room (for clients that joined it)
    this.server.to(`tracking:${riderId}`).emit(SocketEvent.RIDER_LOCATION, payload);
    // Also send directly to passenger's auto-joined user room (always reliable)
    if (passengerId) {
      this.server.to(`user:${passengerId}`).emit(SocketEvent.RIDER_LOCATION, payload);
    }
  }

  broadcastRiderStatus(riderId: string, status: string) {
    this.server.emit(SocketEvent.RIDER_STATUS_CHANGE, { riderId, status });
  }

  sendBookingRequest(riderId: string, payload: BookingRequestPayload) {
    this.server.to(`user:${riderId}`).emit(SocketEvent.BOOKING_REQUEST, payload);
  }

  notifyBookingAccepted(passengerId: string, update: BookingStatusUpdate) {
    this.server.to(`user:${passengerId}`).emit(SocketEvent.BOOKING_ASSIGNED, update);
  }

  notifyBookingStatusUpdate(passengerId: string, update: { bookingId: string; status: any }) {
    this.server.to(`user:${passengerId}`).emit(SocketEvent.BOOKING_STATUS_UPDATE, update);
  }

  sendToUser(userId: string, event: string, data: any) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  getOnlineUserCount(): number {
    return this.connectedUsers.size;
  }
}
