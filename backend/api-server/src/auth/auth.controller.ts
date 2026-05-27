import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterPassengerDto, RegisterRiderDto } from './dto/register.dto';
import { LoginDto, RefreshTokenDto, VerifyOtpDto, RequestOtpDto } from './dto/login.dto';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('register/passenger')
  @ApiOperation({ summary: 'Register a new passenger' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  registerPassenger(@Body() dto: RegisterPassengerDto) {
    return this.auth.registerPassenger(dto);
  }

  @Post('register/rider')
  @ApiOperation({ summary: 'Register a new rider' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  registerRider(@Body() dto: RegisterRiderDto) {
    return this.auth.registerRider(dto);
  }

  @Post('verify-otp')
  @ApiOperation({ summary: 'Verify OTP and activate account' })
  @HttpCode(HttpStatus.OK)
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.auth.verifyOtp(dto);
  }

  @Post('request-otp')
  @ApiOperation({ summary: 'Request new OTP' })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  requestOtp(@Body() dto: RequestOtpDto) {
    return this.auth.requestOtp(dto.phone);
  }

  @Post('login')
  @ApiOperation({ summary: 'Login with phone and password' })
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate session' })
  @HttpCode(HttpStatus.OK)
  logout(@CurrentUser() user: any) {
    return this.auth.logout(user.id);
  }
}
