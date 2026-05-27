import { io, Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { SocketEvent } from '@tamarrawgo/shared-types';

const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:3000';

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket> {
  if (socket?.connected) return socket;

  const token = await SecureStore.getItemAsync('riderAccessToken');
  socket = io(`${SOCKET_URL}/ws`, {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: 5,
  });

  socket.on('connect', () => console.log('[RiderSocket] Connected:', socket?.id));
  socket.on('disconnect', (reason) => console.log('[RiderSocket] Disconnected:', reason));
  socket.on('connect_error', (err) => console.error('[RiderSocket] Error:', err.message));

  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export { SocketEvent };
