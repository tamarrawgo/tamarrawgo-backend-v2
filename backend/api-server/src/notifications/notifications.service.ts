import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@tamarrawgo/shared-types';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async sendPush(fcmToken: string, payload: PushPayload): Promise<void> {
    // In production: use firebase-admin to send actual push
    // const message = { token: fcmToken, notification: { title, body }, data };
    // await getMessaging().send(message);
    this.logger.debug(`[FCM] → ${fcmToken.slice(-6)}: ${payload.title}`);
  }

  async createNotification(userId: string, type: NotificationType, title: string, body: string, data?: any) {
    return this.prisma.notification.create({
      data: { userId, type, title, body, data },
    });
  }

  async getNotifications(userId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, read: false } }),
    ]);

    return { data: notifications, total, unread, page, limit };
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true, readAt: new Date() },
    });
    return { message: 'All notifications marked as read' };
  }
}
