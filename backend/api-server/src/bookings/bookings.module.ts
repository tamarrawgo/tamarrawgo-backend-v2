import { Module, forwardRef } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { FareModule } from '../fare/fare.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [FareModule, NotificationsModule, forwardRef(() => SocketModule)],
  providers: [BookingsService],
  controllers: [BookingsController],
  exports: [BookingsService],
})
export class BookingsModule {}
