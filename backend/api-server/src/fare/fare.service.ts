import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateFare, isPeakHour, isNightDifferential } from '@tamarrawgo/shared-utils';

@Injectable()
export class FareService {
  constructor(private prisma: PrismaService) {}

  async getActiveFareConfig() {
    const config = await this.prisma.fareConfiguration.findFirst({ where: { isActive: true } });
    if (!config) throw new NotFoundException('No active fare configuration');
    return config;
  }

  async estimateFare(distanceKm: number, durationMinutes: number, promoDiscount = 0) {
    const config = await this.getActiveFareConfig();
    let surge = 1.0;
    let surgeType: string | null = null;
    if (isPeakHour()) {
      surge = Number(config.peakSurge) || 1.5;
      surgeType = 'PEAK';
    } else if (isNightDifferential()) {
      surge = Number(config.nightSurge) || 1.2;
      surgeType = 'NIGHT';
    }

    const estimate = calculateFare(
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
    return { ...estimate, surgeType };
  }

  async estimateDeliveryFare(distanceKm: number) {
    const config = await this.getActiveFareConfig();
    const base = Number((config as any).deliveryBaseFare ?? 80);
    const perKm = Number((config as any).deliveryRatePerKm ?? 12);
    const totalFare = Math.max(base, base + distanceKm * perKm);
    return {
      distanceKm,
      baseFare: base,
      distanceFare: distanceKm * perKm,
      totalFare: Math.round(totalFare * 100) / 100,
      surgeType: null,
    };
  }

  async estimatePabiliFare(distanceKm: number) {
    const config = await this.getActiveFareConfig();
    const base = Number((config as any).pabiliBaseFare ?? 60);
    const perKm = Number((config as any).pabiliRatePerKm ?? 10);
    const serviceFee = Number((config as any).pabiliServiceFee ?? 20);
    const deliveryFee = base + distanceKm * perKm;
    const totalFare = deliveryFee + serviceFee;
    return {
      distanceKm,
      baseFare: base,
      distanceFare: distanceKm * perKm,
      serviceFee,
      totalFare: Math.round(totalFare * 100) / 100,
      surgeType: null,
    };
  }

  async updateFareConfig(data: {
    baseFare?: number;
    ratePerKm?: number;
    ratePerMinute?: number;
    minimumFare?: number;
    peakSurge?: number;
    nightSurge?: number;
    deliveryBaseFare?: number;
    deliveryRatePerKm?: number;
    pabiliBaseFare?: number;
    pabiliRatePerKm?: number;
    pabiliServiceFee?: number;
  }) {
    const config = await this.getActiveFareConfig();
    return this.prisma.fareConfiguration.update({ where: { id: config.id }, data });
  }
}
