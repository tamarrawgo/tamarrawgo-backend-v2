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

  @ApiProperty({ example: 'ABC 1234' })
  @IsString()
  @IsNotEmpty()
  plateNumber: string;

  @ApiPropertyOptional({ example: 'Honda' })
  @IsString()
  @IsOptional()
  vehicleBrand?: string;

  @ApiPropertyOptional({ example: 'TMX 155' })
  @IsString()
  @IsOptional()
  vehicleModel?: string;

  @ApiPropertyOptional({ example: 'Red' })
  @IsString()
  @IsOptional()
  vehicleColor?: string;

  @ApiPropertyOptional({ example: 'Calapan City' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Canubing I' })
  @IsString()
  @IsOptional()
  barangay?: string;
}
