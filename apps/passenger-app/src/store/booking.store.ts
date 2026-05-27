import { create } from 'zustand';
import { Booking, FareEstimate, Location } from '@tamarrawgo/shared-types';

interface BookingState {
  pickup: Location | null;
  dropoff: Location | null;
  fareEstimate: FareEstimate | null;
  activeBooking: Booking | null;
  riderLocation: { latitude: number; longitude: number; heading: number } | null;

  setPickup: (location: Location | null) => void;
  setDropoff: (location: Location | null) => void;
  setFareEstimate: (estimate: FareEstimate | null) => void;
  setActiveBooking: (booking: Booking | null) => void;
  setRiderLocation: (loc: { latitude: number; longitude: number; heading: number } | null) => void;
  reset: () => void;
}

export const useBookingStore = create<BookingState>((set) => ({
  pickup: null,
  dropoff: null,
  fareEstimate: null,
  activeBooking: null,
  riderLocation: null,

  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),
  setFareEstimate: (fareEstimate) => set({ fareEstimate }),
  setActiveBooking: (activeBooking) => set({ activeBooking }),
  setRiderLocation: (riderLocation) => set({ riderLocation }),
  reset: () => set({ pickup: null, dropoff: null, fareEstimate: null, activeBooking: null, riderLocation: null }),
}));
