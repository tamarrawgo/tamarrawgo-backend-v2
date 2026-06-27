import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RidersModule } from './riders/riders.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ChatModule } from './chat/chat.module';
import { FareModule } from './fare/fare.module';
import { PromotionsModule } from './promotions/promotions.module';
import { SupportModule } from './support/support.module';
import { AdminModule } from './admin/admin.module';
import { MapsModule } from './maps/maps.module';
import { SocketModule } from './socket/socket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),

    ScheduleModule.forRoot(),

    CacheModule.registerAsync({
      isGlobal: true,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const redisUrl = config.get('REDIS_URL');
        if (redisUrl) {
          const { redisStore } = await import('cache-manager-ioredis-yet');
          return { store: await redisStore({ url: redisUrl, ttl: 60 }) as any };
        }
        return { ttl: 60, store: 'memory' };
      },
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    RidersModule,
    BookingsModule,
    PaymentsModule,
    NotificationsModule,
    ChatModule,
    FareModule,
    PromotionsModule,
    SupportModule,
    AdminModule,
    MapsModule,
    SocketModule,
  ],
})
export class AppModule {}
