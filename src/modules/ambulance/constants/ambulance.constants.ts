import { AmbulanceBookingStatus } from '@prisma/client';

export const AMBULANCE_SWAGGER_TAG = 'Ambulance';

/** Radius (km) used when no explicit center-zone filter is applied. */
export const AMBULANCE_DEFAULT_SEARCH_RADIUS_KM = 50;

/** Idempotency TTL in seconds (24 h). */
export const AMBULANCE_IDEMPOTENCY_TTL_S = 86_400;

/** Redis TTL for latest location snapshot (seconds). */
export const AMBULANCE_LOCATION_TTL_S = 60;

/** SLA seconds before an unaccepted booking is considered stale. */
export const AMBULANCE_ACCEPT_SLA_S = 300; // 5 min

/**
 * Allowed state transitions per actor role.
 * Key = current status, value = set of statuses the transition may move to.
 * Driver controls most forward transitions; only ADMIN/DISPATCHER may cancel
 * once the booking is IN_TRANSIT.
 */
export const BOOKING_TRANSITIONS: Record<
  AmbulanceBookingStatus,
  AmbulanceBookingStatus[]
> = {
  REQUESTED:  [AmbulanceBookingStatus.ACCEPTED, AmbulanceBookingStatus.CANCELLED],
  ACCEPTED:   [AmbulanceBookingStatus.ARRIVED,  AmbulanceBookingStatus.CANCELLED],
  ARRIVED:    [AmbulanceBookingStatus.IN_TRANSIT],
  IN_TRANSIT: [AmbulanceBookingStatus.COMPLETED],
  COMPLETED:  [],
  CANCELLED:  [],
};

/** Statuses that are considered terminal (no further transitions). */
export const TERMINAL_STATUSES: AmbulanceBookingStatus[] = [
  AmbulanceBookingStatus.COMPLETED,
  AmbulanceBookingStatus.CANCELLED,
];

/** Base fare (BDT) used in linear fare estimation. */
export const FARE_BASE_BDT = 200;
/** Per-km rate (BDT). */
export const FARE_PER_KM_BDT = 20;
