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
        select: { id: true, phone: true, email: true, firstName: true, lastName: true, role: true, status: true, createdAt: true },
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

  async approveRider(riderId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
    return this.prisma.riderProfile.update({ where: { id: riderId }, data: { status: 'APPROVED' } });
  }

  async rejectRider(riderId: string, reason: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { id: riderId } });
    if (!rider) throw new NotFoundException('Rider not found');
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
