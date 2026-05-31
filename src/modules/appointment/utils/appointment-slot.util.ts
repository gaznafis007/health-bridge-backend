import { DayOfWeek } from '@prisma/client';

const BY_JS_WEEKDAY: DayOfWeek[] = [
  DayOfWeek.SUNDAY,
  DayOfWeek.MONDAY,
  DayOfWeek.TUESDAY,
  DayOfWeek.WEDNESDAY,
  DayOfWeek.THURSDAY,
  DayOfWeek.FRIDAY,
  DayOfWeek.SATURDAY,
];

export function parseUtcDateOnly(ymd: string): Date {
  const parts = ymd.split('-').map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    throw new RangeError('Invalid date');
  }
  const [y, mo, d] = parts;
  return new Date(Date.UTC(y, mo - 1, d));
}

export function formatUtcDateYmd(date: Date): string {
  const y = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${y}-${month}-${day}`;
}

export function utcJsDayToPrismaDay(d: Date): DayOfWeek {
  return BY_JS_WEEKDAY[d.getUTCDay()]!;
}

export function sameUtcCalendarDay(specificDate: Date, utcDayStart: Date): boolean {
  return (
    specificDate.getUTCFullYear() === utcDayStart.getUTCFullYear() &&
    specificDate.getUTCMonth() === utcDayStart.getUTCMonth() &&
    specificDate.getUTCDate() === utcDayStart.getUTCDate()
  );
}

export function timeToMinutes(time: string): number {
  const [hStr, mStr] = time.split(':');
  if (
    !hStr ||
    !mStr ||
    hStr.length !== 2 ||
    mStr.length !== 2
  ) {
    throw new RangeError('Invalid time');
  }
  const h = Number(hStr);
  const mn = Number(mStr);
  if (
    Number.isNaN(h) ||
    Number.isNaN(mn) ||
    h < 0 ||
    h > 23 ||
    mn < 0 ||
    mn > 59
  ) {
    throw new RangeError('Invalid time');
  }
  return h * 60 + mn;
}

export function minutesToTime(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${`${h}`.padStart(2, '0')}:${`${m}`.padStart(2, '0')}`;
}

/**
 * Half-open placement: slot starts where `start + duration <= windowEnd`.
 */
export function generateSlotStartTimes(
  windowStartHHmm: string,
  windowEndHHmm: string,
  slotDurationMinutes: number,
): string[] {
  let cursor = timeToMinutes(windowStartHHmm);
  const endMin = timeToMinutes(windowEndHHmm);
  if (cursor >= endMin || slotDurationMinutes <= 0) {
    return [];
  }
  const slots: string[] = [];
  while (cursor + slotDurationMinutes <= endMin) {
    slots.push(minutesToTime(cursor));
    cursor += slotDurationMinutes;
  }
  return slots;
}

/** Move a UTC-calendar midnight forward by whole days (ignores irrelevant time components). */
export function addUtcCalendarDays(utcMidnight: Date, days: number): Date {
  const d = new Date(utcMidnight);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

export function intervalsOverlapMinuteRanges(
  aStartMin: number,
  aDurationMin: number,
  bStartMin: number,
  bDurationMin: number,
): boolean {
  const aEnd = aStartMin + aDurationMin;
  const bEnd = bStartMin + bDurationMin;
  return aStartMin < bEnd && bStartMin < aEnd;
}
