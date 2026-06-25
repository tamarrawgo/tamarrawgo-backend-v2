import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { FareModule } from '../fare/fare.module';

@Module({
  imports: [FareModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
