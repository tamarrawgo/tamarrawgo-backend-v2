import { FareEstimate } from '@tamarrawgo/shared-types';

export interface FareConfig {
  baseFare: number;
  ratePerKm: number;
  ratePerMinute: number;
  minimumFare: number;
  surgeMultiplier?: number;
}

export function calculateFare(
  distanceKm: number,
  durationMinutes: number,
  config: FareConfig,
  discountAmount = 0,
): FareEstimate {
  const surge = config.surgeMultiplier ?? 1;
  const baseFare = config.baseFare;
  const distanceFare = distanceKm * config.ratePerKm;
  const timeFare = durationMinutes * config.ratePerMinute;
  const subtotal = (baseFare + distanceFare + timeFare) * surge;
  const total = Math.max(config.minimumFare, subtotal - discountAmount);

  return {
    baseFare,
    distanceFare: parseFloat(distanceFare.toFixed(2)),
    timeFare: parseFloat(timeFare.toFixed(2)),
    surgeMultiplier: surge,
    discount: discountAmount,
    totalFare: parseFloat(total.toFixed(2)),
    distanceKm: parseFloat(distanceKm.toFixed(2)),
    estimatedDurationMinutes: Math.ceil(durationMinutes),
  };
}

export function isPeakHour(date = new Date()): boolean {
  const hour = date.getHours();
  return (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
}

export function isNightDifferential(date = new Date()): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 5;
}

export function getSurgeMultiplier(date = new Date()): number {
  if (isPeakHour(date)) return 1.5;
  if (isNightDifferential(date)) return 1.2;
  return 1.0;
}
