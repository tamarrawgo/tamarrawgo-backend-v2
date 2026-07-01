import { IsString, IsPhoneNumber, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: '+639171234567' })
  @IsPhoneNumber('PH')
  phone: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class VerifyOtpDto {
  @ApiProperty({ example: '+639171234567' })
  @IsPhoneNumber('PH')
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class RequestOtpDto {
  @ApiProperty({ example: '+639171234567' })
  @IsPhoneNumber('PH')
  phone: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: '+639171234567' })
  @IsPhoneNumber('PH')
  phone: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  otp: string;

  @ApiProperty({ example: 'NewSecurePass123!' })
  @IsString()
  @MinLength(8)
  newPassword: string;
}
