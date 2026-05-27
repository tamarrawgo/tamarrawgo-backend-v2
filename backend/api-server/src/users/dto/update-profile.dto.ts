import { IsString, IsEmail, IsOptional, IsUrl } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProfileDto {
  @ApiPropertyOptional() @IsString() @IsOptional() firstName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() lastName?: string;
  @ApiPropertyOptional() @IsEmail() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsUrl() @IsOptional() profilePhoto?: string;
}

export class UpdateFcmTokenDto {
  @ApiPropertyOptional() @IsString() fcmToken: string;
}
