/** Calendar dates in query/body use `YYYY-MM-DD` (interpreted as UTC midnight). */
export const DATE_YMD_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/** Slot and availability window times `HH:mm` (24h, UTC-interpreted calendar day). */
export const APPOINTMENT_TIME_HH_MM_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Dashboard default: UTC dates `[from, from+N]` inclusive (N day-offsets beyond `from`).
 * Exclusive upper bound in queries uses `from + N + 1` midnights via `addUtcDays`.
 */
export const APPOINTMENT_DOCTOR_SCHEDULE_INCLUSIVE_DAY_TAIL = 7;

export const APPOINTMENTS_SWAGGER_TAG = 'appointments';
