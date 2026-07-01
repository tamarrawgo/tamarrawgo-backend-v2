import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private initialized = false;

  constructor(private config: ConfigService) {}

  onModuleInit() {
    if (admin.apps.length) {
      // Already initialized by NotificationsService
      this.initialized = true;
      return;
    }
    const projectId = this.config.get('FIREBASE_PROJECT_ID');
    const clientEmail = this.config.get('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.config.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');
    if (projectId && clientEmail && privateKey) {
      try {
        admin.initializeApp({ credential: admin.credential.cert({ projectId, clientEmail, privateKey }) });
        this.initialized = true;
        this.logger.log('Firebase Admin initialized (auth module)');
      } catch (err) {
        this.logger.error('Firebase Admin init failed', err);
      }
    } else {
      this.logger.warn('Firebase credentials missing — phone OTP verification disabled');
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.initialized) {
      throw new Error('Firebase Admin not initialized. Check FIREBASE_* env vars.');
    }
    return admin.auth().verifyIdToken(idToken);
  }
}
