import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsEnum, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PromoType } from '@tamarrawgo/shared-types';

export class CreatePromoDto {
  @ApiProperty() @IsString() code: string;
  @ApiProperty({ enum: PromoType }) @IsEnum(PromoType) type: PromoType;
  @ApiProperty() @IsNumber() @Min(0) value: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() minFare?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() maxDiscount?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() usageLimit?: number;
  @ApiProperty() @IsDateString() startsAt: string;
  @ApiProperty() @IsDateString() expiresAt: string;
}

@Injectable()
export class PromotionsService {
  constructor(private prisma: PrismaService) {}

  async validatePromo(code: string, userId: string, fare: number) {
    const promo = await this.prisma.promotion.findUnique({ where: { code: code.toUpperCase() } });
    if (!promo) throw new NotFoundException('Invalid promo code');
    if (!promo.isActive) throw new BadRequestException('Promo code is inactive');
    if (new Date() < promo.startsAt) throw new BadRequestException('Promo not yet active');
    if (new Date() > promo.expiresAt) throw new BadRequestException('Promo code has expired');
    if (promo.usageLimit && promo.usageCount >= promo.usageLimit) {
      throw new BadRequestException('Promo code usage limit reached');
    }
    if (promo.minFare && fare < Number(promo.minFare)) {
      throw new BadRequestException(`Minimum fare of ₱${promo.minFare} required`);
    }

    const userUsage = await this.prisma.promoUsage.count({ where: { promoId: promo.id, userId } });
    if (userUsage >= promo.userLimit) throw new BadRequestException('You have already used this promo');

    let discount = promo.type === 'PERCENTAGE' ? fare * (Number(promo.value) / 100) : Number(promo.value);
    if (promo.maxDiscount) discount = Math.min(discount, Number(promo.maxDiscount));

    return { promoId: promo.id, discount, code: promo.code };
  }

  async createPromo(dto: CreatePromoDto) {
    return this.prisma.promotion.create({
      data: {
        code: dto.code.toUpperCase(),
        type: dto.type,
        value: dto.value,
        minFare: dto.minFare,
        maxDiscount: dto.maxDiscount,
        usageLimit: dto.usageLimit,
        startsAt: new Date(dto.startsAt),
        expiresAt: new Date(dto.expiresAt),
      },
    });
  }

  async getAllPromos(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [promos, total] = await Promise.all([
      this.prisma.promotion.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.promotion.count(),
    ]);
    return { data: promos, total, page, limit };
  }
}
