import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLocationDto, UpdateOnlineStatusDto, AddVehicleDto, UploadDocumentDto } from './dto/rider.dto';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class RidersService {
  constructor(
    private prisma: PrismaService,
    private socket: SocketGateway,
    private config: ConfigService,
  ) {}

  async uploadDocumentFile(userId: string, base64: string, fileName: string, docType: string): Promise<string> {
    const supabaseUrl = this.config.get('SUPABASE_URL');
    const serviceKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Storage not configured');

    const buffer = Buffer.from(base64, 'base64');
    const ext = fileName.split('.').pop() ?? 'jpg';
    const path = `${userId}/${docType}-${Date.now()}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : ext === 'pdf' ? 'application/pdf' : 'image/jpeg';

    // Upload via Supabase Storage REST API (no WebSocket needed)
    await axios.put(
      `${supabaseUrl}/storage/v1/object/rider-documents/${path}`,
      buffer,
      {
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
      }
    );

    return `${supabaseUrl}/storage/v1/object/public/rider-documents/${path}`;
  }

  private async getRiderProfile(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider profile not found');
    return rider;
  }

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const rider = await this.getRiderProfile(userId);

    await this.prisma.riderProfile.update({
      where: { id: rider.id },
      data: {
        currentLatitude: dto.latitude,
        currentLongitude: dto.longitude,
        currentHeading: dto.heading,
        currentSpeed: dto.speed,
        lastLocationUpdate: new Date(),
      },
    });

    // Broadcast to any passenger tracking this rider
    this.socket.broadcastRiderLocation(rider.id, dto);

    return { message: 'Location updated' };
  }

  async updateStatus(userId: string, dto: UpdateOnlineStatusDto) {
    const rider = await this.getRiderProfile(userId);
    if (rider.status !== 'APPROVED') {
      throw new ForbiddenException('Rider account not approved');
    }

    await this.prisma.riderProfile.update({
      where: { id: rider.id },
      data: { onlineStatus: dto.status },
    });

    this.socket.broadcastRiderStatus(rider.id, dto.status);
    return { message: `Status changed to ${dto.status}` };
  }

  async addVehicle(userId: string, dto: AddVehicleDto) {
    const rider = await this.getRiderProfile(userId);
    return this.prisma.vehicle.upsert({
      where: { riderId: rider.id },
      update: { ...dto },
      create: { riderId: rider.id, ...dto },
    });
  }

  async saveProfilePhoto(userId: string, url: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { profilePhoto: url } });
  }

  async uploadDocument(userId: string, dto: UploadDocumentDto) {
    const rider = await this.getRiderProfile(userId);
    return this.prisma.riderDocument.create({
      data: { riderId: rider.id, type: dto.type as any, fileUrl: dto.fileUrl },
    });
  }

  async getEarnings(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider) throw new NotFoundException('Rider profile not found');

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 7);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, week, month, totalTrips, todayTrips] = await Promise.all([
      this.prisma.earning.aggregate({
        where: { riderId: rider.id, date: { gte: todayStart } },
        _sum: { amount: true },
      }),
      this.prisma.earning.aggregate({
        where: { riderId: rider.id, date: { gte: weekStart } },
        _sum: { amount: true },
      }),
      this.prisma.earning.aggregate({
        where: { riderId: rider.id, date: { gte: monthStart } },
        _sum: { amount: true },
      }),
      this.prisma.booking.count({
        where: { riderId: rider.id, status: 'COMPLETED' },
      }),
      this.prisma.booking.count({
        where: { riderId: rider.id, status: 'COMPLETED', updatedAt: { gte: todayStart } },
      }),
    ]);

    return {
      today: Number(today._sum.amount ?? 0),
      thisWeek: Number(week._sum.amount ?? 0),
      thisMonth: Number(month._sum.amount ?? 0),
      totalTrips,
      todayTrips,
      averageRating: Number(rider.rating),
      walletBalance: Number(rider.walletBalance),
    };
  }

  async getTrips(userId: string, page = 1, limit = 10) {
    const rider = await this.getRiderProfile(userId);
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { riderId: rider.id, status: { in: ['COMPLETED', 'CANCELLED'] } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          passenger: { select: { firstName: true, lastName: true, profilePhoto: true } },
          payment: true,
          rating: true,
        },
      }),
      this.prisma.booking.count({
        where: { riderId: rider.id, status: { in: ['COMPLETED', 'CANCELLED'] } },
      }),
    ]);

    return { data: bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getNearbyRiders(latitude: number, longitude: number, radiusKm = 5) {
    const riders = await this.prisma.riderProfile.findMany({
      where: {
        onlineStatus: 'ONLINE',
        status: 'APPROVED',
        currentLatitude: { not: null },
        currentLongitude: { not: null },
      },
      include: {
        user: { select: { firstName: true, lastName: true, profilePhoto: true } },
        vehicle: true,
      },
    });

    return riders
      .filter((r) => {
        if (!r.currentLatitude || !r.currentLongitude) return false;
        const dist = haversine(latitude, longitude, r.currentLatitude, r.currentLongitude);
        return dist <= radiusKm;
      })
      .map((r) => ({
        riderId: r.id,
        userId: r.userId,
        name: `${r.user.firstName} ${r.user.lastName}`,
        rating: r.rating,
        latitude: r.currentLatitude,
        longitude: r.currentLongitude,
        vehicle: r.vehicle,
      }));
  }
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
