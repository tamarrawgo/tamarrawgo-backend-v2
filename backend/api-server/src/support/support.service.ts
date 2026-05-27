import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty() @IsString() @IsNotEmpty() subject: string;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
}

export class ReplyTicketDto {
  @ApiProperty() @IsString() @IsNotEmpty() message: string;
}

@Injectable()
export class SupportService {
  constructor(private prisma: PrismaService) {}

  async createTicket(userId: string, dto: CreateTicketDto) {
    return this.prisma.supportTicket.create({
      data: { userId, subject: dto.subject, description: dto.description },
    });
  }

  async getTickets(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      include: { replies: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async replyToTicket(ticketId: string, authorId: string, message: string, isAdmin = false) {
    return this.prisma.supportReply.create({
      data: { ticketId, authorId, message, isAdmin },
    });
  }
}
