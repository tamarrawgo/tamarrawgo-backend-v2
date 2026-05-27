import { IsNumber, IsEnum, IsString, IsOptional, Min, Max, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OnlineStatus } from '@tamarrawgo/shared-types';

export class UpdateLocationDto {
  @ApiProperty() @IsNumber() @Min(-90) @Max(90) latitude: number;
  @ApiProperty() @IsNumber() @Min(-180) @Max(180) longitude: number;
  @ApiProperty() @IsNumber() @Min(0) @Max(360) heading: number;
  @ApiProperty() @IsNumber() @Min(0) speed: number;
}

export class UpdateOnlineStatusDto {
  @ApiProperty({ enum: OnlineStatus }) @IsEnum(OnlineStatus) status: OnlineStatus;
}

export class AddVehicleDto {
  @ApiProperty() @IsString() @IsNotEmpty() plateNumber: string;
  @ApiProperty() @IsString() @IsNotEmpty() brand: string;
  @ApiProperty() @IsString() @IsNotEmpty() model: string;
  @ApiProperty() @IsNumber() @Min(2000) year: number;
  @ApiProperty() @IsString() @IsNotEmpty() color: string;
}

export class UploadDocumentDto {
  @ApiProperty() @IsString() @IsNotEmpty() type: string;
  @ApiProperty() @IsString() @IsNotEmpty() fileUrl: string;
}
