import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class MapsService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor(private config: ConfigService) {
    this.apiKey = config.get('GOOGLE_MAPS_API_KEY', '');
  }

  async autocomplete(input: string, sessionToken?: string) {
    if (!this.apiKey) return [];
    const { data } = await axios.get(`${this.baseUrl}/place/autocomplete/json`, {
      params: {
        input,
        key: this.apiKey,
        components: 'country:ph',
        sessiontoken: sessionToken,
      },
    });
    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new BadRequestException('Places API error: ' + data.status);
    }
    return data.predictions;
  }

  async geocode(address: string) {
    const { data } = await axios.get(`${this.baseUrl}/geocode/json`, {
      params: { address, key: this.apiKey, region: 'ph' },
    });
    if (!data.results.length) throw new BadRequestException('Address not found');
    const { lat, lng } = data.results[0].geometry.location;
    return { latitude: lat, longitude: lng, formattedAddress: data.results[0].formatted_address };
  }

  async reverseGeocode(latitude: number, longitude: number) {
    const { data } = await axios.get(`${this.baseUrl}/geocode/json`, {
      params: { latlng: `${latitude},${longitude}`, key: this.apiKey },
    });
    if (!data.results.length) throw new BadRequestException('Location not found');
    return { address: data.results[0].formatted_address };
  }

  async getDirections(originLat: number, originLng: number, destLat: number, destLng: number) {
    const { data } = await axios.get(`${this.baseUrl}/directions/json`, {
      params: {
        origin: `${originLat},${originLng}`,
        destination: `${destLat},${destLng}`,
        mode: 'driving',
        key: this.apiKey,
      },
    });
    if (data.status !== 'OK') throw new BadRequestException('Directions API error: ' + data.status);
    const leg = data.routes[0].legs[0];
    return {
      distanceKm: leg.distance.value / 1000,
      durationMinutes: Math.ceil(leg.duration.value / 60),
      distanceText: leg.distance.text,
      durationText: leg.duration.text,
      polyline: data.routes[0].overview_polyline.points,
    };
  }
}
