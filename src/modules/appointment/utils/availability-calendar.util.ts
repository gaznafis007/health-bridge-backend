import { DoctorAvailability } from '@prisma/client';
import {
  sameUtcCalendarDay,
  timeToMinutes,
  utcJsDayToPrismaDay,
} from './appointment-slot.util';

export function availabilityAppliesOnUtcDay(
  row: Pick<
    DoctorAvailability,
    'isRecurring' | 'dayOfWeek' | 'specificDate'
  >,
  utcMidnight: Date,
): boolean {
  if (row.isRecurring) {
    if (!row.dayOfWeek) {
      return false;
    }
    return row.dayOfWeek === utcJsDayToPrismaDay(utcMidnight);
  }
  if (!row.specificDate) {
    return false;
  }
  return sameUtcCalendarDay(row.specificDate, utcMidnight);
}

function availabilityWindowIntervalsOverlap(a: DoctorAvailability, b: DoctorAvailability): boolean {
  const as = timeToMinutes(a.startTime);
  const ae = timeToMinutes(a.endTime);
  const bs = timeToMinutes(b.startTime);
  const be = timeToMinutes(b.endTime);
  return as < be && bs < ae;
}

/**
 * Same health centre calendar rules that share at least one calendar day shape and overlapping clock ranges.
 */
export function availabilitiesOverlap(
  a: Pick<
    DoctorAvailability,
    | 'healthCenterId'
    | 'isRecurring'
    | 'dayOfWeek'
    | 'specificDate'
    | 'startTime'
    | 'endTime'
  >,
  b: typeof a,
): boolean {
  if (a.healthCenterId !== b.healthCenterId) {
    return false;
  }
  if (!availabilityWindowIntervalsOverlap(a as DoctorAvailability, b as DoctorAvailability)) {
    return false;
  }
  let sharesDayShape = false;
  if (a.isRecurring && b.isRecurring) {
    sharesDayShape = a.dayOfWeek === b.dayOfWeek;
  } else if (a.isRecurring && !b.isRecurring && b.specificDate) {
    sharesDayShape = a.dayOfWeek === utcJsDayToPrismaDay(b.specificDate);
  } else if (!a.isRecurring && b.isRecurring && a.specificDate) {
    sharesDayShape = b.dayOfWeek === utcJsDayToPrismaDay(a.specificDate);
  } else if (!a.isRecurring && !b.isRecurring && a.specificDate && b.specificDate) {
    sharesDayShape = sameUtcCalendarDay(a.specificDate, b.specificDate);
  }
  return sharesDayShape;
}
