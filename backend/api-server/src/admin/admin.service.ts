import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async getDashboardStats() {
    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalRiders,
      activeRiders,
      todayBookings,
      todayRevenue,
      monthlyRevenue,
      pendingRiders,
      openTickets,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'PASSENGER' } }),
      this.prisma.riderProfile.count(),
      this.prisma.riderProfile.count({ where: { onlineStatus: 'ONLINE' } }),
      this.prisma.booking.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.payment.aggregate({
        where: { createdAt: { gte: todayStart }, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: { createdAt: { gte: monthStart }, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.riderProfile.count({ where: { status: 'PENDING' } }),
      this.prisma.supportTicket.count({ where: { status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
    ]);

    return {
      totalUsers,
      totalRiders,
      activeRiders,
      todayBookings,
      todayRevenue: Number(todayRevenue._sum.amount ?? 0),
      monthlyRevenue: Number(monthlyRevenue._sum.amount ?? 0),
      pendingRiders,
      openTickets,
    };
  }

  async getUsers(page = 1, limit = 20, search?: string) {
    const skip = (page - 1) * limit;
    const where = search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' as const } },
            { lastName: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, phone: true, email: true, firstName: true, lastName: true,
          role: true, status: true, createdAt: true,
          rider: {
            select: {
              id: true, licenseNumber: true, status: true, rating: true, onlineStatus: true, walletBalance: true,
              vehicle: true,
              documents: { select: { id: true, type: true, fileUrl: true, verified: true, createdAt: true } },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data: users, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async suspendUser(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
  }

  async activateUser(userId: string) {
    return this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
  }

  async deleteUser(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });

    // Delete rider-related records
    if (rider) {
      await this.prisma.walletTransaction.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.riderDocument.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.earning.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.rating.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.payment.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.booking.updateMany({ where: { riderId: rider.id }, data: { riderId: null } });
      await this.prisma.vehicle.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.riderProfile.delete({ where: { userId } });
    }

    // Delete bookings and their related records
    const bookings = await this.prisma.booking.findMany({ where: { passengerId: userId }, select: { id: true } });
    const bookingIds = bookings.map((b) => b.id);
    if (bookingIds.length > 0) {
      await this.prisma.payment.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await this.prisma.rating.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await this.prisma.chatMessage.deleteMany({ where: { bookingId: { in: bookingIds } } });
    }
    await this.prisma.booking.deleteMany({ where: { passengerId: userId } });

    // Delete user-related records
    await this.prisma.complaint.deleteMany({ where: { OR: [{ userId }, { reportedUserId: userId }] } });
    await this.prisma.pointTransaction.deleteMany({ where: { userId } });
    await this.prisma.notification.deleteMany({ where: { userId } });
    await this.prisma.chatMessage.deleteMany({ where: { senderId: userId } });
    await this.prisma.supportTicket.deleteMany({ where: { userId } });
    await this.prisma.auditLog.deleteMany({ where: { userId } });

    return this.prisma.user.delete({ where: { id: userId } });
  }

  async getPendingRiders(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [riders, total] = await Promise.all([
      this.prisma.riderProfile.findMany({
        where: { status: 'PENDING' },
        skip,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true, phone: true, email: true } },
          vehicle: true,
          documents: true,
        },
      }),
      this.prisma.riderProfile.count({ where: { status: 'PENDING' } }),
    ]);
    return { data: riders, total, page, limit };
  }

  async topupRiderWallet(riderId: string, amount: number) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    if (amount <= 0) throw new Error('Amount must be greater than 0');
    return this.prisma.riderProfile.update({
      where: { id: riderId },
      data: { walletBalance: { increment: amount } },
    });
  }

  async approveRider(riderId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    return this.prisma.riderProfile.update({ where: { id: riderId }, data: { status: 'APPROVED' } });
  }

  async rejectRider(riderId: string, reason: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    // Suspend the user account so the rider cannot log in or go online
    await this.prisma.user.update({ where: { id: rider.userId }, data: { status: 'SUSPENDED' } });
    return this.prisma.riderProfile.update({ where: { id: riderId }, data: { status: 'REJECTED' } });
  }

  async getTripMonitoring(page = 1, limit = 20, status?: string) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          passenger: { select: { firstName: true, lastName: true, phone: true } },
          rider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
          payment: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    return { data: bookings, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async cancelTrip(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    const terminal = ['COMPLETED', 'CANCELLED', 'EXPIRED'];
    if (terminal.includes(booking.status)) throw new Error(`Booking is already ${booking.status.toLowerCase()}`);
    return this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancellationReason: 'Cancelled by admin', cancelledAt: new Date() },
    });
  }

  async getRevenueReport(days = 30) {
    const from = new Date();
    from.setDate(from.getDate() - days);

    const payments = await this.prisma.payment.findMany({
      where: { createdAt: { gte: from }, status: 'COMPLETED' },
      select: { amount: true, createdAt: true },
    });

    const byDay: Record<string, number> = {};
    for (const p of payments) {
      const day = p.createdAt.toISOString().split('T')[0];
      byDay[day] = (byDay[day] ?? 0) + Number(p.amount);
    }

    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, revenue]) => ({ date, revenue }));
  }
}
