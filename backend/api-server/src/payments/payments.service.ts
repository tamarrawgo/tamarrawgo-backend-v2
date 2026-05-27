import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async getPaymentHistory(userId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where: { passengerId: userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { booking: { select: { pickupAddress: true, dropoffAddress: true } } },
      }),
      this.prisma.payment.count({ where: { passengerId: userId } }),
    ]);
    return { data: payments, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getPaymentById(id: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { booking: true },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
