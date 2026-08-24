import { TelehealthStatus } from '@prisma/client';

export const TELEHEALTH_SWAGGER_TAG = 'Telehealth';

export const TELEHEALTH_VIDEO_PROVIDER = Symbol('TELEHEALTH_VIDEO_PROVIDER');

/** Overall search window for finding a doctor (3 minutes). */
export const TELEHEALTH_SEARCH_WINDOW_MS = 180_000;

/** TTL for a single offer to one doctor (45 seconds). */
export const TELEHEALTH_OFFER_TTL_MS = 45_000;

/** Delay between queue reconciliation retries (10 seconds). */
export const TELEHEALTH_SEARCH_RETRY_MS = 10_000;

/** Heartbeat TTL — ONLINE only counts while this is fresh (60 seconds). */
export const TELEHEALTH_PRESENCE_TTL_S = 60;

/** Max offers before marking request as MISSED. */
export const TELEHEALTH_MAX_OFFERS = 20;

/** Idempotency TTL for request creation (24 h). */
export const TELEHEALTH_IDEMPOTENCY_TTL_S = 86_400;

/** Join token TTL (10 minutes). */
export const TELEHEALTH_JOIN_TOKEN_TTL_S = 600;

/** Valid status transitions. */
export const TELEHEALTH_TRANSITIONS: Record<TelehealthStatus, TelehealthStatus[]> = {
  [TelehealthStatus.REQUESTED]: [
    TelehealthStatus.ACCEPTED,
    TelehealthStatus.CANCELLED,
    TelehealthStatus.MISSED,
  ],
  [TelehealthStatus.ACCEPTED]: [
    TelehealthStatus.DOCTOR_JOINED,
    TelehealthStatus.CANCELLED,
    TelehealthStatus.MISSED,
  ],
  [TelehealthStatus.DOCTOR_JOINED]: [
    TelehealthStatus.PATIENT_JOINED,
    TelehealthStatus.ACTIVE,
    TelehealthStatus.CANCELLED,
  ],
  [TelehealthStatus.PATIENT_JOINED]: [
    TelehealthStatus.ACTIVE,
    TelehealthStatus.CANCELLED,
  ],
  [TelehealthStatus.ACTIVE]: [TelehealthStatus.COMPLETED, TelehealthStatus.CANCELLED],
  [TelehealthStatus.COMPLETED]: [],
  [TelehealthStatus.CANCELLED]: [],
  [TelehealthStatus.MISSED]: [],
};

export const TELEHEALTH_TERMINAL_STATUSES: TelehealthStatus[] = [
  TelehealthStatus.COMPLETED,
  TelehealthStatus.CANCELLED,
  TelehealthStatus.MISSED,
];
