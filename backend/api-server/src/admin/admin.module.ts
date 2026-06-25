import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { FareModule } from '../fare/fare.module';
import { SupportModule } from '../support/support.module';

@Module({
  imports: [FareModule, SupportModule],
  providers: [AdminService],
  controllers: [AdminController],
})
export class AdminModule {}
