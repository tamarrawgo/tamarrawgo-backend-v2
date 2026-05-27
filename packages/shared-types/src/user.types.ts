import { UserRole, UserStatus, RiderStatus, OnlineStatus, DocumentType, VehicleType } from './enums';

export interface User {
  id: string;
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  profilePhoto?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RiderProfile {
  id: string;
  userId: string;
  status: RiderStatus;
  onlineStatus: OnlineStatus;
  licenseNumber: string;
  rating: number;
  totalTrips: number;
  walletBalance: number;
  currentLatitude?: number;
  currentLongitude?: number;
  currentHeading?: number;
  currentSpeed?: number;
  lastLocationUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vehicle {
  id: string;
  riderId: string;
  plateNumber: string;
  model: string;
  brand: string;
  year: number;
  color: string;
  type: VehicleType;
  createdAt: Date;
}

export interface RiderDocument {
  id: string;
  riderId: string;
  type: DocumentType;
  fileUrl: string;
  verified: boolean;
  createdAt: Date;
}

export interface RegisterPassengerDto {
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  password: string;
}

export interface RegisterRiderDto {
  phone: string;
  email?: string;
  firstName: string;
  lastName: string;
  password: string;
  licenseNumber: string;
}

export interface LoginDto {
  phone: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  phone: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}
