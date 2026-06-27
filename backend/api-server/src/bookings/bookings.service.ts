import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FareService } from '../fare/fare.service';
import { MapsService } from '../maps/maps.service';
import { SocketGateway } from '../socket/socket.gateway';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateBookingDto, CancelBookingDto, RateRiderDto } from './dto/booking.dto';
import { haversineDistance, estimateEtaMinutes } from '@tamarrawgo/shared-utils';
import { BookingStatus, NotificationType, SocketEvent } from '@tamarrawgo/shared-types';

const SEARCH_RADIUS_KM = 5;

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

  async estimateFare(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number, promoCode?: string, passengerCount = 1) {
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

    // Calculate fare without promo first to check minimum
    const estimateNoPromo = await this.fare.estimateFare(distanceKm, durationMinutes, 0);
    const count = Math.min(Math.max(passengerCount, 1), 4);
    const multiplier = 1 + (count - 1) * 0.20;
    let baseTotalFare = estimateNoPromo.totalFare;
    if (count > 1) baseTotalFare = Math.round(baseTotalFare * multiplier * 100) / 100;

    // Only allow promo if fare > ₱100
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
    const activeBooking = await this.prisma.booking.findFirst({
      where: { passengerId, status: { in: ['SEARCHING', 'ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] } },
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
      promoDiscount = await this.getPromoDiscount(dto.promoCode, 0);
    }

    const fareEstimate = await this.fare.estimateFare(distanceKm, durationMinutes, promoDiscount);

    // +20% fare per additional passenger (max 4)
    const pCount = Math.min(Math.max(dto.passengerCount ?? 1, 1), 4);
    const pMultiplier = 1 + (pCount - 1) * 0.20;
    const adjustedFare = pCount > 1
      ? Math.round(fareEstimate.totalFare * pMultiplier * 100) / 100
      : fareEstimate.totalFare;

    const booking = await this.prisma.booking.create({
      data: {
        passengerId,
        status: 'SEARCHING',
        pickupAddress: dto.pickup.address,
        pickupLatitude: dto.pickup.latitude,
        pickupLongitude: dto.pickup.longitude,
        pickupPlaceId: dto.pickup.placeId,
        dropoffAddress: dto.dropoff.address,
        dropoffLatitude: dto.dropoff.latitude,
        dropoffLongitude: dto.dropoff.longitude,
        dropoffPlaceId: dto.dropoff.placeId,
        distanceKm: fareEstimate.distanceKm,
        estimatedMinutes: fareEstimate.estimatedDurationMinutes,
        baseFare: fareEstimate.baseFare,
        distanceFare: fareEstimate.distanceFare,
        timeFare: fareEstimate.timeFare,
        surgeMultiplier: fareEstimate.surgeMultiplier,
        discount: fareEstimate.discount,
        estimatedFare: adjustedFare,
        passengerCount: pCount,
        paymentMethod: dto.paymentMethod,
        promoCode: dto.promoCode,
        notes: dto.notes,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      include: { passenger: { select: { firstName: true, lastName: true, phone: true } } },
    });

    // Mark promo as used
    if (dto.promoCode && Number(booking.discount) > 0) {
      await this.prisma.promotion.update({
        where: { code: dto.promoCode },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    }

    // Find and notify nearby riders
    await this.dispatchToNearbyRiders(booking);

    return booking;
  }

  async getAvailableBookings(userId: string) {
    const rider = await this.prisma.riderProfile.findUnique({ where: { userId } });
    if (!rider || !rider.currentLatitude || !rider.currentLongitude) return [];

    const activeBooking = await this.prisma.booking.findFirst({
      where: { riderId: rider.id, status: { in: ['ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] } },
    });
    if (activeBooking) return [];

    const searching = await this.prisma.booking.findMany({
      where: { status: 'SEARCHING' },
      include: { passenger: { select: { firstName: true, lastName: true, phone: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return searching
      .filter((b) => {
        const dist = haversineDistance(
          { latitude: b.pickupLatitude, longitude: b.pickupLongitude },
          { latitude: rider.currentLatitude!, longitude: rider.currentLongitude! },
        );
        return dist <= SEARCH_RADIUS_KM;
      })
      .map((b) => ({
        bookingId: b.id,
        passenger: { id: b.passengerId, firstName: b.passenger.firstName, lastName: b.passenger.lastName, rating: 5.0 },
        pickup: { address: b.pickupAddress, latitude: b.pickupLatitude, longitude: b.pickupLongitude },
        dropoff: { address: b.dropoffAddress, latitude: b.dropoffLatitude, longitude: b.dropoffLongitude },
        estimatedFare: Number(b.estimatedFare),
        discount: Number(b.discount ?? 0),
        distanceKm: b.distanceKm,
        passengerCount: b.passengerCount,
        expiresAt: b.expiresAt?.getTime() ?? Date.now() + 5 * 60 * 1000,
      }));
  }

  private async dispatchToNearbyRiders(booking: any) {
    const riders = await this.prisma.riderProfile.findMany({
      where: {
        onlineStatus: 'ONLINE',
        status: 'APPROVED',
        currentLatitude: { not: null },
        currentLongitude: { not: null },
        walletBalance: { gte: 100 },
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
      passenger: {
        id: booking.passengerId,
        firstName: booking.passenger.firstName,
        lastName: booking.passenger.lastName,
        rating: 5.0,
      },
      pickup: { address: booking.pickupAddress, latitude: booking.pickupLatitude, longitude: booking.pickupLongitude },
      dropoff: { address: booking.dropoffAddress, latitude: booking.dropoffLatitude, longitude: booking.dropoffLongitude },
      estimatedFare: Number(booking.estimatedFare),
      discount: Number(booking.discount ?? 0),
      distanceKm: booking.distanceKm,
      passengerCount: booking.passengerCount ?? 1,
      expiresAt: booking.expiresAt?.getTime() ?? Date.now() + 5 * 60 * 1000,
    };

    for (const rider of nearby) {
      this.socket.sendBookingRequest(rider.user.id, payload);
      if (rider.user.fcmToken) {
        await this.notifications.sendPush(rider.user.fcmToken, {
          title: 'New Booking Request!',
          body: `Pickup: ${booking.pickupAddress} → ₱${Number(booking.estimatedFare).toFixed(0)}`,
          data: { type: NotificationType.BOOKING_REQUEST, bookingId: booking.id },
        });
      }
    }

    this.logger.log(`Booking ${booking.id} dispatched to ${nearby.length} riders`);
  }

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

    const updated = await this.prisma.booking.update({
      where: { id: bookingId },
      data: { riderId: rider.id, status: 'ACCEPTED', acceptedAt: new Date() },
      include: { passenger: { select: { firstName: true, lastName: true, phone: true, fcmToken: true } } },
    });

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
        passenger: { select: { id: true, fcmToken: true } },
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
    const RIDER_TOPUP_REWARD = 50;
    const PASSENGER_DISCOUNT_REWARD = 20;

    try {
      // Award 5 points to rider
      if (booking.rider?.user?.id) {
        const riderUser = await this.prisma.user.update({
          where: { id: booking.rider.user.id },
          data: { loyaltyPoints: { increment: RIDER_POINTS } },
        });
        await this.prisma.pointTransaction.create({
          data: { userId: riderUser.id, points: RIDER_POINTS, type: 'EARN', description: 'Trip completed (+5 pts)', bookingId: booking.id },
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

      // Award 15 points to passenger
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
        status: { in: ['SEARCHING', 'ACCEPTED', 'RIDER_ARRIVED', 'IN_PROGRESS'] },
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
