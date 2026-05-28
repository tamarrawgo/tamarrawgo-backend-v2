import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@tamarrawgo/shared-types';
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class RejectRiderDto {
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private admin: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard analytics' })
  getDashboard() {
    return this.admin.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string) {
    return this.admin.getUsers(+page, +limit, search);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string) {
    return this.admin.suspendUser(id);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string) {
    return this.admin.activateUser(id);
  }

  @Get('riders/pending')
  @ApiOperation({ summary: 'Get pending rider approvals' })
  getPendingRiders(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.admin.getPendingRiders(+page, +limit);
  }

  @Post('riders/:id/approve')
  approveRider(@Param('id') id: string) {
    return this.admin.approveRider(id);
  }

  @Post('riders/:id/reject')
  rejectRider(@Param('id') id: string, @Body() dto: RejectRiderDto) {
    return this.admin.rejectRider(id, dto.reason ?? '');
  }

  @Get('trips')
  @ApiOperation({ summary: 'Monitor all trips' })
  getTrips(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return this.admin.getTripMonitoring(+page, +limit, status);
  }

  @Patch('trips/:id/cancel')
  @ApiOperation({ summary: 'Admin cancel a trip' })
  cancelTrip(@Param('id') id: string) {
    return this.admin.cancelTrip(id);
  }

  @Get('reports/revenue')
  @ApiOperation({ summary: 'Revenue report' })
  getRevenue(@Query('days') days = 30) {
    return this.admin.getRevenueReport(+days);
  }
}
