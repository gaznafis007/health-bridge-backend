import { DayOfWeek } from '@prisma/client';
import { availabilitiesOverlap } from './availability-calendar.util';

describe('availability-calendar.util', () => {
  const baseHc = '00000000-0000-0000-0000-000000000001';

  it('flags overlapping recurring same weekday/time', () => {
    expect(
      availabilitiesOverlap(
        {
          healthCenterId: baseHc,
          isRecurring: true,
          dayOfWeek: DayOfWeek.MONDAY,
          specificDate: null,
          startTime: '09:00',
          endTime: '12:00',
        },
        {
          healthCenterId: baseHc,
          isRecurring: true,
          dayOfWeek: DayOfWeek.MONDAY,
          specificDate: null,
          startTime: '11:00',
          endTime: '13:00',
        },
      ),
    ).toBe(true);
  });

  it('ignores disjoint days', () => {
    expect(
      availabilitiesOverlap(
        {
          healthCenterId: baseHc,
          isRecurring: true,
          dayOfWeek: DayOfWeek.TUESDAY,
          specificDate: null,
          startTime: '09:00',
          endTime: '12:00',
        },
        {
          healthCenterId: baseHc,
          isRecurring: true,
          dayOfWeek: DayOfWeek.WEDNESDAY,
          specificDate: null,
          startTime: '09:30',
          endTime: '10:30',
        },
      ),
    ).toBe(false);
  });

  it('ignores distinct health centres even if clocks overlap', () => {
    expect(
      availabilitiesOverlap(
        {
          healthCenterId: '00000000-0000-0000-0000-000000000001',
          isRecurring: true,
          dayOfWeek: DayOfWeek.FRIDAY,
          specificDate: null,
          startTime: '09:00',
          endTime: '12:00',
        },
        {
          healthCenterId: '00000000-0000-0000-0000-000000000002',
          isRecurring: true,
          dayOfWeek: DayOfWeek.FRIDAY,
          specificDate: null,
          startTime: '10:00',
          endTime: '11:00',
        },
      ),
    ).toBe(false);
  });
});
