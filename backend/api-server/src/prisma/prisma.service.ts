import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  // Ping DB every 6 hours to prevent Supabase free tier from pausing
  @Cron(CronExpression.EVERY_6_HOURS)
  async keepAlive() {
    try {
      await this.$queryRaw`SELECT 1`;
      this.logger.log('DB keepalive ping OK');
    } catch (err) {
      this.logger.error('DB keepalive ping failed', err);
    }
  }
}
