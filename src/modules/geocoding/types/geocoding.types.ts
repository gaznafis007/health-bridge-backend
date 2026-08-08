export interface GeocodingResult {
  label: string;
  lat: number;
  lng: number;
}

export interface GeocodingSearchResponse {
  results: GeocodingResult[];
}

export interface GeocodingReverseResponse {
  result: GeocodingResult | null;
}
