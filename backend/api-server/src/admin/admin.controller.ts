import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
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

class UpdateUserDto {
  @ApiPropertyOptional() @IsString() @IsOptional() firstName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() lastName?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() email?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() city?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() barangay?: string;
}

class UpdateFareDto {
  @ApiPropertyOptional() @IsNumber() @IsOptional() baseFare?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() ratePerKm?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() ratePerMinute?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() minimumFare?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() peakSurge?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() nightSurge?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() deliveryBaseFare?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() deliveryRatePerKm?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() pabiliBaseFare?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() pabiliRatePerKm?: number;
  @ApiPropertyOptional() @IsNumber() @IsOptional() pabiliServiceFee?: number;
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

  @Get('revenue-stats')
  @ApiOperation({ summary: 'Revenue and commission stats (current vs previous)' })
  getRevenueStats() {
    return this.admin.getRevenueStats();
  }

  @Post('revenue-reset')
  @ApiOperation({ summary: 'Reset revenue and commission tracking' })
  resetRevenue() {
    return this.admin.resetRevenue();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  getUsers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string, @Query('city') city?: string) {
    return this.admin.getUsers(+page, +limit, search, city);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Admin edit user profile details' })
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto, @Request() req: any) {
    return this.admin.updateUserProfile(id, dto, req.user?.sub);
  }

  @Patch('users/:id/reset-password')
  @ApiOperation({ summary: 'Admin reset user password' })
  resetUserPassword(@Param('id') id: string, @Body() body: { newPassword: string }, @Request() req: any) {
    return this.admin.resetUserPassword(id, body.newPassword, req.user?.sub);
  }

  @Patch('users/:id/suspend')
  suspendUser(@Param('id') id: string, @Request() req: any) {
    return this.admin.suspendUser(id, req.user?.sub);
  }

  @Patch('users/:id/activate')
  activateUser(@Param('id') id: string, @Request() req: any) {
    return this.admin.activateUser(id, req.user?.sub);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Delete user from database' })
  deleteUser(@Param('id') id: string, @Request() req: any) {
    return this.admin.deleteUser(id, req.user?.sub);
  }

  @Post('riders/:id/topup')
  @ApiOperation({ summary: 'Add topup balance to rider wallet' })
  topupRider(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.admin.topupRiderWallet(id, body.amount);
  }

  @Get('topup-requests')
  @ApiOperation({ summary: 'List rider topup requests with optional status filter' })
  getTopupRequests(@Query('status') status?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.admin.getTopupRequests(status, +page, +limit);
  }

  @Patch('topup-requests/:id/approve')
  @ApiOperation({ summary: 'Approve a topup request and credit rider wallet' })
  approveTopupRequest(@Param('id') id: string, @Request() req: any) {
    return this.admin.approveTopupRequest(id, req.user?.sub);
  }

  @Patch('topup-requests/:id/reject')
  @ApiOperation({ summary: 'Reject a topup request' })
  rejectTopupRequest(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.admin.rejectTopupRequest(id, body.reason ?? '', req.user?.sub);
  }

  @Get('riders')
  @ApiOperation({ summary: 'Get all riders with optional search and city/barangay filter' })
  getAllRiders(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('search') search?: string,
    @Query('city') city?: string,
    @Query('barangay') barangay?: string,
  ) {
    return this.admin.getAllRiders(+page, +limit, search, city, barangay);
  }

  @Get('riders/pending')
  @ApiOperation({ summary: 'Get pending rider approvals' })
  getPendingRiders(@Query('page') page = 1, @Query('limit') limit = 20) {
    return this.admin.getPendingRiders(+page, +limit);
  }

  @Post('riders/:id/approve')
  approveRider(@Param('id') id: string, @Request() req: any) {
    return this.admin.approveRider(id, req.user?.sub);
  }

  @Post('riders/:id/reject')
  rejectRider(@Param('id') id: string, @Body() dto: RejectRiderDto, @Request() req: any) {
    return this.admin.rejectRider(id, dto.reason ?? '', req.user?.sub);
  }

  @Get('passengers/pending')
  @ApiOperation({ summary: 'Get pending passenger verifications' })
  getPendingPassengers(@Query('page') page = 1, @Query('limit') limit = 50) {
    return this.admin.getPendingPassengers(+page, +limit);
  }

  @Get('passengers')
  @ApiOperation({ summary: 'Get all passengers' })
  getAllPassengers(@Query('page') page = 1, @Query('limit') limit = 20, @Query('search') search?: string, @Query('verificationStatus') verificationStatus?: string) {
    return this.admin.getAllPassengers(+page, +limit, search, verificationStatus);
  }

  @Post('passengers/:id/approve')
  @ApiOperation({ summary: 'Approve passenger verification' })
  approvePassenger(@Param('id') id: string, @Request() req: any) {
    return this.admin.approvePassenger(id, req.user?.sub);
  }

  @Post('passengers/:id/reject')
  @ApiOperation({ summary: 'Reject passenger verification' })
  rejectPassenger(@Param('id') id: string, @Body() body: { reason?: string }, @Request() req: any) {
    return this.admin.rejectPassenger(id, body.reason ?? '', req.user?.sub);
  }

  @Get('trips')
  @ApiOperation({ summary: 'Monitor all trips' })
  getTrips(@Query('page') page = 1, @Query('limit') limit = 20, @Query('status') status?: string) {
    return this.admin.getTripMonitoring(+page, +limit, status);
  }

  @Patch('trips/:id/cancel')
  @ApiOperation({ summary: 'Admin cancel a trip' })
  cancelTrip(@Param('id') id: string, @Request() req: any) {
    return this.admin.cancelTrip(id, req.user?.sub);
  }

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get admin activity audit logs' })
  getAuditLogs(@Query('page') page = 1, @Query('limit') limit = 50, @Query('action') action?: string) {
    return this.admin.getAuditLogs(+page, +limit, action);
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

  @Get('complaints/reported-users')
  @ApiOperation({ summary: 'List reported users grouped by complaint count' })
  getReportedUsers(@Query('userType') userType?: string, @Query('page') page = 1, @Query('limit') limit = 20) {
    return this.support.getReportedUsers(userType, +page, +limit);
  }

  @Get('complaints/user/:userId')
  @ApiOperation({ summary: 'Get all complaints against a specific user' })
  getComplaintsByUser(@Param('userId') userId: string) {
    return this.support.getComplaintsByUser(userId);
  }

  @Patch('complaints/:id')
  @ApiOperation({ summary: 'Update complaint status' })
  updateComplaint(@Param('id') id: string, @Body() body: { status: string; adminNotes?: string }) {
    return this.support.updateComplaintStatus(id, body.status, body.adminNotes);
  }
}
