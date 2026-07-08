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
import { LoginDto, RefreshTokenDto, VerifyOtpDto } from './dto/login.dto';
import { JwtPayload, UserRole } from '@tamarrawgo/shared-types';
import { generateOtp } from '@tamarrawgo/shared-utils';
import { SmsService } from './sms.service';

interface PendingRegistration {
  dto: RegisterPassengerDto | RegisterRiderDto;
  role: UserRole.PASSENGER | UserRole.RIDER;
  passwordHash: string;
  otp: string;
  otpExpiresAt: Date;
}

@Injectable()
export class AuthService {
  private pendingRegistrations = new Map<string, PendingRegistration>();

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private sms: SmsService,
  ) {}

  async registerPassenger(dto: RegisterPassengerDto) {
    const existing = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (existing) throw new ConflictException('Phone number already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const otp = generateOtp(6);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    this.pendingRegistrations.set(dto.phone, { dto, role: UserRole.PASSENGER, passwordHash, otp, otpExpiresAt });

    await this.sms.sendOtp(dto.phone, otp);
    return { message: 'OTP sent. Please verify your phone to complete registration.' };
  }

  async registerRider(dto: RegisterRiderDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.phone }, { rider: { licenseNumber: dto.licenseNumber } }] },
    });
    if (existing) throw new ConflictException('This phone number or license number is already registered. Please login instead.');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const otp = generateOtp(6);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    this.pendingRegistrations.set(dto.phone, { dto, role: UserRole.RIDER, passwordHash, otp, otpExpiresAt });

    await this.sms.sendOtp(dto.phone, otp);
    return { message: 'OTP sent. Verify your phone to complete registration.' };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    // Pending registration path — no DB record yet
    const pending = this.pendingRegistrations.get(dto.phone);
    if (pending) {
      if (new Date() > pending.otpExpiresAt) {
        this.pendingRegistrations.delete(dto.phone);
        throw new BadRequestException('OTP has expired. Please register again.');
      }
      if (pending.otp !== dto.otp) throw new BadRequestException('Invalid OTP');

      this.pendingRegistrations.delete(dto.phone);

      if (pending.role === UserRole.RIDER) {
        const riderDto = pending.dto as RegisterRiderDto;
        await this.prisma.user.create({
          data: {
            phone: riderDto.phone,
            email: riderDto.email,
            firstName: riderDto.firstName,
            lastName: riderDto.lastName,
            passwordHash: pending.passwordHash,
            role: UserRole.RIDER,
            status: 'ACTIVE',
            city: riderDto.city,
            barangay: riderDto.barangay,
            rider: {
              create: {
                licenseNumber: riderDto.licenseNumber,
                vehicleType: (riderDto.vehicleType ?? 'TRICYCLE') as any,
                status: 'PENDING',
                vehicle: {
                  create: {
                    plateNumber: riderDto.plateNumber,
                    brand: riderDto.vehicleBrand ?? 'Tricycle',
                    model: riderDto.vehicleModel ?? 'Standard',
                    year: new Date().getFullYear(),
                    color: riderDto.vehicleColor ?? 'N/A',
                  },
                },
              },
            },
          },
        });
        return { message: 'Phone verified! Your account is pending admin approval. You will be able to login once approved.', pendingApproval: true };
      }

      const passengerDto = pending.dto as RegisterPassengerDto;
      const user = await this.prisma.user.create({
        data: {
          phone: passengerDto.phone,
          email: passengerDto.email,
          firstName: passengerDto.firstName,
          lastName: passengerDto.lastName,
          passwordHash: pending.passwordHash,
          role: UserRole.PASSENGER,
          status: 'ACTIVE',
        },
      });
      return this.generateTokens(user.id, user.phone, user.role as UserRole);
    }

    // Existing user path — used by forgotPassword OTP flow
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone }, include: { rider: true } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.otpCode || !user.otpExpiresAt) {
      if (user.status === 'ACTIVE') throw new BadRequestException('This account is already verified. Please login instead.');
      throw new BadRequestException('No OTP requested. Please tap Resend OTP.');
    }
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired. Please tap Resend OTP.');
    if (user.otpCode !== dto.otp) throw new BadRequestException('Invalid OTP');

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

    const otp = generateOtp(6);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({ where: { id: user.id }, data: { otpCode: otp, otpExpiresAt } });
    console.log(`[OTP-RESET] ${phone}: ${otp}`);
    await this.sms.sendOtp(phone, otp).catch(() => {});

    return { message: 'OTP sent to your phone number' };
  }

  async resetPassword(phone: string, otp: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.otpCode || !user.otpExpiresAt) throw new BadRequestException('No OTP requested');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired');
    if (user.otpCode !== otp) throw new BadRequestException('Invalid OTP');

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, otpCode: null, otpExpiresAt: null },
    });

    return { message: 'Password reset successfully. You can now login with your new password.' };
  }

  async requestOtp(phone: string) {
    // Resend OTP for a pending (not yet saved) registration
    const pending = this.pendingRegistrations.get(phone);
    if (pending) {
      const otp = generateOtp(6);
      const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      pending.otp = otp;
      pending.otpExpiresAt = otpExpiresAt;
      await this.sms.sendOtp(phone, otp);
      return { message: 'OTP sent successfully' };
    }

    // Resend OTP for an existing user (forgotPassword flow)
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('User not found');

    const otp = generateOtp(6);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({ where: { id: user.id }, data: { otpCode: otp, otpExpiresAt } });
    await this.sms.sendOtp(phone, otp);

    return { message: 'OTP sent successfully' };
  }

  async adminLogin(username: string, password: string) {
    if (username !== 'superadmin') throw new UnauthorizedException('Invalid credentials');
    const user = await this.prisma.user.findFirst({ where: { role: 'ADMIN' } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');
    if (user.status === 'SUSPENDED') throw new UnauthorizedException('Account has been suspended');
    return this.generateTokens(user.id, user.phone, user.role as UserRole);
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
