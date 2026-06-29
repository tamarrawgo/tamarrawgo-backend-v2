import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
