import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, FareEstimateDto, CancelBookingDto, RateRiderDto } from './dto/booking.dto';
import { CurrentUser } from '../common/decorators/user.decorator';
import { BookingStatus, UserRole } from '@tamarrawgo/shared-types';

@ApiTags('bookings')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'bookings', version: '1' })
export class BookingsController {
  constructor(private bookings: BookingsService) {}

  @Post('estimate')
  @ApiOperation({ summary: 'Get fare estimate before booking' })
  @HttpCode(HttpStatus.OK)
  estimateFare(@Body() dto: FareEstimateDto) {
    return this.bookings.estimateFare(dto.pickupLat, dto.pickupLng, dto.dropoffLat, dto.dropoffLng, dto.promoCode);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new booking' })
  createBooking(@CurrentUser() user: any, @Body() dto: CreateBookingDto) {
    return this.bookings.createBooking(user.id, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my booking history' })
  getMyBookings(@CurrentUser() user: any) {
    return this.bookings.getMyBookings(user.id);
  }

  @Get('active')
  @ApiOperation({ summary: 'Get current active booking' })
  getActiveBooking(@CurrentUser() user: any) {
    return this.bookings.getActiveBooking(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  getBooking(@Param('id') id: string) {
    return this.bookings.getBookingById(id);
  }

  @Post(':id/accept')
  @ApiOperation({ summary: 'Rider accepts a booking' })
  @HttpCode(HttpStatus.OK)
  acceptBooking(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookings.acceptBooking(user.id, id);
  }

  @Patch(':id/arrived')
  @ApiOperation({ summary: 'Rider marks arrival at pickup' })
  arrivedAtPickup(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookings.updateBookingStatus(user.id, id, BookingStatus.RIDER_ARRIVED, true);
  }

  @Patch(':id/start')
  @ApiOperation({ summary: 'Rider starts the trip' })
  startTrip(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookings.updateBookingStatus(user.id, id, BookingStatus.IN_PROGRESS, true);
  }

  @Patch(':id/complete')
  @ApiOperation({ summary: 'Rider completes the trip' })
  completeTrip(@CurrentUser() user: any, @Param('id') id: string) {
    return this.bookings.updateBookingStatus(user.id, id, BookingStatus.COMPLETED, true);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel a booking' })
  cancelBooking(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: CancelBookingDto) {
    return this.bookings.cancelBooking(user.id, id, dto, user.role === UserRole.RIDER);
  }

  @Post(':id/rate')
  @ApiOperation({ summary: 'Rate the rider after trip' })
  rateRider(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: RateRiderDto) {
    return this.bookings.rateRider(user.id, id, dto);
  }
}
