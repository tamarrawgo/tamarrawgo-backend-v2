import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleTripCleanup() {
    try {
      await this.cleanupOldTrips();
      this.logger.log('Trip cleanup completed');
    } catch (err) {
      this.logger.error('Trip cleanup failed', err);
    }
  }

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
    const conditions: any[] = [
      { role: 'PASSENGER' },
      { role: 'ADMIN' },
      { role: 'RIDER', rider: { status: 'APPROVED' } },
    ];
    const where: any = { OR: conditions };
    if (search) {
      where.AND = [{
        OR: [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }];
    }

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
    const where = { status: 'PENDING' as any, user: { status: 'ACTIVE' as any } };
    const [riders, total] = await Promise.all([
      this.prisma.riderProfile.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true, phone: true, email: true } },
          vehicle: true,
          documents: true,
        },
      }),
      this.prisma.riderProfile.count({ where }),
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
    await this.prisma.user.update({ where: { id: rider.userId }, data: { status: 'ACTIVE' } });
    return this.prisma.riderProfile.update({ where: { id: riderId }, data: { status: 'APPROVED' } });
  }

  async rejectRider(riderId: string, reason: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    await this.deleteUser(rider.userId);
    return { message: 'Rider rejected and account deleted' };
  }

  async getTripMonitoring(page = 1, limit = 20, status?: string) {
    const maxRecords = 100;
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: Math.min(limit, maxRecords - skip),
        orderBy: { createdAt: 'desc' },
        include: {
          passenger: { select: { firstName: true, lastName: true, phone: true } },
          rider: { include: { user: { select: { firstName: true, lastName: true, phone: true } } } },
          payment: true,
        },
      }),
      this.prisma.booking.count({ where }),
    ]);
    const capped = Math.min(total, maxRecords);
    return { data: bookings, total: capped, page, limit, totalPages: Math.ceil(capped / limit) };
  }

  async cleanupOldTrips() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Find bookings older than 30 days (only terminal statuses)
    const oldBookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { in: ['COMPLETED', 'CANCELLED'] },
      },
      select: { id: true },
    });
    const deleteIds = oldBookings.map((b) => b.id);

    if (deleteIds.length === 0) return;

    await this.prisma.chatMessage.deleteMany({ where: { bookingId: { in: deleteIds } } });
    await this.prisma.payment.deleteMany({ where: { bookingId: { in: deleteIds } } });
    await this.prisma.rating.deleteMany({ where: { bookingId: { in: deleteIds } } });
    await this.prisma.booking.deleteMany({ where: { id: { in: deleteIds } } });

    this.logger.log(`Cleaned up ${deleteIds.length} bookings older than 30 days`);
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
