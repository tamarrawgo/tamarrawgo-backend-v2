import { Injectable, NotFoundException, ForbiddenException, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLocationDto, UpdateOnlineStatusDto, AddVehicleDto, UploadDocumentDto, CreateTopupRequestDto } from './dto/rider.dto';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class RidersService implements OnModuleInit {
  private readonly logger = new Logger(RidersService.name);
  private redis: Redis | null = null;

  constructor(
    private prisma: PrismaService,
    private socket: SocketGateway,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const redisUrl = this.config.get('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        connectTimeout: 5000,
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => (times > 3 ? null : Math.min(times * 1000, 5000)),
        lazyConnect: true,
      });
      this.redis.connect().then(() => this.logger.log('Redis connected for rider locations')).catch(() => {
        this.logger.warn('Redis connection failed — falling back to DB only');
        this.redis = null;
      });
      this.redis.on('error', () => {});
    }
  }

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

  // Cache riderId → passengerId so we don't query DB every 3 seconds
  private riderPassengerCache = new Map<string, { passengerId: string; expires: number }>();

  async updateLocation(userId: string, dto: UpdateLocationDto) {
    const rider = await this.getRiderProfile(userId);

    // Write to Redis for fast reads (fire-and-forget, never blocks)
    if (this.redis?.status === 'ready') {
      const locData = JSON.stringify({ currentLatitude: dto.latitude, currentLongitude: dto.longitude, currentHeading: dto.heading, lastLocationUpdate: new Date().toISOString() });
      this.redis.set(`rider:loc:${rider.id}`, locData, 'EX', 30).catch(() => {});
    }

    // Write to DB (persistent)
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

    // Look up the passenger for this rider's active booking (cached for 30s)
    let passengerId: string | undefined;
    const cached = this.riderPassengerCache.get(rider.id);
    if (cached && cached.expires > Date.now()) {
      passengerId = cached.passengerId;
    } else {
      const booking = await this.prisma.booking.findFirst({
        where: { riderId: rider.id, status: { in: ['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] } },
        select: { passengerId: true },
      });
      if (booking) {
        passengerId = booking.passengerId;
        this.riderPassengerCache.set(rider.id, { passengerId, expires: Date.now() + 30000 });
      } else {
        this.riderPassengerCache.delete(rider.id);
      }
    }

    // Broadcast to passenger's auto-joined user room (reliable) + tracking room (legacy)
    this.socket.broadcastRiderLocation(rider.id, dto, passengerId);

    return { message: 'Location updated' };
  }

  async getRiderLocation(riderId: string) {
    // Try Redis first (fast, ~1ms)
    if (this.redis) {
      try {
        const cached = await this.redis.get(`rider:loc:${riderId}`);
        if (cached) return JSON.parse(cached);
      } catch {}
    }

    // Fall back to DB (slower, ~50ms)
    const result: any[] = await this.prisma.$queryRaw`
      SELECT "currentLatitude", "currentLongitude", "currentHeading", "lastLocationUpdate"
      FROM rider_profiles WHERE id = ${riderId} LIMIT 1
    `;
    if (!result || result.length === 0) throw new NotFoundException('Rider not found');
    return result[0];
  }

  async updateStatus(userId: string, dto: UpdateOnlineStatusDto) {
    const rider = await this.getRiderProfile(userId);
    if (rider.status !== 'APPROVED') {
      throw new ForbiddenException('Rider account not approved');
    }
    if (dto.status === 'ONLINE' && Number(rider.walletBalance) < 100) {
      throw new ForbiddenException('Insufficient wallet balance. Minimum ₱100 required to go online.');
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
    if (rider.status === 'APPROVED') {
      throw new ForbiddenException('Documents cannot be changed after account approval');
    }
    return this.prisma.riderDocument.create({
      data: { riderId: rider.id, type: dto.type as any, fileUrl: dto.fileUrl },
    });
  }

  async createTopupRequest(userId: string, dto: CreateTopupRequestDto) {
    const rider = await this.getRiderProfile(userId);

    const buffer = Buffer.from(dto.base64, 'base64');
    const ext = dto.fileName.split('.').pop() ?? 'jpg';
    const path = `topup-receipts/${userId}-${Date.now()}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    const supabaseUrl = this.config.get('SUPABASE_URL');
    const serviceKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Storage not configured');

    await axios.put(`${supabaseUrl}/storage/v1/object/rider-documents/${path}`, buffer, {
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    });
    const receiptUrl = `${supabaseUrl}/storage/v1/object/public/rider-documents/${path}`;

    const ocrAmount = await this.extractAmountFromReceipt(dto.base64);

    return this.prisma.topupRequest.create({
      data: {
        riderId: rider.id,
        amount: dto.amount,
        receiptUrl,
        referenceNumber: dto.referenceNumber,
        ocrAmount: ocrAmount ?? undefined,
      },
    });
  }

  private async extractAmountFromReceipt(base64: string): Promise<number | null> {
    const apiKey = this.config.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return null;
    try {
      const { data } = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        { requests: [{ image: { content: base64 }, features: [{ type: 'TEXT_DETECTION' }] }] },
      );
      const text: string = data?.responses?.[0]?.fullTextAnnotation?.text ?? '';
      // Look for currency-like amounts: ₱500.00, 500.00, PHP 500, etc. Pick the largest plausible match.
      const matches = text.match(/(?:₱|PHP|P)?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/gi) ?? [];
      const numbers = matches
        .map((m) => parseFloat(m.replace(/[^\d.]/g, '')))
        .filter((n) => !isNaN(n) && n > 0 && n < 1000000);
      if (numbers.length === 0) return null;
      return Math.max(...numbers);
    } catch (e) {
      this.logger.warn('OCR extraction failed', e);
      return null;
    }
  }

  async getMyTopupRequests(userId: string) {
    const rider = await this.getRiderProfile(userId);
    return this.prisma.topupRequest.findMany({
      where: { riderId: rider.id },
      orderBy: { createdAt: 'desc' },
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
