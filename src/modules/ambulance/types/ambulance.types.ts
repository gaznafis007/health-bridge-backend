import { AmbulanceVehicleType } from '@prisma/client';

/** Represents a candidate ambulance scored by the dispatch algorithm. */
export type DispatchCandidate = {
  ambulanceId: string;
  driverId: string;
  vehicleType: AmbulanceVehicleType;
  healthCenterId: string;
  ambulanceLat: number;
  ambulanceLng: number;
  distanceKm: number;
  score: number;
};

/** Payload stored in Redis for the latest location snapshot. */
export type LiveLocationPayload = {
  lat: number;
  lng: number;
  accuracy: number | null;
  recordedAt: string; // ISO-8601
};

/** Paginated list response wrapper. */
export type PaginatedResult<T> = {
  items: T[];
  total: number;
  skip: number;
  take: number;
};
