import { monthName, monthOf, monthWeeks, shiftMonth } from '../calendar';

describe('calendar', () => {
  it('moves between months across years', () => {
    expect(shiftMonth('2026-09', 1)).toBe('2026-10');
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftMonth('2026-09', -21)).toBe('2024-12');
  });

  it('names months', () => {
    expect(monthName('2026-09')).toBe('September 2026');
    expect(monthOf('2026-09-27')).toBe('2026-09');
  });

  it('lays a month out in Sunday-first weeks', () => {
    // September 2026 starts on a Tuesday and has 30 days.
    const weeks = monthWeeks('2026-09');
    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toEqual([null, null, '2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05']);
    expect(weeks[4]).toEqual(['2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', null, null, null]);
    expect(weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('handles February in a leap year', () => {
    expect(monthWeeks('2028-02').flat().filter(Boolean)).toHaveLength(29);
  });
});
