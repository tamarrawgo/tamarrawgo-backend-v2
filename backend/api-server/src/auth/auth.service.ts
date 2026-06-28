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

@Injectable()
export class AuthService {
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

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: UserRole.PASSENGER,
        status: 'PENDING_VERIFICATION',
        otpCode: otp,
        otpExpiresAt,
      },
    });

    await this.sms.sendOtp(user.phone, otp);

    return { message: 'Registration successful. Please verify your phone.', userId: user.id };
  }

  async registerRider(dto: RegisterRiderDto) {
    const existing = await this.prisma.user.findFirst({
      where: { OR: [{ phone: dto.phone }, { rider: { licenseNumber: dto.licenseNumber } }] },
    });
    if (existing) throw new ConflictException('Phone or license number already registered');

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const otp = generateOtp(6);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        phone: dto.phone,
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        passwordHash,
        role: UserRole.RIDER,
        status: 'PENDING_VERIFICATION',
        otpCode: otp,
        otpExpiresAt,
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

    await this.sms.sendOtp(user.phone, otp);
    return { message: 'Rider registration submitted. Verify phone and await approval.', userId: user.id };
  }

  async verifyOtp(dto: VerifyOtpDto) {
    const user = await this.prisma.user.findUnique({ where: { phone: dto.phone } });
    if (!user) throw new NotFoundException('User not found');
    if (!user.otpCode || !user.otpExpiresAt) throw new BadRequestException('No OTP requested');
    if (new Date() > user.otpExpiresAt) throw new BadRequestException('OTP has expired');
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
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (!user) throw new NotFoundException('User not found');

    const otp = generateOtp(6);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.user.update({ where: { id: user.id }, data: { otpCode: otp, otpExpiresAt } });
    await this.sms.sendOtp(phone, otp);

    return { message: 'OTP sent successfully' };
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
    if (user.role === UserRole.RIDER && user.rider?.status !== 'APPROVED') {
      throw new UnauthorizedException('Your account is pending admin approval. Please wait for the admin to review your documents.');
    }

    return this.generateTokens(user.id, user.phone, user.role as UserRole);
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
