import { addDays, dayOfWeek, daysBetween, formatTime, msUntilNextMidnight, parseTime, toDateKey } from '../dates';

describe('dates', () => {
  it('formats local dates as YYYY-MM-DD', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
  });

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
    expect(addDays('2026-03-07', 2)).toBe('2026-03-09');
    expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
  });

  it('counts days between keys', () => {
    expect(daysBetween('2026-09-20', '2026-09-26')).toBe(6);
    expect(daysBetween('2026-09-26', '2026-09-20')).toBe(-6);
  });

  it('knows the day of the week', () => {
    expect(dayOfWeek('2024-01-01')).toBe(1); // Monday
    expect(dayOfWeek('2024-01-07')).toBe(0); // Sunday
  });
});

describe('reminder times', () => {
  it('round-trips HH:MM', () => {
    expect(parseTime('20:00')).toEqual({ hour: 20, minute: 0 });
    expect(parseTime('7:05')).toEqual({ hour: 7, minute: 5 });
    expect(formatTime(7, 5)).toBe('07:05');
  });

  it('falls back to 20:00 for bad input', () => {
    expect(parseTime('25:00')).toEqual({ hour: 20, minute: 0 });
    expect(parseTime('soon')).toEqual({ hour: 20, minute: 0 });
  });
});

describe('msUntilNextMidnight', () => {
  it('counts down to the next local midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 8, 26, 23, 59, 0))).toBe(60_000);
    expect(msUntilNextMidnight(new Date(2026, 8, 26, 12, 0, 0))).toBe(12 * 3_600_000);
  });

  it('is a full day, not zero, exactly at midnight', () => {
    expect(msUntilNextMidnight(new Date(2026, 8, 27, 0, 0, 0))).toBe(24 * 3_600_000);
  });
});
