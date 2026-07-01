import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterPassengerDto, RegisterRiderDto } from './dto/register.dto';
import { LoginDto, RefreshTokenDto, VerifyOtpDto, ResetPasswordDto } from './dto/login.dto';
import { JwtPayload, UserRole } from '@tamarrawgo/shared-types';
import { FirebaseAdminService } from './firebase-admin.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private firebaseAdmin: FirebaseAdminService,
  ) {}

  async registerPassenger(dto: RegisterPassengerDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Phone number already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: UserRole.PASSENGER,
        status: 'PENDING_VERIFICATION',
      },
    });

    return { message: 'Registration successful. Please verify your phone.', userId: user.id };
  }

  async registerRider(dto: RegisterRiderDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.phone }, { rider: { licenseNumber: dto.licenseNumber } }] },
    });
    if (existing) throw new ConflictException('This phone number or license number is already registered. Please login instead.');

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: UserRole.RIDER,
        status: 'PENDING_VERIFICATION',
        rider: {
          create: {
            licenseNumber: dto.licenseNumber,
            status: 'PENDING',
            vehicle: {
              create: {
                plateNumber: dto.plateNumber,
                brand: dto.vehicleBrand ?? 'Tricycle',
                model: dto.vehicleModel ?? 'Standard',
                year: new Date().getFullYear(),
                color: dto.vehicleColor ?? 'N/A',
              },
            },
          },
        },
      },
      include: { rider: { include: { vehicle: true } } },
    });

    return { message: 'Rider registration submitted. Verify phone and await approval.', userId: user.id };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    // Verify the Firebase ID token — confirms user proved ownership of the phone number
    let firebasePhone: string;
    try {
      const decoded = await this.firebaseAdmin.verifyIdToken(dto.firebaseIdToken);
      firebasePhone = decoded.phone_number ?? '';
    } catch {
      throw new BadRequestException('Invalid or expired verification. Please try again.');
    }

    if (firebasePhone !== dto.phone) {
      throw new BadRequestException('Phone number mismatch. Please verify the correct number.');
    }

    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone }, include: { rider: true } });
    if (!user) throw new NotFoundException('User not found');

    if (user.status === 'ACTIVE') {
      throw new BadRequestException('This account is already verified. Please login instead.');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE', otpCode: null, otpExpiresAt: null },
    });

    if (user.role === UserRole.RIDER) {
      return { message: 'Phone verified! Your account is pending admin approval. You will be able to login once approved.', pendingApproval: true };
    }

    return this.generateTokens(user.id, user.phone, user.role as UserRole);
  }

  async forgotPassword(phone: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('Phone number not registered');
    // OTP is now sent via Firebase from the app — just confirm the user exists
    return { message: 'Phone number verified. Please check your SMS.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    // Verify the Firebase ID token
    let firebasePhone: string;
    try {
      const decoded = await this.firebaseAdmin.verifyIdToken(dto.firebaseIdToken);
      firebasePhone = decoded.phone_number ?? '';
    } catch {
      throw new BadRequestException('Invalid or expired verification. Please try again.');
    }

    if (firebasePhone !== dto.phone) {
      throw new BadRequestException('Phone number mismatch.');
    }

    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException('User not found');

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, otpCode: null, otpExpiresAt: null },
    });

    return { message: 'Password reset successfully. You can now login with your new password.' };
  }

  async requestOtp(_phone: string) {
    // OTP is now handled by Firebase on the client — this endpoint is a no-op kept for compatibility
    return { message: 'Please use the app to resend the verification code.' };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { rider: { select: { status: true } } },
    });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (user.status === 'PENDING_VERIFICATION') {
      throw new UnauthorizedException('Please verify your phone number first');
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Account has been suspended');
    }
    const tokens = await this.generateTokens(user.id, user.phone, user.role as UserRole);

    if (user.role === UserRole.RIDER && user.rider?.status !== 'APPROVED') {
      return { ...tokens, riderStatus: user.rider?.status ?? 'PENDING', pendingApproval: true };
    }

    return tokens;
  }

  async refresh(dto: RefreshTokenDto) {
    let payload: JwtPayload;
    try {
      payload = this.jwt.verify(dto.refreshToken, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.refreshTokenHash) throw new UnauthorizedException('Session expired');

    const valid = await bcrypt.compare(dto.refreshToken, user.refreshTokenHash);
    if (!valid) throw new UnauthorizedException('Invalid refresh token');

    return this.generateTokens(user.id, user.phone, user.role as UserRole);
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshTokenHash: null, fcmToken: null },
    });
    return { message: 'Logged out successfully' };
  }

  private async generateTokens(userId: string, phone: string, role: UserRole) {
    const payload: JwtPayload = { sub: userId, phone, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_SECRET'),
        expiresIn: this.config.get('JWT_EXPIRES_IN', '15m'),
      }),
      this.jwt.signAsync(payload, {
        secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
      }),
    ]);

    const hash = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({ where: { id: userId }, data: { refreshTokenHash: hash } });

    return { accessToken, refreshToken };
  }
}
