import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { FareModule } from '../fare/fare.module';
import { SupportModule } from '../support/support.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [FareModule, SupportModule, NotificationsModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
