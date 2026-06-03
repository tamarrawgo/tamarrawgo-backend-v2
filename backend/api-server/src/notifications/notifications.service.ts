import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@tamarrawgo/shared-types';
import * as admin from 'firebase-admin';

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private firebaseInitialized = false;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  onModuleInit() {
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey && !admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
        });
        this.firebaseInitialized = true;
        this.logger.log('Firebase Admin SDK initialized');
      } catch (err) {
        this.logger.error('Firebase init failed', err);
      }
    } else {
      this.logger.warn('Firebase credentials missing — push notifications disabled');
    }
  }

  async sendPush(fcmToken: string, payload: PushPayload): Promise<void> {
    if (!this.firebaseInitialized || !fcmToken) return;
    try {
      const stringData: Record<string, string> = {};
      if (payload.data) {
        for (const [k, v] of Object.entries(payload.data)) {
          stringData[k] = String(v);
        }
      }
      await admin.messaging().send({
        token: fcmToken,
        notification: { title: payload.title, body: payload.body },
        data: stringData,
        android: { priority: 'high' },
      });
      this.logger.debug(`[FCM] ✓ → ${fcmToken.slice(-6)}: ${payload.title}`);
    } catch (err: any) {
      this.logger.error(`[FCM] ✗ → ${fcmToken.slice(-6)}: ${err.message}`);
    }
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
