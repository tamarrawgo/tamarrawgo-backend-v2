import { Controller, Get, Put, Post, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { UpdateProfileDto, UpdateFcmTokenDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private users: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  getProfile(@CurrentUser() user: any) {
    return this.users.getProfile(user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Update user profile' })
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.users.updateProfile(user.id, dto);
  }

  @Put('fcm-token')
  @ApiOperation({ summary: 'Update FCM push notification token' })
  updateFcmToken(@CurrentUser() user: any, @Body() dto: UpdateFcmTokenDto) {
    return this.users.updateFcmToken(user.id, dto.fcmToken);
  }

  @Post('upload-photo')
  @ApiOperation({ summary: 'Upload profile photo' })
  uploadPhoto(@CurrentUser() user: any, @Body() body: { base64: string; fileName: string }) {
    return this.users.uploadProfilePhoto(user.id, body.base64, body.fileName);
  }

  @Get('trips')
  @ApiOperation({ summary: 'Get trip history' })
  getTripHistory(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.users.getTripHistory(user.id, +page, +limit);
  }
}
