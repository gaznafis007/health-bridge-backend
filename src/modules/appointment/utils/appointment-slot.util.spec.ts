import { DayOfWeek } from '@prisma/client';
import {
  addUtcCalendarDays,
  formatUtcDateYmd,
  generateSlotStartTimes,
  intervalsOverlapMinuteRanges,
  parseUtcDateOnly,
  sameUtcCalendarDay,
  timeToMinutes,
  utcJsDayToPrismaDay,
} from './appointment-slot.util';

describe('appointment-slot.util', () => {
  describe('parseUtcDateOnly', () => {
    it('parses UTC midnight', () => {
      const d = parseUtcDateOnly('2026-05-01');
      expect(d.toISOString()).toBe('2026-05-01T00:00:00.000Z');
    });
  });

  describe('generateSlotStartTimes', () => {
    it('respects duration and exclusivity', () => {
      expect(generateSlotStartTimes('09:00', '09:40', 20)).toEqual([
        '09:00',
        '09:20',
      ]);
      expect(generateSlotStartTimes('09:00', '09:00', 30)).toEqual([]);
      expect(generateSlotStartTimes('22:45', '23:45', 30)).toEqual([
        '22:45',
        '23:15',
      ]);
    });
  });

  describe('intervalsOverlapMinuteRanges', () => {
    it('detects overlaps', () => {
      expect(intervalsOverlapMinuteRanges(540, 20, 550, 20)).toBe(true);
      expect(intervalsOverlapMinuteRanges(540, 15, 555, 20)).toBe(false);
      expect(intervalsOverlapMinuteRanges(560, 5, 555, 20)).toBe(true);
    });
  });

  describe('sameUtcCalendarDay', () => {
    it('compares UTC calendar slices', () => {
      expect(
        sameUtcCalendarDay(
          parseUtcDateOnly('2026-01-07'),
          new Date(Date.UTC(2026, 0, 7, 12)),
        ),
      ).toBe(true);
    });
  });

  describe('calendar math', () => {
    it('addUtcCalendarDays rolls forward UTC date', () => {
      const a = parseUtcDateOnly('2026-06-01');
      const b = addUtcCalendarDays(a, 7);
      expect(formatUtcDateYmd(b)).toBe('2026-06-08');
    });
  });

  describe('timeToMinutes', () => {
    it('parses padded HH:mm', () => {
      expect(timeToMinutes('00:00')).toBe(0);
      expect(timeToMinutes('09:07')).toBe(547);
    });

    it('rejects malformed', () => {
      expect(() => timeToMinutes('9:07')).toThrow(RangeError);
    });
  });
  describe('utcJsDayToPrismaDay', () => {
    it('maps UTC Sunday', () => {
      const sun = parseUtcDateOnly('2026-05-03');
      expect(utcJsDayToPrismaDay(sun)).toBe(DayOfWeek.SUNDAY);
    });
  });
});

