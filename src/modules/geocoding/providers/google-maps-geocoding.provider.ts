import {
  BadGatewayException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { GeocodingProvider } from './geocoding-provider.interface';
import type { GeocodingResult } from '../types/geocoding.types';
import { GEOCODING_REQUEST_TIMEOUT_MS } from '../constants/geocoding.constants';

interface GoogleGeocodeResponse {
  status: string;
  results?: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
  }>;
}

@Injectable()
export class GoogleMapsGeocodingProvider implements GeocodingProvider {
  private readonly logger = new Logger(GoogleMapsGeocodingProvider.name);
  private readonly apiKey: string;

  constructor() {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      throw new Error('GOOGLE_MAPS_API_KEY is required for GoogleMapsGeocodingProvider');
    }
    this.apiKey = key;
  }

  async search(query: string, limit: number): Promise<GeocodingResult[]> {
    const result = await this.geocode(query);
    return result ? [result].slice(0, limit) : [];
  }

  async reverse(lat: number, lng: number): Promise<GeocodingResult | null> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('language', 'en');
    url.searchParams.set('region', 'bd');

    const data = await this.fetchJson<GoogleGeocodeResponse>(url);
    const first = data.results?.[0];
    if (!first) return null;

    return {
      label: first.formatted_address,
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
    };
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('language', 'en');
    url.searchParams.set('region', 'bd');
    url.searchParams.set('components', 'country:BD');

    const data = await this.fetchJson<GoogleGeocodeResponse>(url);
    const first = data.results?.[0];
    if (!first) return null;

    return {
      label: first.formatted_address,
      lat: first.geometry.location.lat,
      lng: first.geometry.location.lng,
    };
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(GEOCODING_REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        this.logger.warn(`Google geocoding HTTP ${response.status}`);
        throw new BadGatewayException('Geocoding provider returned an invalid response');
      }

      const data = (await response.json()) as T & { status?: string };

      if (data.status === 'OVER_QUERY_LIMIT' || data.status === 'RESOURCE_EXHAUSTED') {
        throw new ServiceUnavailableException('Geocoding service is temporarily unavailable');
      }

      if (data.status === 'REQUEST_DENIED' || data.status === 'INVALID_REQUEST') {
        this.logger.error(`Google geocoding status: ${data.status}`);
        throw new BadGatewayException('Geocoding provider configuration error');
      }

      return data;
    } catch (error) {
      if (
        error instanceof BadGatewayException ||
        error instanceof ServiceUnavailableException
      ) {
        throw error;
      }
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new ServiceUnavailableException('Geocoding request timed out');
      }
      this.logger.warn(`Google geocoding fetch failed: ${String(error)}`);
      throw new ServiceUnavailableException('Geocoding service is temporarily unavailable');
    }
  }
}
