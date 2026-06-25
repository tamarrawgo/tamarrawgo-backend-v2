import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty() @IsString() @IsNotEmpty() subject: string;
  @ApiProperty() @IsString() @IsNotEmpty() description: string;
}

export class ReplyTicketDto {
  @ApiProperty() @IsString() @IsNotEmpty() message: string;
}

export class CreateComplaintDto {
  @ApiProperty() @IsString() @IsNotEmpty() userType: string;
  @ApiProperty() @IsString() @IsNotEmpty() type: string;
  @ApiProperty() @IsString() @IsNotEmpty() details: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() reportedUserId?: string;
  @ApiProperty({ required: false }) @IsString() @IsOptional() bookingId?: string;
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

  async createComplaint(userId: string, dto: CreateComplaintDto) {
    return this.prisma.complaint.create({
      data: {
        userId,
        userType: dto.userType,
        type: dto.type,
        details: dto.details,
        reportedUserId: dto.reportedUserId ?? null,
        bookingId: dto.bookingId ?? null,
      },
    });
  }

  async getComplaints(userType?: string, page = 1, limit = 20) {
    const where = userType ? { userType } : {};
    const [data, total] = await Promise.all([
      this.prisma.complaint.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, phone: true, role: true } },
          reportedUser: { select: { firstName: true, lastName: true, phone: true, role: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.complaint.count({ where }),
    ]);
    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  async getComplaintsByUser(userId: string) {
    return this.prisma.complaint.findMany({
      where: { reportedUserId: userId },
      include: {
        user: { select: { firstName: true, lastName: true, phone: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReportedUsers(userType?: string, page = 1, limit = 20) {
    const where: any = { reportedUserId: { not: null } };
    if (userType) where.userType = userType;

    const grouped = await this.prisma.complaint.groupBy({
      by: ['reportedUserId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.complaint.groupBy({
      by: ['reportedUserId'],
      where,
    });

    const userIds = grouped.map((g) => g.reportedUserId).filter(Boolean) as string[];
    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true, phone: true, role: true, status: true },
    });

    const data = grouped.map((g) => {
      const user = users.find((u) => u.id === g.reportedUserId);
      return { reportedUserId: g.reportedUserId, count: g._count.id, user };
    });

    return { data, total: total.length, page, totalPages: Math.ceil(total.length / limit) };
  }

  async updateComplaintStatus(id: string, status: string, adminNotes?: string) {
    return this.prisma.complaint.update({
      where: { id },
      data: { status, ...(adminNotes ? { adminNotes } : {}) },
    });
  }
}
