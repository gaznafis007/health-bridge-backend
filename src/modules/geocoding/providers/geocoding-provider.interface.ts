import type { GeocodingResult } from '../types/geocoding.types';

export interface GeocodingProvider {
  search(query: string, limit: number): Promise<GeocodingResult[]>;
  reverse(lat: number, lng: number): Promise<GeocodingResult | null>;
  geocode(address: string): Promise<GeocodingResult | null>;
}
