import { RiderLocationUpdate, NearbyRider } from './booking.types';
import { BookingStatus } from './enums';

export enum SocketEvent {
  // Rider events
  RIDER_LOCATION_UPDATE = 'rider:location:update',
  RIDER_STATUS_CHANGE = 'rider:status:change',
  RIDER_ACCEPT_BOOKING = 'rider:booking:accept',
  RIDER_REJECT_BOOKING = 'rider:booking:reject',
  RIDER_ARRIVED = 'rider:arrived',
  RIDER_START_TRIP = 'rider:trip:start',
  RIDER_COMPLETE_TRIP = 'rider:trip:complete',

  // Passenger events
  PASSENGER_BOOKING_REQUEST = 'passenger:booking:request',
  PASSENGER_CANCEL_BOOKING = 'passenger:booking:cancel',

  // Server → Client events
  BOOKING_REQUEST = 'booking:request',
  BOOKING_STATUS_UPDATE = 'booking:status:update',
  RIDER_LOCATION = 'rider:location',
  NEARBY_RIDERS = 'nearby:riders',
  BOOKING_ASSIGNED = 'booking:assigned',
  BOOKING_EXPIRED = 'booking:expired',

  // Chat events
  CHAT_MESSAGE = 'chat:message',
  CHAT_READ = 'chat:read',

  // Connection
  JOIN_ROOM = 'join:room',
  LEAVE_ROOM = 'leave:room',

  // Admin
  FORCE_LOGOUT = 'force:logout',
}

export interface BookingRequestPayload {
  bookingId: string;
  passenger: {
    id: string;
    firstName: string;
    lastName: string;
    rating: number;
  };
  pickup: { address: string; latitude: number; longitude: number };
  dropoff: { address: string; latitude: number; longitude: number };
  estimatedFare: number;
  distanceKm: number;
  expiresAt: number;
}

export interface BookingStatusUpdate {
  bookingId: string;
  status: BookingStatus;
  rider?: NearbyRider;
  message?: string;
}

export interface ChatMessage {
  id: string;
  bookingId: string;
  senderId: string;
  senderRole: string;
  message: string;
  timestamp: number;
}
