import { Controller, Post, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RidersService } from './riders.service';
import { UpdateLocationDto, UpdateOnlineStatusDto, AddVehicleDto, UploadDocumentDto } from './dto/rider.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@tamarrawgo/shared-types';

@ApiTags('riders')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller({ path: 'riders', version: '1' })
export class RidersController {
  constructor(private riders: RidersService) {}

  @Post('location')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Update rider GPS location' })
  updateLocation(@CurrentUser() user: any, @Body() dto: UpdateLocationDto) {
    return this.riders.updateLocation(user.id, dto);
  }

  @Post('status')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Set online/offline status' })
  updateStatus(@CurrentUser() user: any, @Body() dto: UpdateOnlineStatusDto) {
    return this.riders.updateStatus(user.id, dto);
  }

  @Post('vehicle')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Add or update vehicle info' })
  addVehicle(@CurrentUser() user: any, @Body() dto: AddVehicleDto) {
    return this.riders.addVehicle(user.id, dto);
  }

  @Post('documents')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Upload rider document' })
  uploadDocument(@CurrentUser() user: any, @Body() dto: UploadDocumentDto) {
    return this.riders.uploadDocument(user.id, dto);
  }

  @Get('earnings')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Get rider earnings summary' })
  getEarnings(@CurrentUser() user: any) {
    return this.riders.getEarnings(user.id);
  }

  @Get('trips')
  @Roles(UserRole.RIDER)
  @ApiOperation({ summary: 'Get rider trip history' })
  getTrips(@CurrentUser() user: any, @Query('page') page = 1, @Query('limit') limit = 10) {
    return this.riders.getTrips(user.id, +page, +limit);
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Get nearby available riders' })
  getNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius = 5,
  ) {
    return this.riders.getNearbyRiders(+lat, +lng, +radius);
  }
}
