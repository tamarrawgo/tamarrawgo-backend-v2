import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FareService } from '../fare/fare.service';
import { MapsService } from '../maps/maps.service';
import { SocketGateway } from '../socket/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto, CancelBookingDto, RateRiderDto } from './dto/booking.dto';
import { haversineDistance, estimateEtaMinutes } from '@tamarrawgo/shared-utils';
import { BookingStatus, NotificationType, SocketEvent } from '@tamarrawgo/shared-types';

const SEARCH_RADIUS_KM = 10;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    private prisma: PrismaService,
    private fare: FareService,
    private maps: MapsService,
    private socket: SocketGateway,
    private notifications: NotificationsService,
  ) {}

  async estimateFare(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number, promoCode?: string, passengerCount = 1, bookingType = 'RIDE') {
    let distanceKm: number;
    let durationMinutes: number;
    let polyline: string | null = null;

    try {
      const directions = await this.maps.getDirections(pickupLat, pickupLng, dropoffLat, dropoffLng);
      distanceKm = directions.distanceKm;
      durationMinutes = directions.durationMinutes;
      polyline = directions.polyline;
    } catch {
      distanceKm = haversineDistance(
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: dropoffLat, longitude: dropoffLng },
      );
      durationMinutes = estimateEtaMinutes(distanceKm);
    }

    if (bookingType === 'DELIVERY') {
      const estimate = await this.fare.estimateDeliveryFare(distanceKm);
      return { ...estimate, passengerCount: 1, passengerMultiplier: 1, polyline, promoRejected: false };
    }

    if (bookingType === 'PABILI') {
      const estimate = await this.fare.estimatePabiliFare(distanceKm);
      return { ...estimate, passengerCount: 1, passengerMultiplier: 1, polyline, promoRejected: false };
    }

    if (bookingType === 'REGULAR') {
      const pCount = Math.min(Math.max(passengerCount ?? 1, 1), 2);
      const estimate = await this.fare.estimateRegularFare(distanceKm, durationMinutes, pCount);
      return { ...estimate, passengerCount: pCount, passengerMultiplier: pCount, polyline, promoRejected: false };
    }

    // RIDE — existing logic
    const estimateNoPromo = await this.fare.estimateFare(distanceKm, durationMinutes, 0);
    const count = Math.min(Math.max(passengerCount, 1), 4);
    const multiplier = 1 + (count - 1) * 0.20;
    let baseTotalFare = estimateNoPromo.totalFare;
    if (count > 1) baseTotalFare = Math.round(baseTotalFare * multiplier * 100) / 100;

    let promoDiscount = 0;
    let promoRejected = false;
    if (promoCode) {
      if (baseTotalFare >= 100) {
        promoDiscount = await this.getPromoDiscount(promoCode, 0);
      } else {
        promoRejected = true;
      }
    }

    const estimate = await this.fare.estimateFare(distanceKm, durationMinutes, promoDiscount);
    if (count > 1) {
      estimate.totalFare = Math.round(estimate.totalFare * multiplier * 100) / 100;
    }

    return { ...estimate, passengerCount: count, passengerMultiplier: multiplier, polyline, promoRejected };
  }

  async createBooking(passengerId: string, dto: CreateBookingDto) {
    const passenger = await this.prisma.user.findUnique({ where: { id: passengerId }, select: { profilePhoto: true, validIdUrl: true, verificationStatus: true } });
    if (!passenger?.profilePhoto) throw new ForbiddenException('Please upload a selfie in your profile before booking.');
    if (!passenger?.validIdUrl) throw new ForbiddenException('Please upload a valid ID in your profile before booking.');
    if (passenger.verificationStatus !== 'VERIFIED') throw new ForbiddenException('Your account is pending admin verification. You will be notified once approved.');

    const activeBooking = await this.prisma.booking.findFirst({
      where: { passengerId, status: { in: ['POOLING', 'SEARCHING', 'ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] as any } },
    });
    if (activeBooking) throw new BadRequestException('You already have an active booking');

    let distanceKm: number;
    let durationMinutes: number;
    try {
      const directions = await this.maps.getDirections(dto.pickup.latitude, dto.pickup.longitude, dto.dropoff.latitude, dto.dropoff.longitude);
      distanceKm = directions.distanceKm;
      durationMinutes = directions.durationMinutes;
    } catch {
      distanceKm = haversineDistance(
        { latitude: dto.pickup.latitude, longitude: dto.pickup.longitude },
        { latitude: dto.dropoff.latitude, longitude: dto.dropoff.longitude },
      );
      durationMinutes = estimateEtaMinutes(distanceKm);
    }

    let promoDiscount = 0;
    if (dto.promoCode) {
      const promo = await this.prisma.promotion.findUnique({ where: { code: dto.promoCode } });
      if (!promo) throw new BadRequestException('Invalid promo code');
      if (!promo.isActive) throw new BadRequestException('This promo code is no longer active');
      if (new Date() > promo.expiresAt) throw new BadRequestException('This promo code has expired');
      if (promo.usageLimit && promo.usageCount >= promo.usageLimit) throw new BadRequestException('This promo code has already been used');
      promoDiscount = Number(promo.value);
    }

    const bookingType = dto.bookingType ?? 'RIDE';

    // Use type-specific fare calculation
    let fareEstimate: any;
    if (bookingType === 'DELIVERY') {
      fareEstimate = await this.fare.estimateDeliveryFare(distanceKm);
      fareEstimate.timeFare = 0;
      fareEstimate.estimatedDurationMinutes = durationMinutes;
      fareEstimate.surgeMultiplier = 1;
      fareEstimate.discount = 0;
    } else if (bookingType === 'PABILI') {
      fareEstimate = await this.fare.estimatePabiliFare(distanceKm);
      fareEstimate.timeFare = 0;
      fareEstimate.estimatedDurationMinutes = durationMinutes;
      fareEstimate.surgeMultiplier = 1;
      fareEstimate.discount = 0;
    } else if (bookingType === 'REGULAR') {
      const pCount = Math.min(Math.max(dto.passengerCount ?? 1, 1), 3);
      fareEstimate = await this.fare.estimateRegularFare(distanceKm, durationMinutes, pCount);
      fareEstimate.discount = 0;

      const { poolGroupId, shouldDispatch } = await this.findOrJoinPoolGroup(
        passengerId, dto.pickup.latitude, dto.pickup.longitude, pCount,
      );

      const booking = await this.prisma.booking.create({
        data: {
          passengerId,
          status: 'POOLING' as any,
          bookingType: 'REGULAR' as any,
          poolGroupId,
          poolExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
          pickupAddress: dto.pickup.address,
          pickupLatitude: dto.pickup.latitude,
          pickupLongitude: dto.pickup.longitude,
          pickupPlaceId: dto.pickup.placeId,
          dropoffAddress: dto.dropoff.address,
          dropoffLatitude: dto.dropoff.latitude,
          dropoffLongitude: dto.dropoff.longitude,
          dropoffPlaceId: dto.dropoff.placeId,
          distanceKm: fareEstimate.distanceKm ?? distanceKm,
          estimatedMinutes: fareEstimate.estimatedDurationMinutes ?? durationMinutes,
          baseFare: fareEstimate.baseFare,
          distanceFare: fareEstimate.distanceFare,
          timeFare: fareEstimate.timeFare ?? 0,
          surgeMultiplier: 1,
          discount: 0,
          estimatedFare: fareEstimate.totalFare,
          passengerCount: pCount,
          paymentMethod: dto.paymentMethod,
          notes: dto.notes,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
        include: { passenger: { select: { firstName: true, lastName: true, phone: true } } },
      });

      if (shouldDispatch) {
        await this.dispatchPoolGroup(poolGroupId);
      }

      return booking;
    } else {
      fareEstimate = await this.fare.estimateFare(distanceKm, durationMinutes, promoDiscount);
    }

    // +20% fare per additional passenger (RIDE only)
    const pCount = bookingType === 'RIDE' ? Math.min(Math.max(dto.passengerCount ?? 1, 1), 4) : 1;
    const pMultiplier = 1 + (pCount - 1) * 0.20;
    const adjustedFare = pCount > 1
      ? Math.round(fareEstimate.totalFare * pMultiplier * 100) / 100
      : fareEstimate.totalFare;

    const booking = await this.prisma.booking.create({
      data: {
        passengerId,
        status: 'SEARCHING',
        bookingType: bookingType as any,
        pickupAddress: dto.pickup.address,
        pickupLatitude: dto.pickup.latitude,
        pickupLongitude: dto.pickup.longitude,
        pickupPlaceId: dto.pickup.placeId,
        dropoffAddress: dto.dropoff.address,
        dropoffLatitude: dto.dropoff.latitude,
        dropoffLongitude: dto.dropoff.longitude,
        dropoffPlaceId: dto.dropoff.placeId,
        distanceKm: fareEstimate.distanceKm ?? distanceKm,
        estimatedMinutes: fareEstimate.estimatedDurationMinutes ?? durationMinutes,
        baseFare: fareEstimate.baseFare,
        distanceFare: fareEstimate.distanceFare,
        timeFare: fareEstimate.timeFare ?? 0,
        surgeMultiplier: fareEstimate.surgeMultiplier ?? 1,
        discount: fareEstimate.discount ?? 0,
        estimatedFare: adjustedFare,
        passengerCount: pCount,
        paymentMethod: dto.paymentMethod,
        promoCode: dto.promoCode,
        notes: dto.notes,
        packageDescription: dto.packageDescription,
        pickupContactName: dto.pickupContactName,
        pickupContactPhone: dto.pickupContactPhone,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        storeAddress: dto.storeAddress,
        shoppingList: dto.shoppingList,
        itemBudget: dto.itemBudget,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      include: { passenger: { select: { firstName: true, lastName: true, phone: true } } },
    });

    // Promo is consumed only when a rider accepts (not on booking creation)

    // Find and notify nearby riders
    await this.dispatchToNearbyRiders(booking);

    return booking;
  }

  async getAvailableBookings(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider || !rider.currentLatitude || !rider.currentLongitude) return [];
    if (Number(rider.walletBalance) < 0) return [];

    const activeBooking = await this.prisma.booking.findFirst({
      where: { riderId: rider.id, status: { in: ['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] } },
    });
    if (activeBooking) return [];

    // TRICYCLE riders see RIDE + REGULAR bookings; DELIVERY riders see DELIVERY + PABILI
    const isDeliveryRider = (rider as any).vehicleType === 'DELIVERY';
    const allowedTypes = isDeliveryRider ? ['DELIVERY', 'PABILI'] : ['RIDE'];

    const searching = await this.prisma.booking.findMany({
      where: { status: 'SEARCHING', bookingType: { in: allowedTypes as any } },
      include: { passenger: { select: { firstName: true, lastName: true, phone: true } } },
      orderBy: { createdAt: 'asc' },
    });

    const singleBookings = searching
      .filter((b) => {
        const dist = haversineDistance(
          { latitude: b.pickupLatitude, longitude: b.pickupLongitude },
          { latitude: rider.currentLatitude!, longitude: rider.currentLongitude! },
        );
        return dist <= SEARCH_RADIUS_KM;
      })
      .map((b) => ({
        bookingId: b.id,
        bookingType: (b as any).bookingType ?? 'RIDE',
        passenger: { id: b.passengerId, firstName: b.passenger.firstName, lastName: b.passenger.lastName, phone: b.passenger.phone, rating: 5.0 },
        pickup: { address: b.pickupAddress, latitude: b.pickupLatitude, longitude: b.pickupLongitude },
        dropoff: { address: b.dropoffAddress, latitude: b.dropoffLatitude, longitude: b.dropoffLongitude },
        estimatedFare: Number(b.estimatedFare),
        discount: Number(b.discount ?? 0),
        distanceKm: b.distanceKm,
        passengerCount: b.passengerCount,
        packageDescription: (b as any).packageDescription,
        pickupContactName: (b as any).pickupContactName,
        pickupContactPhone: (b as any).pickupContactPhone,
        recipientName: (b as any).recipientName,
        recipientPhone: (b as any).recipientPhone,
        storeAddress: (b as any).storeAddress,
        shoppingList: (b as any).shoppingList,
        itemBudget: (b as any).itemBudget ? Number((b as any).itemBudget) : undefined,
        expiresAt: b.expiresAt?.getTime() ?? Date.now() + 5 * 60 * 1000,
      }));

    if (isDeliveryRider) return singleBookings;

    // TRICYCLE riders also see ready REGULAR pool groups
    const poolGroups = await this.getReadyPoolGroups(rider);
    return [...singleBookings, ...poolGroups];
  }

  private async dispatchToNearbyRiders(booking: any) {
    // Only dispatch to riders whose vehicleType matches the booking type
    const bookingType = booking.bookingType ?? 'RIDE';
    const requiredVehicleType = bookingType === 'RIDE' ? 'TRICYCLE' : 'DELIVERY';

    const riders = await this.prisma.riderProfile.findMany({
      where: {
        onlineStatus: 'ONLINE',
        status: 'APPROVED',
        vehicleType: requiredVehicleType as any,
        currentLatitude: { not: null },
        currentLongitude: { not: null },
        walletBalance: { gte: 0 },
        bookingsAsRider: { none: { status: { in: ['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] } } },
      },
      include: { user: { select: { id: true, fcmToken: true } } },
    });

    const nearby = riders.filter((r) => {
      if (!r.currentLatitude || !r.currentLongitude) return false;
      const dist = haversineDistance(
        { latitude: booking.pickupLatitude, longitude: booking.pickupLongitude },
        { latitude: r.currentLatitude, longitude: r.currentLongitude },
      );
      return dist <= SEARCH_RADIUS_KM;
    });

    const payload = {
      bookingId: booking.id,
      bookingType,
      passenger: {
        id: booking.passengerId,
        firstName: booking.passenger.firstName,
        lastName: booking.passenger.lastName,
        phone: booking.passenger.phone,
        rating: 5.0,
      },
      pickup: { address: booking.pickupAddress, latitude: booking.pickupLatitude, longitude: booking.pickupLongitude },
      dropoff: { address: booking.dropoffAddress, latitude: booking.dropoffLatitude, longitude: booking.dropoffLongitude },
      estimatedFare: Number(booking.estimatedFare),
      discount: Number(booking.discount ?? 0),
      distanceKm: booking.distanceKm,
      passengerCount: booking.passengerCount ?? 1,
      packageDescription: booking.packageDescription,
      pickupContactName: booking.pickupContactName,
      pickupContactPhone: booking.pickupContactPhone,
      recipientName: booking.recipientName,
      recipientPhone: booking.recipientPhone,
      storeAddress: booking.storeAddress,
      shoppingList: booking.shoppingList,
      itemBudget: booking.itemBudget ? Number(booking.itemBudget) : undefined,
      expiresAt: booking.expiresAt?.getTime() ?? Date.now() + 5 * 60 * 1000,
    };

    for (const rider of nearby) {
      this.socket.sendBookingRequest(rider.user.id, payload);
      if (rider.user.fcmToken) {
        const pushTitle = bookingType === 'DELIVERY' ? '📦 Delivery Request!' : bookingType === 'PABILI' ? '🛒 Pabili Request!' : 'New Booking Request!';
        const pushBody = bookingType === 'DELIVERY'
          ? `Package: ${booking.packageDescription ?? 'Item'} → ₱${Number(booking.estimatedFare).toFixed(0)}`
          : bookingType === 'PABILI'
          ? `Pabili at: ${booking.storeAddress ?? booking.pickupAddress} → ₱${Number(booking.estimatedFare).toFixed(0)}`
          : `Pickup: ${booking.pickupAddress} → ₱${Number(booking.estimatedFare).toFixed(0)}`;
        await this.notifications.sendPush(rider.user.fcmToken, {
          title: pushTitle,
          body: pushBody,
          data: { type: NotificationType.BOOKING_REQUEST, bookingId: booking.id },
        });
      }
    }

    this.logger.log(`Booking ${booking.id} dispatched to ${nearby.length} riders`);
  }

  // ── Regular / Pooling helpers ──────────────────────────────────────────────

  private async findOrJoinPoolGroup(
    passengerId: string,
    pickupLat: number,
    pickupLng: number,
    newPaxCount: number,
  ): Promise<{ poolGroupId: string; shouldDispatch: boolean }> {
    const existingPools = await this.prisma.booking.findMany({
      where: {
        status: 'POOLING' as any,
        bookingType: 'REGULAR' as any,
        poolExpiresAt: { gt: new Date() },
        passengerId: { not: passengerId },
      },
      select: { poolGroupId: true, pickupLatitude: true, pickupLongitude: true, passengerCount: true },
    });

    // Group by poolGroupId and aggregate total pax + representative coords
    const groups = new Map<string, { totalPax: number; lat: number; lng: number }>();
    for (const b of existingPools) {
      if (!b.poolGroupId) continue;
      const g = groups.get(b.poolGroupId) ?? { totalPax: 0, lat: b.pickupLatitude, lng: b.pickupLongitude };
      g.totalPax += b.passengerCount;
      groups.set(b.poolGroupId, g);
    }

    for (const [groupId, g] of groups) {
      if (g.totalPax + newPaxCount > 3) continue;
      const dist = haversineDistance(
        { latitude: pickupLat, longitude: pickupLng },
        { latitude: g.lat, longitude: g.lng },
      );
      if (dist <= SEARCH_RADIUS_KM) {
        return { poolGroupId: groupId, shouldDispatch: g.totalPax + newPaxCount >= 3 };
      }
    }

    return { poolGroupId: randomUUID(), shouldDispatch: false };
  }

  private async dispatchPoolGroup(poolGroupId: string) {
    const bookings: any[] = await this.prisma.booking.findMany({
      where: { poolGroupId, status: 'POOLING' as any } as any,
      include: { passenger: { select: { firstName: true, lastName: true, phone: true } } },
    });
    if (bookings.length === 0) return;

    const totalPax = bookings.reduce((s, b) => s + b.passengerCount, 0);
    const totalFare = bookings.reduce((s, b) => s + Number(b.estimatedFare), 0);
    const first = bookings[0];

    const payload = {
      type: 'POOL_GROUP',
      poolGroupId,
      bookings: bookings.map((b) => ({
        bookingId: b.id,
        passenger: { id: b.passengerId, firstName: b.passenger.firstName, lastName: b.passenger.lastName, phone: b.passenger.phone },
        pickup: { address: b.pickupAddress, latitude: b.pickupLatitude, longitude: b.pickupLongitude },
        dropoff: { address: b.dropoffAddress, latitude: b.dropoffLatitude, longitude: b.dropoffLongitude },
        estimatedFare: Number(b.estimatedFare),
        passengerCount: b.passengerCount,
        distanceKm: b.distanceKm,
      })),
      totalPassengers: totalPax,
      totalFare,
      distanceKm: first.distanceKm,
      expiresAt: (first as any).poolExpiresAt?.getTime() ?? Date.now() + 15 * 60 * 1000,
    };

    const riders = await this.prisma.riderProfile.findMany({
      where: {
        onlineStatus: 'ONLINE',
        status: 'APPROVED',
        vehicleType: 'TRICYCLE' as any,
        currentLatitude: { not: null },
        currentLongitude: { not: null },
        walletBalance: { gte: 0 },
        bookingsAsRider: { none: { status: { in: ['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] } } },
      },
      include: { user: { select: { id: true, fcmToken: true } } },
    });

    const nearby = riders.filter((r) => {
      if (!r.currentLatitude || !r.currentLongitude) return false;
      return haversineDistance(
        { latitude: first.pickupLatitude, longitude: first.pickupLongitude },
        { latitude: r.currentLatitude, longitude: r.currentLongitude },
      ) <= SEARCH_RADIUS_KM;
    });

    for (const rider of nearby) {
      this.socket.sendBookingRequest(rider.user.id, payload as any);
      if (rider.user.fcmToken) {
        await this.notifications.sendPush(rider.user.fcmToken, {
          title: '🚌 Regular Pool Trip!',
          body: `${totalPax} passengers · ₱${totalFare.toFixed(0)} total`,
          data: { type: NotificationType.BOOKING_REQUEST, poolGroupId },
        });
      }
    }

    this.logger.log(`Pool group ${poolGroupId} dispatched to ${nearby.length} riders`);
  }

  private async getReadyPoolGroups(rider: any) {
    const fifteenMinAgo = new Date(Date.now() - 15 * 60 * 1000);

    const poolingBookings = await this.prisma.booking.findMany({
      where: {
        status: 'POOLING' as any,
        bookingType: 'REGULAR' as any,
        createdAt: { lte: fifteenMinAgo },
      },
      include: { passenger: { select: { firstName: true, lastName: true, phone: true } } },
    });

    const groups = new Map<string, any[]>();
    for (const b of poolingBookings) {
      if (!(b as any).poolGroupId) continue;
      const arr = groups.get((b as any).poolGroupId) ?? [];
      arr.push(b);
      groups.set((b as any).poolGroupId, arr);
    }

    const result: any[] = [];
    for (const [groupId, bookings] of groups) {
      const first = bookings[0];
      const dist = haversineDistance(
        { latitude: first.pickupLatitude, longitude: first.pickupLongitude },
        { latitude: rider.currentLatitude, longitude: rider.currentLongitude },
      );
      if (dist > SEARCH_RADIUS_KM) continue;

      const totalPax = bookings.reduce((s: number, b: any) => s + b.passengerCount, 0);
      const totalFare = bookings.reduce((s: number, b: any) => s + Number(b.estimatedFare), 0);

      result.push({
        type: 'POOL_GROUP',
        poolGroupId: groupId,
        bookings: bookings.map((b: any) => ({
          bookingId: b.id,
          passenger: { id: b.passengerId, firstName: b.passenger.firstName, lastName: b.passenger.lastName, phone: b.passenger.phone },
          pickup: { address: b.pickupAddress, latitude: b.pickupLatitude, longitude: b.pickupLongitude },
          dropoff: { address: b.dropoffAddress, latitude: b.dropoffLatitude, longitude: b.dropoffLongitude },
          estimatedFare: Number(b.estimatedFare),
          passengerCount: b.passengerCount,
          distanceKm: b.distanceKm,
        })),
        totalPassengers: totalPax,
        totalFare,
        distanceKm: first.distanceKm,
        expiresAt: first.poolExpiresAt?.getTime() ?? Date.now() + 15 * 60 * 1000,
        waitingMinutes: Math.floor((Date.now() - first.createdAt.getTime()) / 60000),
      });
    }
    return result;
  }

  async acceptPoolGroup(riderId: string, poolGroupId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId: riderId },
      include: { user: true, vehicle: true },
    });
    if (!rider) throw new NotFoundException('Rider profile not found');
    if (rider.status !== 'APPROVED') throw new ForbiddenException('Rider not approved');

    const activeBooking = await this.prisma.booking.findFirst({
      where: { riderId: rider.id, status: { in: ['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] } },
    });
    if (activeBooking) throw new BadRequestException('You already have an active booking');

    // Atomic: update only if all bookings in group are still POOLING
    const claimed = await this.prisma.booking.updateMany({
      where: { poolGroupId, status: 'POOLING' as any } as any,
      data: { riderId: rider.id, status: 'ACCEPTED' as any, acceptedAt: new Date() },
    });
    if (claimed.count === 0) throw new BadRequestException('Pool group is no longer available');

    const bookings: any[] = await this.prisma.booking.findMany({
      where: { poolGroupId } as any,
      include: { passenger: { select: { firstName: true, lastName: true, phone: true, fcmToken: true } } },
    });

    // Notify all passengers
    for (const b of bookings) {
      this.socket.notifyBookingAccepted(b.passengerId, {
        bookingId: b.id,
        status: BookingStatus.ACCEPTED,
        rider: {
          riderId: rider.id,
          userId: rider.userId,
          firstName: rider.user.firstName,
          lastName: rider.user.lastName,
          rating: rider.rating,
          latitude: rider.currentLatitude ?? 0,
          longitude: rider.currentLongitude ?? 0,
          distanceKm: 0,
          etaMinutes: 0,
          vehicle: rider.vehicle as any,
        },
      });
      if (b.passenger.fcmToken) {
        await this.notifications.sendPush(b.passenger.fcmToken, {
          title: 'Rider Found!',
          body: `${rider.user.firstName} is on the way! (Pool trip)`,
          data: { type: NotificationType.RIDER_ASSIGNED, bookingId: b.id },
        });
      }
    }

    // Dismiss pool from all other riders
    const onlineRiders = await this.prisma.riderProfile.findMany({
      where: { onlineStatus: 'ONLINE', status: 'APPROVED' },
      include: { user: { select: { id: true } } },
    });
    for (const r of onlineRiders) {
      if (r.user.id !== rider.user.id) {
        this.socket.sendToUser(r.user.id, 'pool:taken', { poolGroupId });
      }
    }

    return bookings;
  }

  // ── End pooling helpers ────────────────────────────────────────────────────

  async acceptBooking(riderId: string, bookingId: string) {
    const rider = await this.prisma.riderProfile.findUnique({
      where: { userId: riderId },
      include: { user: true, vehicle: true },
    });
    if (!rider) throw new NotFoundException('Rider profile not found');
    if (rider.status !== 'APPROVED') throw new ForbiddenException('Rider not approved');

    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.status !== 'SEARCHING') throw new BadRequestException('Booking is no longer available');

    const activeBooking = await this.prisma.booking.findFirst({
      where: { riderId: rider.id, status: { in: ['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] } },
    });
    if (activeBooking) throw new BadRequestException('You already have an active booking');

    // Atomic update: only succeeds if booking is still SEARCHING — prevents two riders
    // from accepting the same booking simultaneously (TOCTOU race condition)
    const claimed = await this.prisma.booking.updateMany({
      where: { id: bookingId, status: 'SEARCHING' },
      data: { riderId: rider.id, status: 'ACCEPTED', acceptedAt: new Date() },
    });
    if (claimed.count === 0) throw new BadRequestException('Booking is no longer available');

    const updated = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { passenger: { select: { firstName: true, lastName: true, phone: true, fcmToken: true } } },
    });
    if (!updated) throw new NotFoundException('Booking not found after accept');

    this.socket.notifyBookingAccepted(booking.passengerId, {
      bookingId,
      status: BookingStatus.ACCEPTED,
      rider: {
        riderId: rider.id,
        userId: rider.userId,
        firstName: rider.user.firstName,
        lastName: rider.user.lastName,
        rating: rider.rating,
        latitude: rider.currentLatitude ?? 0,
        longitude: rider.currentLongitude ?? 0,
        distanceKm: 0,
        etaMinutes: 0,
        vehicle: rider.vehicle as any,
      },
    });

    // Dismiss card from all other online riders
    await this.notifyBookingTaken(bookingId, rider.user.id);

    if (updated.passenger.fcmToken) {
      await this.notifications.sendPush(updated.passenger.fcmToken, {
        title: 'Rider Found!',
        body: `${rider.user.firstName} is on the way!`,
        data: { type: NotificationType.RIDER_ASSIGNED, bookingId },
      });
    }

    // Consume promo code now that a rider accepted
    if (booking.promoCode && Number(booking.discount) > 0) {
      await this.prisma.promotion.update({
        where: { code: booking.promoCode },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
      await this.prisma.notification.deleteMany({
        where: { userId: booking.passengerId, body: { contains: booking.promoCode } },
      }).catch(() => {});
    }

    return updated;
  }

  private async notifyBookingTaken(bookingId: string, acceptingUserId: string) {
    const onlineRiders = await this.prisma.riderProfile.findMany({
      where: { onlineStatus: 'ONLINE', status: 'APPROVED' },
      include: { user: { select: { id: true } } },
    });
    for (const r of onlineRiders) {
      if (r.user.id !== acceptingUserId) {
        this.socket.sendToUser(r.user.id, 'booking:taken', { bookingId });
      }
    }
  }

  async updateBookingStatus(_userId: string, bookingId: string, status: BookingStatus, _isRider: boolean) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        passenger: { select: { id: true, fcmToken: true, profilePhoto: true } },
        rider: { include: { user: { select: { id: true, fcmToken: true } } } },
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const transitions: Record<string, { allowed: BookingStatus[]; field: string }> = {
      [BookingStatus.RIDER_ARRIVED]: { allowed: ['ACCEPTED' as any], field: 'arrivedAt' },
      [BookingStatus.IN_PROGRESS]: { allowed: ['RIDER_ARRIVED' as any], field: 'pickedUpAt' },
      [BookingStatus.COMPLETED]: { allowed: ['IN_PROGRESS' as any], field: 'completedAt' },
    };

    const transition = transitions[status];
    if (!transition) throw new BadRequestException('Invalid status transition');
    if (!transition.allowed.includes(booking.status as any)) {
      throw new BadRequestException(`Cannot transition from ${booking.status} to ${status}`);
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status, [transition.field]: new Date() },
    });

    // Notify passenger first so it always fires even if completion processing fails
    this.socket.notifyBookingStatusUpdate(booking.passengerId, { bookingId, status });

    if (status === BookingStatus.COMPLETED) {
      try {
        await this.handleTripCompletion(booking);
      } catch (err) {
        this.logger.error(`Trip completion processing failed for booking ${bookingId}:`, err);
      }
    }

    return updated;
  }

  private async handleTripCompletion(booking: any) {
    if (!booking.riderId) return;

    const fare = Number(booking.estimatedFare);
    const promoDiscount = Number(booking.discount ?? 0);
    const hasPromo = promoDiscount > 0;
    const riderProfile = await this.prisma.riderProfile.findUnique({ where: { id: booking.riderId } });
    const existingDebt = Number(riderProfile?.promoDebt ?? 0);

    let commission: number;
    let riderEarnings: number;
    let newPromoDebt = 0;
    let notifBody: string;

    if (hasPromo) {
      // Promo booking: waive commission, track carry-over
      const normalCommission = fare * 0.20;
      const carryOver = promoDiscount - normalCommission;
      commission = 0; // No commission deducted
      riderEarnings = fare;
      newPromoDebt = carryOver > 0 ? carryOver : 0;
      notifBody = `Fare: ₱${fare.toFixed(0)} (₱${promoDiscount.toFixed(0)} promo applied)\nCommission waived! You earned ₱${fare.toFixed(0)}\n${newPromoDebt > 0 ? `₱${newPromoDebt.toFixed(0)} covered by app on next booking` : ''}`;
    } else {
      // Normal booking: deduct commission + recover any promo debt from app's share
      commission = fare * 0.20;
      riderEarnings = fare - commission;
      notifBody = `Fare: ₱${fare.toFixed(0)}\nCommission (20%): -₱${commission.toFixed(0)}\nYou earned: ₱${riderEarnings.toFixed(0)}`;
      if (existingDebt > 0) {
        notifBody += `\nApp absorbed ₱${existingDebt.toFixed(0)} promo debt from previous booking`;
      }
    }

    await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          bookingId: booking.id,
          passengerId: booking.passengerId,
          riderId: booking.riderId,
          amount: fare,
          commission,
          method: booking.paymentMethod,
          status: 'COMPLETED',
          processedAt: new Date(),
        },
      }),
      this.prisma.earning.create({
        data: { riderId: booking.riderId, bookingId: booking.id, amount: riderEarnings },
      }),
      this.prisma.riderProfile.update({
        where: { id: booking.riderId },
        data: {
          walletBalance: commission > 0 ? { decrement: commission } : undefined,
          totalTrips: { increment: 1 },
          promoDebt: newPromoDebt,
        },
      }),
    ]);

    if (booking.rider?.user?.fcmToken) {
      await this.notifications.sendPush(booking.rider.user.fcmToken, {
        title: hasPromo ? 'Promo Trip Completed!' : 'Trip Completed!',
        body: notifBody,
        data: { type: NotificationType.TRIP_COMPLETED, bookingId: booking.id },
      });
    }

    await this.awardLoyaltyPoints(booking);
  }

  private async awardLoyaltyPoints(booking: any) {
    const RIDER_POINTS = 10;
    const PASSENGER_POINTS = 15;
    const REDEEM_THRESHOLD = 100;
    const RIDER_TOPUP_REWARD = 20;
    const PASSENGER_DISCOUNT_REWARD = 20;

    try {
      // Award 5 points to rider
      if (booking.rider?.user?.id) {
        const riderUser = await this.prisma.user.update({
          where: { id: booking.rider.user.id },
          data: { loyaltyPoints: { increment: RIDER_POINTS } },
        });
        await this.prisma.pointTransaction.create({
          data: { userId: riderUser.id, points: RIDER_POINTS, type: 'EARN', description: `Trip completed (+${RIDER_POINTS} pts)`, bookingId: booking.id },
        });

        if (riderUser.loyaltyPoints >= REDEEM_THRESHOLD) {
          await this.prisma.$transaction([
            this.prisma.user.update({
              where: { id: riderUser.id },
              data: { loyaltyPoints: { decrement: REDEEM_THRESHOLD } },
            }),
            this.prisma.riderProfile.update({
              where: { id: booking.riderId },
              data: { walletBalance: { increment: RIDER_TOPUP_REWARD } },
            }),
            this.prisma.pointTransaction.create({
              data: { userId: riderUser.id, points: -REDEEM_THRESHOLD, type: 'REDEEM_TOPUP', description: `Auto-redeemed 100 pts → ₱${RIDER_TOPUP_REWARD} topup` },
            }),
          ]);
          const riderMsg = `You reached 100 points! ₱${RIDER_TOPUP_REWARD} added to your topup balance.`;
          await this.notifications.createNotification(riderUser.id, NotificationType.PROMO_ALERT, 'Loyalty Reward!', riderMsg);
          if (riderUser.fcmToken) {
            await this.notifications.sendPush(riderUser.fcmToken, {
              title: 'Loyalty Reward!', body: riderMsg,
              data: { type: NotificationType.PROMO_ALERT },
            }).catch(() => {});
          }
        }
      }

      // Award 15 points to passenger — only if they have a profile photo
      if (!booking.passenger?.profilePhoto) {
        return;
      }
      const passenger = await this.prisma.user.update({
        where: { id: booking.passengerId },
        data: { loyaltyPoints: { increment: PASSENGER_POINTS } },
      });
      await this.prisma.pointTransaction.create({
        data: { userId: passenger.id, points: PASSENGER_POINTS, type: 'EARN', description: 'Trip completed (+15 pts)', bookingId: booking.id },
      });

      if (passenger.loyaltyPoints >= REDEEM_THRESHOLD) {
        const promoCode = `LOYAL${Date.now().toString(36).toUpperCase()}`;
        await this.prisma.$transaction([
          this.prisma.user.update({
            where: { id: passenger.id },
            data: { loyaltyPoints: { decrement: REDEEM_THRESHOLD } },
          }),
          this.prisma.promotion.create({
            data: {
              code: promoCode,
              type: 'FIXED',
              value: PASSENGER_DISCOUNT_REWARD,
              isActive: true,
              usageLimit: 1,
              userLimit: 1,
              startsAt: new Date(),
              expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          }),
          this.prisma.pointTransaction.create({
            data: { userId: passenger.id, points: -REDEEM_THRESHOLD, type: 'REDEEM_DISCOUNT', description: `Auto-redeemed 100 pts → ₱${PASSENGER_DISCOUNT_REWARD} discount code: ${promoCode}` },
          }),
        ]);
        const passengerMsg = `You earned a ₱${PASSENGER_DISCOUNT_REWARD} discount! Use code: ${promoCode} on your next ride.`;
        await this.notifications.createNotification(passenger.id, NotificationType.PROMO_ALERT, 'Loyalty Reward!', passengerMsg, { promoCode });
        if (passenger.fcmToken) {
          await this.notifications.sendPush(passenger.fcmToken, {
            title: 'Loyalty Reward!', body: passengerMsg,
            data: { type: NotificationType.PROMO_ALERT, promoCode },
          }).catch(() => {});
        }
      }
    } catch (err) {
      this.logger.error('Loyalty points error:', err);
    }
  }

  async cancelBooking(_userId: string, bookingId: string, dto: CancelBookingDto, isRider: boolean) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { rider: { include: { user: true } }, passenger: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const cancellableStatuses = ['SEARCHING', 'ACCEPTED', 'RIDER_ARRIVED'];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException('Cannot cancel booking at this stage');
    }

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED', cancelledAt: new Date(), cancellationReason: dto.reason },
    });

    // Notify the other party via socket
    if (!isRider && booking.rider?.user?.id) {
      // Passenger cancelled → tell rider (both custom event + standard status update)
      this.socket.sendToUser(booking.rider.user.id, 'passenger:booking:cancel', {
        bookingId,
        reason: dto.reason,
      });
      this.socket.sendToUser(booking.rider.user.id, SocketEvent.BOOKING_STATUS_UPDATE, {
        bookingId,
        status: 'CANCELLED',
      });
    } else if (isRider && booking.passengerId) {
      // Rider cancelled → tell passenger
      this.socket.notifyBookingStatusUpdate(booking.passengerId, {
        bookingId,
        status: 'CANCELLED',
      });
    }

    return updated;
  }

  async rateRider(passengerId: string, bookingId: string, dto: RateRiderDto) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, passengerId, status: 'COMPLETED' },
    });
    if (!booking) throw new NotFoundException('Completed booking not found');
    if (!booking.riderId) throw new BadRequestException('No rider on this booking');

    const existing = await this.prisma.rating.findUnique({ where: { bookingId } });
    if (existing) throw new BadRequestException('Already rated');

    const rating = await this.prisma.rating.create({
      data: {
        bookingId,
        riderId: booking.riderId,
        passengerId,
        riderScore: dto.score,
        riderComment: dto.comment,
      },
    });

    // Update rider average rating
    const avg = await this.prisma.rating.aggregate({
      where: { riderId: booking.riderId },
      _avg: { riderScore: true },
    });

    await this.prisma.riderProfile.update({
      where: { id: booking.riderId },
      data: { rating: avg._avg.riderScore ?? 5.0 },
    });

    return rating;
  }

  async getBookingById(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        passenger: { select: { firstName: true, lastName: true, profilePhoto: true, phone: true } },
        rider: {
          include: {
            user: { select: { firstName: true, lastName: true, profilePhoto: true, phone: true } },
            vehicle: true,
          },
        },
        payment: true,
        rating: true,
      },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  async getMyBookings(userId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return this.prisma.booking.findMany({
      where: {
        OR: [{ passengerId: userId }, { rider: { userId } }],
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true, status: true, pickupAddress: true, dropoffAddress: true,
        estimatedFare: true, createdAt: true, paymentMethod: true,
      },
    });
  }

  async getRecentTrips(userId: string) {
    return this.prisma.booking.findMany({
      where: {
        OR: [{ passengerId: userId }, { rider: { userId } }],
        status: 'COMPLETED',
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        passenger: { select: { id: true, firstName: true, lastName: true, phone: true, profilePhoto: true } },
        rider: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, phone: true, profilePhoto: true } },
          },
        },
      },
    });
  }

  async getActiveBooking(userId: string) {
    return this.prisma.booking.findFirst({
      where: {
        OR: [{ passengerId: userId }, { rider: { userId } }],
        status: { in: ['POOLING', 'SEARCHING', 'ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] as any },
      },
      include: {
        rider: {
          include: {
            user: { select: { firstName: true, lastName: true, profilePhoto: true, phone: true } },
            vehicle: true,
          },
        },
        passenger: { select: { firstName: true, lastName: true, profilePhoto: true, phone: true } },
      },
    });
  }

  private async getPromoDiscount(code: string, _fare: number): Promise<number> {
    const promo = await this.prisma.promotion.findUnique({ where: { code } });
    if (!promo) return 0;
    if (!promo.isActive) return 0;
    if (new Date() < promo.startsAt || new Date() > promo.expiresAt) return 0;
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) return 0;
    return Number(promo.value);
  }
}
