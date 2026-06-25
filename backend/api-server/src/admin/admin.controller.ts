import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { FareService } from '../fare/fare.service';
import { SupportService } from '../support/support.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UserRole } from '@tamarrawgo/shared-types';
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class RejectRiderDto {
  @ApiPropertyOptional() @IsString() @IsOptional() reason?: string;
}

class UpdateFareDto {
  @ApiPropertyOptional() @IsNumber() @IsOptional() baseFare?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() ratePerKm?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() ratePerMinute?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() minimumFare?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() peakSurge?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() nightSurge?: number;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(UserRole.ADMIN)
@Controller({ path: 'admin', version: '1' })
export class AdminController {
  constructor(private admin: AdminService, private fare: FareService, private support: SupportService) {}

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

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user from database' })
  deleteUser(@Param('id') id: string) {
    return this.admin.deleteUser(id);
  }

  @Post('riders/:id/topup')
  @ApiOperation({ summary: 'Add topup balance to rider wallet' })
  topupRider(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.admin.topupRiderWallet(id, body.amount);
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

  @Get('fare-config')
  @ApiOperation({ summary: 'Get active fare configuration' })
  getFareConfig() {
    return this.fare.getActiveFareConfig();
  }

  @Patch('fare-config')
  @ApiOperation({ summary: 'Update fare configuration' })
  updateFareConfig(@Body() dto: UpdateFareDto) {
    return this.fare.updateFareConfig(dto);
  }

  @Get('complaints')
  @ApiOperation({ summary: 'List complaints with optional userType filter' })
  getComplaints(@Query('userType') userType?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.support.getComplaints(userType, +page, +limit);
  }

  @Patch('complaints/:id')
  @ApiOperation({ summary: 'Update complaint status' })
  updateComplaint(@Param('id') id: string, @Body() body: { status: string; adminNotes?: string }) {
    return this.support.updateComplaintStatus(id, body.status, body.adminNotes);
  }
}
