import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private config: ConfigService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        status: true,
        profilePhoto: true,
        validIdUrl: true,
        verificationStatus: true,
        loyaltyPoints: true,
        createdAt: true,
        rider: {
          select: {
            id: true,
            status: true,
            onlineStatus: true,
            rating: true,
            totalTrips: true,
            walletBalance: true,
            vehicleType: true,
            vehicle: true,
            documents: { select: { id: true, type: true, fileUrl: true, verified: true, createdAt: true } },
          },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        email: dto.email,
        profilePhoto: dto.profilePhoto,
      },
      select: {
        id: true,
        phone: true,
        email: true,
        firstName: true,
        lastName: true,
        profilePhoto: true,
        updatedAt: true,
      },
    });
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.prisma.user.update({ where: { id: userId }, data: { fcmToken } });
    return { message: 'FCM token updated' };
  }

  async uploadProfilePhoto(userId: string, base64: string, fileName: string) {
    const hasFace = await this.detectFace(base64);
    if (!hasFace) {
      throw new BadRequestException('No face detected in the photo. Please retake with your face clearly visible.');
    }

    const supabaseUrl = this.config.get('SUPABASE_URL');
    const serviceKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Storage not configured');

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { validIdUrl: true, verificationStatus: true, role: true },
    });

    // Delete any previous profile photo for this user (different extensions, old timestamped files)
    try {
      const { data: existing } = await axios.post(`${supabaseUrl}/storage/v1/object/list/rider-documents`, { prefix: 'profile-photos/' }, {
        headers: { Authorization: `Bearer ${serviceKey}` },
      });
      const oldFiles = Array.isArray(existing) ? existing.filter((f: any) => f.name.startsWith(`${userId}-`) || f.name.startsWith(`${userId}.`)) : [];
      if (oldFiles.length > 0) {
        await axios.delete(`${supabaseUrl}/storage/v1/object/rider-documents`, {
          headers: { Authorization: `Bearer ${serviceKey}` },
          data: { prefixes: oldFiles.map((f: any) => `profile-photos/${f.name}`) },
        });
      }
    } catch { /* non-fatal — proceed with upload */ }

    const buffer = Buffer.from(base64, 'base64');
    const ext = fileName.split('.').pop() ?? 'jpg';
    const path = `profile-photos/${userId}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    await axios.put(`${supabaseUrl}/storage/v1/object/rider-documents/${path}`, buffer, {
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    });

    const photoUrl = `${supabaseUrl}/storage/v1/object/public/rider-documents/${path}?t=${Date.now()}`;
    await this.prisma.user.update({ where: { id: userId }, data: { profilePhoto: photoUrl } });

    if (
      currentUser?.role === 'PASSENGER' &&
      currentUser?.validIdUrl &&
      (currentUser.verificationStatus === 'UNVERIFIED' || currentUser.verificationStatus === 'REJECTED')
    ) {
      await this.prisma.user.update({ where: { id: userId }, data: { verificationStatus: 'PENDING' } });
    }

    return { url: photoUrl };
  }

  async uploadValidId(userId: string, base64: string, fileName: string) {
    const supabaseUrl = this.config.get('SUPABASE_URL');
    const serviceKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) throw new Error('Storage not configured');

    const currentUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { profilePhoto: true, verificationStatus: true, role: true },
    });

    const buffer = Buffer.from(base64, 'base64');
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'jpg';
    const path = `passenger-valid-id/${userId}.${ext}`;
    const contentType = ext === 'png' ? 'image/png' : 'image/jpeg';

    await axios.put(`${supabaseUrl}/storage/v1/object/rider-documents/${path}`, buffer, {
      headers: { Authorization: `Bearer ${serviceKey}`, 'Content-Type': contentType, 'x-upsert': 'true' },
    });

    const idUrl = `${supabaseUrl}/storage/v1/object/public/rider-documents/${path}?t=${Date.now()}`;
    await this.prisma.user.update({ where: { id: userId }, data: { validIdUrl: idUrl } });

    if (
      currentUser?.role === 'PASSENGER' &&
      currentUser?.profilePhoto &&
      (currentUser.verificationStatus === 'UNVERIFIED' || currentUser.verificationStatus === 'REJECTED')
    ) {
      await this.prisma.user.update({ where: { id: userId }, data: { verificationStatus: 'PENDING' } });
    }

    return { url: idUrl };
  }

  private async detectFace(base64: string): Promise<boolean> {
    const apiKey = this.config.get('GOOGLE_MAPS_API_KEY');
    if (!apiKey) return true; // skip check if not configured

    try {
      const { data } = await axios.post(
        `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
        { requests: [{ image: { content: base64 }, features: [{ type: 'FACE_DETECTION', maxResults: 1 }] }] },
      );
      const faces = data?.responses?.[0]?.faceAnnotations;
      return Array.isArray(faces) && faces.length > 0;
    } catch (e) {
      // If Vision API fails (quota, network), don't block the user — allow upload
      return true;
    }
  }

  async getTripHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where: { passengerId: userId, status: { in: ['COMPLETED', 'CANCELLED'] } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          rider: { include: { user: { select: { firstName: true, lastName: true, profilePhoto: true } } } },
          payment: true,
          rating: true,
        },
      }),
      this.prisma.booking.count({
        where: { passengerId: userId, status: { in: ['COMPLETED', 'CANCELLED'] } },
      }),
    ]);

    return { data: bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
