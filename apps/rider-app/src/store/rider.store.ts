import { create } from 'zustand';

interface RiderState {
  isOnline: boolean;
  bookingRequests: any[];
  activeBooking: any | null;
  earnings: { today: number; thisWeek: number; thisMonth: number } | null;

  setOnline: (v: boolean) => void;
  addBookingRequest: (req: any) => void;
  removeBookingRequest: (bookingId: string) => void;
  setBookingRequests: (reqs: any[]) => void;
  clearBookingRequests: () => void;
  setActiveBooking: (b: any | null) => void;
  setEarnings: (e: any) => void;
}

export const useRiderStore = create<RiderState>((set) => ({
  isOnline: false,
  bookingRequests: [],
  activeBooking: null,
  earnings: null,

  setOnline: (isOnline) => set({ isOnline }),
  addBookingRequest: (req) => set((state) => {
    if (state.bookingRequests.some((r) => r.bookingId === req.bookingId)) return state;
    return { bookingRequests: [...state.bookingRequests, req] };
  }),
  removeBookingRequest: (bookingId) => set((state) => ({
    bookingRequests: state.bookingRequests.filter((r) => r.bookingId !== bookingId),
  })),
  setBookingRequests: (bookingRequests) => set({ bookingRequests }),
  clearBookingRequests: () => set({ bookingRequests: [] }),
  setActiveBooking: (activeBooking) => set({ activeBooking }),
  setEarnings: (earnings) => set({ earnings }),
}));
