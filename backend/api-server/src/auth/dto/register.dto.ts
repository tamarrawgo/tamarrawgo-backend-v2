import { IsString, IsPhoneNumber, IsEmail, IsOptional, MinLength, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterPassengerDto {
  @ApiProperty({ example: '+639171234567' })
  @IsPhoneNumber('PH')
  phone: string;

  @ApiPropertyOptional({ example: 'juan@email.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: 'Juan' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'dela Cruz' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({ example: 'SecurePass123!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterRiderDto extends RegisterPassengerDto {
  @ApiProperty({ example: 'N01-12-345678' })
  @IsString()
  @IsNotEmpty()
  licenseNumber: string;
}
