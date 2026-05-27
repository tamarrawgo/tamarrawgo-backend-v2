import { PaymentMethod, PaymentStatus } from './enums';

export interface Payment {
  id: string;
  bookingId: string;
  passengerId: string;
  riderId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  referenceNumber?: string;
  processedAt?: Date;
  createdAt: Date;
}

export interface WalletTransaction {
  id: string;
  riderId: string;
  amount: number;
  type: 'CREDIT' | 'DEBIT';
  description: string;
  referenceId?: string;
  createdAt: Date;
}

export interface EarningsSummary {
  today: number;
  thisWeek: number;
  thisMonth: number;
  totalTrips: number;
  averageRating: number;
}
