import { IsNumber, IsString, IsEnum, IsOptional, IsNotEmpty, Min, Max, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '@tamarrawgo/shared-types';

export class LocationDto {
  @ApiProperty() @IsString() @IsNotEmpty() address: string;
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) latitude: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) longitude: number;
  @ApiPropertyOptional() @IsString() @IsOptional() placeId?: string;
}

export class CreateBookingDto {
  @ApiProperty({ type: LocationDto }) @ValidateNested() @Type(() => LocationDto) pickup: LocationDto;
  @ApiProperty({ type: LocationDto }) @ValidateNested() @Type(() => LocationDto) dropoff: LocationDto;
  @ApiProperty({ enum: PaymentMethod }) @IsEnum(PaymentMethod) paymentMethod: PaymentMethod;
  @ApiPropertyOptional({ enum: ['RIDE', 'DELIVERY', 'PABILI'] }) @IsString() @IsOptional() bookingType?: 'RIDE' | 'DELIVERY' | 'PABILI';
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Min(1) @Max(4) passengerCount?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() promoCode?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() notes?: string;
  // Delivery fields
  @ApiPropertyOptional() @IsString() @IsOptional() packageDescription?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() recipientName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() recipientPhone?: string;
  // Pabili fields
  @ApiPropertyOptional() @IsString() @IsOptional() storeAddress?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() shoppingList?: string;
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Min(0) itemBudget?: number;
}

export class FareEstimateDto {
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) pickupLat: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) pickupLng: number;
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) dropoffLat: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) dropoffLng: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() @Min(1) @Max(4) passengerCount?: number;
  @ApiPropertyOptional() @IsString() @IsOptional() promoCode?: string;
}

export class CancelBookingDto {
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
}

export class RateRiderDto {
  @ApiProperty({ minimum: 1, maximum: 5 }) @IsNumber() @Min(1) @Max(5) score: number;
  @ApiPropertyOptional() @IsString() @IsOptional() comment?: string;
}
