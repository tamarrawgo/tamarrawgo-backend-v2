import { BookingStatus, PaymentMethod } from './enums';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Location extends Coordinates {
  address: string;
  placeId?: string;
}

export interface FareEstimate {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  discount: number;
  totalFare: number;
  distanceKm: number;
  estimatedDurationMinutes: number;
}

export interface Booking {
  id: string;
  passengerId: string;
  riderId?: string;
  status: BookingStatus;
  pickupLocation: Location;
  dropoffLocation: Location;
  fareEstimate: FareEstimate;
  finalFare?: number;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  notes?: string;
  scheduledAt?: Date;
  acceptedAt?: Date;
  pickedUpAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  cancellationReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBookingDto {
  pickupLocation: Location;
  dropoffLocation: Location;
  paymentMethod: PaymentMethod;
  promoCode?: string;
  notes?: string;
}

export interface TripLocation {
  id: string;
  bookingId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: Date;
}

export interface RiderLocationUpdate {
  riderId: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  timestamp: number;
}

export interface NearbyRider {
  riderId: string;
  userId: string;
  firstName: string;
  lastName: string;
  rating: number;
  latitude: number;
  longitude: number;
  distanceKm: number;
  etaMinutes: number;
  vehicle: {
    brand: string;
    model: string;
    plateNumber: string;
    color: string;
  };
}
