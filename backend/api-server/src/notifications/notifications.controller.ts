import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'notifications', version: '1' })
export class NotificationsController {
  constructor(private notifications: NotificationsService) {}

  @Get()
  getNotifications(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.notifications.getNotifications(user.id, +page, +limit);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notifications.markAsRead(id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: any) {
    return this.notifications.markAllRead(user.id);
  }
}
