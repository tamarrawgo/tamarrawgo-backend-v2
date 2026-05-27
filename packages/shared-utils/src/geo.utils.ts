import { Coordinates } from '@tamarrawgo/shared-types';

const EARTH_RADIUS_KM = 6371;

export function haversineDistance(from: Coordinates, to: Coordinates): number {
  const dLat = toRad(to.latitude - from.latitude);
  const dLon = toRad(to.longitude - from.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.latitude)) * Math.cos(toRad(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function estimateEtaMinutes(distanceKm: number, averageSpeedKmh = 30): number {
  return Math.ceil((distanceKm / averageSpeedKmh) * 60);
}

export function isWithinRadius(center: Coordinates, point: Coordinates, radiusKm: number): boolean {
  return haversineDistance(center, point) <= radiusKm;
}
