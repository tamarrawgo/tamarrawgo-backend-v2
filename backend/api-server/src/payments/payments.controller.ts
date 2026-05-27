import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { PaymentsService } from './payments.service';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('payments')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'payments', version: '1' })
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @Get('history')
  getHistory(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.payments.getPaymentHistory(user.id, +page, +limit);
  }

  @Get(':id')
  getPayment(@Param('id') id: string) {
    return this.payments.getPaymentById(id);
  }
}
