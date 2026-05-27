import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { SupportService, CreateTicketDto, ReplyTicketDto } from './support.service';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('support')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'support', version: '1' })
export class SupportController {
  constructor(private support: SupportService) {}

  @Post('tickets')
  createTicket(@CurrentUser() user: any, @Body() dto: CreateTicketDto) {
    return this.support.createTicket(user.id, dto);
  }

  @Get('tickets')
  getTickets(@CurrentUser() user: any) {
    return this.support.getTickets(user.id);
  }

  @Post('tickets/:id/reply')
  reply(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: ReplyTicketDto) {
    return this.support.replyToTicket(id, user.id, dto.message);
  }
}
