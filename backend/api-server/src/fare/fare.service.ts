import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateFare, isPeakHour, isNightDifferential } from '@tamarrawgo/shared-utils';
import { FareEstimate } from '@tamarrawgo/shared-types';

@Injectable()
export class FareService {
  constructor(private prisma: PrismaService) {}

  async getActiveFareConfig() {
    const config = await this.prisma.fareConfiguration.findFirst({ where: { isActive: true } });
    if (!config) throw new NotFoundException('No active fare configuration');
    return config;
  }

  async estimateFare(distanceKm: number, durationMinutes: number, promoDiscount = 0): Promise<FareEstimate> {
    const config = await this.getActiveFareConfig();
    let surge = 1.0;
    if (isPeakHour()) surge = Number(config.peakSurge) || 1.5;
    else if (isNightDifferential()) surge = Number(config.nightSurge) || 1.2;

    return calculateFare(
      distanceKm,
      durationMinutes,
      {
        baseFare: Number(config.baseFare),
        ratePerKm: Number(config.ratePerKm),
        ratePerMinute: Number(config.ratePerMinute),
        minimumFare: Number(config.minimumFare),
        surgeMultiplier: surge,
      },
      promoDiscount,
    );
  }

  async updateFareConfig(data: {
    baseFare?: number;
    ratePerKm?: number;
    ratePerMinute?: number;
    minimumFare?: number;
    peakSurge?: number;
    nightSurge?: number;
  }) {
    const config = await this.getActiveFareConfig();
    return this.prisma.fareConfiguration.update({ where: { id: config.id }, data });
  }
}
