import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { MapsService } from './maps.service';

@ApiTags('maps')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'maps', version: '1' })
export class MapsController {
  constructor(private maps: MapsService) {}

  @Get('autocomplete')
  autocomplete(@Query('input') input: string, @Query('session') session?: string) {
    return this.maps.autocomplete(input, session);
  }

  @Get('geocode')
  geocode(@Query('address') address: string) {
    return this.maps.geocode(address);
  }

  @Get('reverse-geocode')
  reverseGeocode(@Query('lat') lat: number, @Query('lng') lng: number) {
    return this.maps.reverseGeocode(+lat, +lng);
  }

  @Get('directions')
  getDirections(
    @Query('originLat') oLat: number,
    @Query('originLng') oLng: number,
    @Query('destLat') dLat: number,
    @Query('destLng') dLng: number,
  ) {
    return this.maps.getDirections(+oLat, +oLng, +dLat, +dLng);
  }
}
