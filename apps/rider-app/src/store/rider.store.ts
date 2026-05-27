import { create } from 'zustand';
import { OnlineStatus } from '@tamarrawgo/shared-types';

interface RiderState {
  isOnline: boolean;
  currentBookingRequest: any | null;
  activeBooking: any | null;
  earnings: { today: number; thisWeek: number; thisMonth: number } | null;

  setOnline: (v: boolean) => void;
  setBookingRequest: (req: any | null) => void;
  setActiveBooking: (b: any | null) => void;
  setEarnings: (e: any) => void;
}

export const useRiderStore = create<RiderState>((set) => ({
  isOnline: false,
  currentBookingRequest: null,
  activeBooking: null,
  earnings: null,

  setOnline: (isOnline) => set({ isOnline }),
  setBookingRequest: (currentBookingRequest) => set({ currentBookingRequest }),
  setActiveBooking: (activeBooking) => set({ activeBooking }),
  setEarnings: (earnings) => set({ earnings }),
}));
