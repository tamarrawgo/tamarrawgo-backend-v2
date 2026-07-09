import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SocketGateway } from '../socket/socket.gateway';
import { NotificationType } from '@tamarrawgo/shared-types';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
    private notifications: NotificationsService,
    private socket: SocketGateway,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyCleanup() {
    try {
      const [bookings, notifications, auditLogs, otps] = await Promise.all([
        this.cleanupOldTrips(),
        this.cleanupOldNotifications(),
        this.cleanupOldAuditLogs(),
        this.cleanupExpiredOtps(),
      ]);
      this.logger.log(`Daily cleanup — bookings: ${bookings}, notifications: ${notifications}, auditLogs: ${auditLogs}, expiredOtps: ${otps}`);
    } catch (err) {
      this.logger.error('Daily cleanup failed', err);
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
      this.prisma.riderProfile.count({ where: { status: 'PENDING', user: { status: 'ACTIVE' } } }),
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

  async getRevenueStats() {
    const [currentStats, snapshotsSetting, lastResetSetting] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true, commission: true },
      }),
      this.prisma.adminSetting.findUnique({ where: { key: 'previousPeriodSnapshots' } }),
      this.prisma.adminSetting.findUnique({ where: { key: 'revenueResetAt' } }),
    ]);

    const previousPeriods = snapshotsSetting ? JSON.parse(snapshotsSetting.value) : [];

    return {
      current: {
        revenue: Number(currentStats._sum.amount ?? 0),
        commission: Number(currentStats._sum.commission ?? 0),
      },
      previousPeriods,
      lastResetAt: lastResetSetting ? new Date(lastResetSetting.value) : null,
    };
  }

  async resetRevenue() {
    const now = new Date();

    const [currentStats, existingSnapshots] = await Promise.all([
      this.prisma.payment.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true, commission: true },
      }),
      this.prisma.adminSetting.findUnique({ where: { key: 'previousPeriodSnapshots' } }),
    ]);

    const newSnapshot = {
      revenue: Number(currentStats._sum.amount ?? 0),
      commission: Number(currentStats._sum.commission ?? 0),
      resetAt: now.toISOString(),
    };

    const snapshots = existingSnapshots ? JSON.parse(existingSnapshots.value) : [];
    const updated = [newSnapshot, ...snapshots].slice(0, 6);

    await this.prisma.$transaction([
      this.prisma.adminSetting.upsert({
        where: { key: 'previousPeriodSnapshots' },
        update: { value: JSON.stringify(updated) },
        create: { key: 'previousPeriodSnapshots', value: JSON.stringify(updated) },
      }),
      this.prisma.adminSetting.upsert({
        where: { key: 'revenueResetAt' },
        update: { value: now.toISOString() },
        create: { key: 'revenueResetAt', value: now.toISOString() },
      }),
    ]);

    await this.prisma.payment.deleteMany({ where: { status: 'COMPLETED' } });

    return { resetAt: now };
  }

  async getUsers(page = 1, limit = 20, search?: string, city?: string) {
    const skip = (page - 1) * limit;
    const conditions: any[] = [
      { role: 'PASSENGER' },
      { role: 'ADMIN' },
      { role: 'RIDER' },
    ];
    const where: any = { OR: conditions, status: { not: 'PENDING_VERIFICATION' } };
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
    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, phone: true, email: true, firstName: true, lastName: true,
          role: true, status: true, createdAt: true, profilePhoto: true, city: true, barangay: true,
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

  private async logAction(adminId: string | undefined, action: string, entity: string, entityId?: string, details?: any) {
    try {
      await this.prisma.auditLog.create({
        data: { userId: adminId ?? null, action, entity, entityId: entityId ?? null, newValues: details ?? null },
      });
    } catch {}
  }

  async getAuditLogs(page = 1, limit = 20, action?: string) {
    const skip = (page - 1) * limit;
    const where = action ? { action } : {};
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, role: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    return { data: logs, total, page, limit };
  }

  async resetUserPassword(userId: string, newPassword: string, adminId?: string) {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash(newPassword, 10);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, phone: true } });
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    await this.logAction(adminId, 'RESET_PASSWORD', 'user', userId, { name: `${user?.firstName} ${user?.lastName}`, phone: user?.phone });
    return { message: 'Password reset successfully' };
  }

  async suspendUser(userId: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, phone: true, role: true } });
    await this.logAction(adminId, 'SUSPEND_USER', 'user', userId, { name: `${user?.firstName} ${user?.lastName}`, phone: user?.phone, role: user?.role });
    return this.prisma.user.update({ where: { id: userId }, data: { status: 'SUSPENDED' } });
  }

  async activateUser(userId: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, phone: true, role: true } });
    await this.logAction(adminId, 'ACTIVATE_USER', 'user', userId, { name: `${user?.firstName} ${user?.lastName}`, phone: user?.phone, role: user?.role });
    return this.prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } });
  }

  async deleteUser(userId: string, adminId?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { firstName: true, lastName: true, phone: true, role: true } });
    await this.logAction(adminId, 'DELETE_USER', 'user', userId, { name: `${user?.firstName} ${user?.lastName}`, phone: user?.phone, role: user?.role });
    this.socket.sendToUser(userId, 'force:logout', {});

    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });

    // Delete uploaded files from Supabase Storage (rider docs under userId/, profile photo under profile-photos/, receipts under topup-receipts/)
    try {
      const supabaseUrl = this.config.get('SUPABASE_URL');
      const serviceKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY');
      if (supabaseUrl && serviceKey) {
        const prefixesToCheck = [`${userId}/`, 'profile-photos/', 'topup-receipts/'];
        const filePaths: string[] = [];
        for (const prefix of prefixesToCheck) {
          const { data } = await axios.post(`${supabaseUrl}/storage/v1/object/list/rider-documents`, { prefix }, {
            headers: { Authorization: `Bearer ${serviceKey}` },
          });
          if (Array.isArray(data)) {
            for (const f of data) {
              if ((prefix === 'profile-photos/' || prefix === 'topup-receipts/') && !f.name.startsWith(userId)) continue;
              filePaths.push(`${prefix}${f.name}`);
            }
          }
        }
        if (filePaths.length > 0) {
          await axios.delete(`${supabaseUrl}/storage/v1/object/rider-documents`, {
            headers: { Authorization: `Bearer ${serviceKey}` },
            data: { prefixes: filePaths },
          });
        }
      }
    } catch (e) { this.logger.warn('Failed to delete storage files', e); }

    // Delete rider-related records
    if (rider) {
      await this.prisma.walletTransaction.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.topupRequest.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.riderDocument.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.earning.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.rating.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.booking.updateMany({ where: { riderId: rider.id }, data: { riderId: null } });
      await this.prisma.vehicle.deleteMany({ where: { riderId: rider.id } });
      await this.prisma.riderProfile.delete({ where: { userId } });
    }

    // Delete bookings and their related records
    const bookings = await this.prisma.booking.findMany({ where: { passengerId: userId }, select: { id: true } });
    const bookingIds = bookings.map((b) => b.id);
    if (bookingIds.length > 0) {
      await this.prisma.tripLocation.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await this.prisma.rating.deleteMany({ where: { bookingId: { in: bookingIds } } });
      await this.prisma.chatMessage.deleteMany({ where: { bookingId: { in: bookingIds } } });
    }
    await this.prisma.booking.deleteMany({ where: { passengerId: userId } });

    // Delete user-related records
    await this.prisma.complaint.deleteMany({ where: { OR: [{ userId }, { reportedUserId: userId }] } });
    await this.prisma.pointTransaction.deleteMany({ where: { userId } });
    await this.prisma.notification.deleteMany({ where: { userId } });
    await this.prisma.chatMessage.deleteMany({ where: { senderId: userId } });
    const tickets = await this.prisma.supportTicket.findMany({ where: { userId }, select: { id: true } });
    if (tickets.length > 0) {
      await this.prisma.supportReply.deleteMany({ where: { ticketId: { in: tickets.map(t => t.id) } } });
    }
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
          user: { select: { firstName: true, lastName: true, phone: true, email: true, city: true, barangay: true } },
          vehicle: true,
          documents: true,
        },
      }),
      this.prisma.riderProfile.count({ where }),
    ]);
    return { data: riders, total, page, limit };
  }

  async getAllRiders(page = 1, limit = 20, search?: string, city?: string, barangay?: string) {
    const skip = (page - 1) * limit;
    const userWhere: any = { role: 'RIDER' };
    if (search) {
      userWhere.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (city) userWhere.city = { contains: city, mode: 'insensitive' };
    if (barangay) userWhere.barangay = { contains: barangay, mode: 'insensitive' };

    const where = { user: userWhere };
    const [riders, total] = await Promise.all([
      this.prisma.riderProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true, firstName: true, lastName: true, phone: true,
              email: true, status: true, city: true, barangay: true,
              loyaltyPoints: true, createdAt: true,
            },
          },
          vehicle: true,
          documents: { select: { id: true, type: true, fileUrl: true, verified: true } },
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

  private async deleteReceiptFile(receiptUrl: string) {
    try {
      const supabaseUrl = this.config.get('SUPABASE_URL');
      const serviceKey = this.config.get('SUPABASE_SERVICE_ROLE_KEY');
      if (!supabaseUrl || !serviceKey) return;
      const path = receiptUrl.split('/rider-documents/')[1];
      if (!path) return;
      await axios.delete(`${supabaseUrl}/storage/v1/object/rider-documents`, {
        headers: { Authorization: `Bearer ${serviceKey}` },
        data: { prefixes: [path] },
      });
    } catch (e) {
      this.logger.warn('Failed to delete topup receipt file', e);
    }
  }

  async getTopupRequests(status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const where = status ? { status: status as any } : {};
    const [data, total] = await Promise.all([
      this.prisma.topupRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { rider: { include: { user: { select: { firstName: true, lastName: true, phone: true, fcmToken: true } } } } },
      }),
      this.prisma.topupRequest.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async approveTopupRequest(id: string, adminId?: string) {
    const request = await this.prisma.topupRequest.findUnique({
      where: { id },
      include: { rider: { include: { user: true } } },
    });
    if (!request) throw new NotFoundException('Topup request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request already reviewed');

    await this.prisma.$transaction([
      this.prisma.riderProfile.update({
        where: { id: request.riderId },
        data: { walletBalance: { increment: request.amount } },
      }),
      this.prisma.topupRequest.update({
        where: { id },
        data: { status: 'APPROVED', reviewedAt: new Date() },
      }),
      this.prisma.walletTransaction.create({
        data: {
          riderId: request.riderId,
          amount: request.amount,
          type: 'CREDIT',
          description: 'Topup approved by admin',
          referenceId: request.id,
        },
      }),
    ]);

    const msg = `Your topup of ₱${Number(request.amount).toFixed(2)} has been approved and added to your wallet.`;
    await this.notifications.createNotification(request.rider.userId, NotificationType.PAYMENT_RECEIVED, 'Topup Approved', msg);
    if (request.rider.user.fcmToken) {
      await this.notifications.sendPush(request.rider.user.fcmToken, { title: 'Topup Approved', body: msg }).catch(() => {});
    }

    await this.deleteReceiptFile(request.receiptUrl);
    await this.logAction(adminId, 'APPROVE_TOPUP', 'topup_request', id, { rider: `${request.rider.user.firstName} ${request.rider.user.lastName}`, amount: Number(request.amount) });

    return { message: 'Topup approved and wallet credited' };
  }

  async rejectTopupRequest(id: string, reason: string, adminId?: string) {
    const request = await this.prisma.topupRequest.findUnique({
      where: { id },
      include: { rider: { include: { user: true } } },
    });
    if (!request) throw new NotFoundException('Topup request not found');
    if (request.status !== 'PENDING') throw new BadRequestException('Request already reviewed');

    await this.prisma.topupRequest.update({
      where: { id },
      data: { status: 'REJECTED', rejectionReason: reason, reviewedAt: new Date() },
    });

    const msg = reason
      ? `Your topup request of ₱${Number(request.amount).toFixed(2)} was rejected: ${reason}`
      : `Your topup request of ₱${Number(request.amount).toFixed(2)} was rejected. Please contact support.`;
    await this.notifications.createNotification(request.rider.userId, NotificationType.SYSTEM, 'Topup Rejected', msg);
    if (request.rider.user.fcmToken) {
      await this.notifications.sendPush(request.rider.user.fcmToken, { title: 'Topup Rejected', body: msg }).catch(() => {});
    }

    await this.deleteReceiptFile(request.receiptUrl);
    await this.logAction(adminId, 'REJECT_TOPUP', 'topup_request', id, { rider: `${request.rider.user.firstName} ${request.rider.user.lastName}`, amount: Number(request.amount), reason });

    return { message: 'Topup request rejected' };
  }

  async approveRider(riderId: string, adminId?: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { id: riderId }, include: { user: { select: { firstName: true, lastName: true, phone: true } } } });
    if (!rider) throw new NotFoundException('Rider not found');
    await this.prisma.user.update({ where: { id: rider.userId }, data: { status: 'ACTIVE' } });
    await this.prisma.riderDocument.updateMany({ where: { riderId }, data: { verified: true, verifiedAt: new Date() } });
    await this.logAction(adminId, 'APPROVE_RIDER', 'rider', riderId, { name: `${rider.user.firstName} ${rider.user.lastName}`, phone: rider.user.phone });
    return this.prisma.riderProfile.update({ where: { id: riderId }, data: { status: 'APPROVED' } });
  }

  async rejectRider(riderId: string, reason: string, adminId?: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { id: riderId }, include: { user: { select: { firstName: true, lastName: true, phone: true } } } });
    if (!rider) throw new NotFoundException('Rider not found');
    await this.logAction(adminId, 'REJECT_RIDER', 'rider', riderId, { name: `${rider.user.firstName} ${rider.user.lastName}`, phone: rider.user.phone, reason });
    await this.deleteUser(rider.userId);
    return { message: 'Rider rejected and account deleted' };
  }

  async getTripMonitoring(page = 1, limit = 20, status?: string) {
    const maxRecords = 300;
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

  async cleanupOldTrips(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Terminal bookings older than 30 days
    const oldTerminal = await this.prisma.booking.findMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        status: { in: ['COMPLETED', 'CANCELLED', 'EXPIRED'] },
      },
      select: { id: true },
    });

    // Stuck bookings (non-terminal) older than 24 hours — ghost trips that never ended
    const stuckBookings = await this.prisma.booking.findMany({
      where: {
        createdAt: { lt: twentyFourHoursAgo },
        status: { in: ['SEARCHING', 'ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] },
      },
      select: { id: true },
    });

    const deleteIds = [...oldTerminal, ...stuckBookings].map((b) => b.id);
    if (deleteIds.length === 0) return 0;

    await this.prisma.tripLocation.deleteMany({ where: { bookingId: { in: deleteIds } } });
    await this.prisma.chatMessage.deleteMany({ where: { bookingId: { in: deleteIds } } });
    await this.prisma.payment.deleteMany({ where: { bookingId: { in: deleteIds } } });
    await this.prisma.rating.deleteMany({ where: { bookingId: { in: deleteIds } } });
    await this.prisma.booking.deleteMany({ where: { id: { in: deleteIds } } });

    return deleteIds.length;
  }

  async cleanupOldNotifications(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.notification.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    });
    return count;
  }

  async cleanupOldAuditLogs(): Promise<number> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const { count } = await this.prisma.auditLog.deleteMany({
      where: { createdAt: { lt: thirtyDaysAgo } },
    });
    return count;
  }

  async cleanupExpiredOtps(): Promise<number> {
    const { count } = await this.prisma.user.updateMany({
      where: { otpExpiresAt: { lt: new Date() }, otpCode: { not: null } },
      data: { otpCode: null, otpExpiresAt: null },
    });
    return count;
  }

  async cancelTrip(bookingId: string, adminId?: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    const terminal = ['COMPLETED', 'CANCELLED', 'EXPIRED'];
    if (terminal.includes(booking.status)) throw new Error(`Booking is already ${booking.status.toLowerCase()}`);
    await this.logAction(adminId, 'CANCEL_TRIP', 'booking', bookingId, { previousStatus: booking.status });
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
