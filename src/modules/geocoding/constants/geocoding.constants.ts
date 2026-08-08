export const GEOCODING_SWAGGER_TAG = 'Geocoding';

export const GEOCODING_PROVIDER = Symbol('GEOCODING_PROVIDER');

/** Default cache TTL for geocoding responses (24 h). */
export const GEOCODING_CACHE_TTL_S = Number(
  process.env.GEOCODING_CACHE_TTL_S ?? 86_400,
);

/** Request timeout to upstream geocoding provider (ms). */
export const GEOCODING_REQUEST_TIMEOUT_MS = 5_000;

/** Max autocomplete / search results per request. */
export const GEOCODING_DEFAULT_SEARCH_LIMIT = 5;
export const GEOCODING_MAX_SEARCH_LIMIT = 10;

/** Rate limits per user per minute. */
export const GEOCODING_SEARCH_RATE_LIMIT = 30;
export const GEOCODING_REVERSE_RATE_LIMIT = 60;
export const GEOCODING_GEOCODE_RATE_LIMIT = 30;

/** Bangladesh bounding envelope for coordinate validation. */
export const GEOCODING_BD_LAT_MIN = 20;
export const GEOCODING_BD_LAT_MAX = 27;
export const GEOCODING_BD_LNG_MIN = 88;
export const GEOCODING_BD_LNG_MAX = 93;

/** Max haversine drift (km) before server geocoded coords override client hints. */
export const GEOCODING_CLIENT_DRIFT_KM = Number(
  process.env.GEOCODING_CLIENT_DRIFT_KM ?? 2,
);
