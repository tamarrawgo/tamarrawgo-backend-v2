import { Module } from '@nestjs/common';
import { FareService } from './fare.service';

@Module({
  providers: [FareService],
  exports: [FareService],
})
export class FareModule {}
