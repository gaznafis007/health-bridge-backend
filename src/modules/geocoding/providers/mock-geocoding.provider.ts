import { Injectable } from '@nestjs/common';
import type { GeocodingProvider } from './geocoding-provider.interface';
import type { GeocodingResult } from '../types/geocoding.types';

const MOCK_PICKUP: GeocodingResult = {
  label: 'Dhanmondi, Dhaka, Bangladesh',
  lat: 23.7461,
  lng: 90.3742,
};

const MOCK_DESTINATION: GeocodingResult = {
  label: 'Gulshan, Dhaka, Bangladesh',
  lat: 23.7925,
  lng: 90.4078,
};

@Injectable()
export class MockGeocodingProvider implements GeocodingProvider {
  async search(query: string, limit: number): Promise<GeocodingResult[]> {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];

    const base = normalized.includes('gulshan') ? MOCK_DESTINATION : MOCK_PICKUP;
    const results: GeocodingResult[] = [
      { ...base, label: `${query}, Dhaka, Bangladesh` },
    ];

    if (limit > 1 && normalized.includes('dhaka')) {
      results.push({
        label: `${query} (alt), Dhaka, Bangladesh`,
        lat: base.lat + 0.01,
        lng: base.lng + 0.01,
      });
    }

    return results.slice(0, limit);
  }

  async reverse(lat: number, lng: number): Promise<GeocodingResult | null> {
    return {
      label: `Mock address at ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat,
      lng,
    };
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    const normalized = address.trim().toLowerCase();
    if (!normalized) return null;
    if (normalized.includes('notfound') || normalized.includes('invalid')) {
      return null;
    }
    if (normalized.includes('gulshan') || normalized.includes('destination')) {
      return { ...MOCK_DESTINATION, label: address };
    }
    return { ...MOCK_PICKUP, label: address };
  }
}
