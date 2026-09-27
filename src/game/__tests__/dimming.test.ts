import { dimOpacityByDimension, missedDaysByDimension, opacityForMissedDays } from '../dimming';
import { done, quest } from './helpers';

const today = '2026-09-26'; // Saturday
const daily = quest({ createdAt: '2026-09-01T12:00:00' });
const monWedFri = quest({ id: 'mwf', repeatDays: [1, 3, 5], createdAt: '2026-09-01T12:00:00' });

describe('dimming', () => {
  it('maps missed scheduled days to opacity', () => {
    expect(opacityForMissedDays(0)).toBe(1);
    expect(opacityForMissedDays(2)).toBe(1);
    expect(opacityForMissedDays(3)).toBe(0.5);
    expect(opacityForMissedDays(6)).toBe(0.5);
    expect(opacityForMissedDays(7)).toBe(0.25);
    expect(opacityForMissedDays(30)).toBe(0.25);
  });

  it('counts missed days of a daily quest since the last completion', () => {
    expect(missedDaysByDimension([daily], [done('2026-09-22')], [], today).physical).toBe(3);
    expect(dimOpacityByDimension([daily], [done('2026-09-22')], [], today).physical).toBe(0.5);
    expect(dimOpacityByDimension([daily], [], [], today).physical).toBe(0.25);
  });

  it('never dims a Path kept up on its own schedule', () => {
    // Mon/Wed/Fri, last done Friday 25th: the weekend isn't a miss.
    const cs = [done('2026-09-21', 'physical', 'mwf'), done('2026-09-23', 'physical', 'mwf'), done('2026-09-25', 'physical', 'mwf')];
    expect(missedDaysByDimension([monWedFri], cs, [], '2026-09-28').physical).toBe(0);
    expect(dimOpacityByDimension([monWedFri], cs, [], '2026-09-28').physical).toBe(1);
  });

  it('only counts scheduled days as missed', () => {
    // Last done Mon 14th; missed Wed 16, Fri 18, Mon 21, Wed 23, Fri 25.
    const cs = [done('2026-09-14', 'physical', 'mwf')];
    expect(missedDaysByDimension([monWedFri], cs, [], today).physical).toBe(5);
  });

  it("doesn't dim Paths without quests", () => {
    expect(dimOpacityByDimension([daily], [], [], today).social).toBe(1);
  });

  it('excuses rest days and restores full brightness after one completion', () => {
    const rest = ['2026-09-23', '2026-09-24', '2026-09-25'].map((date) => ({ date, dimension: 'all' as const }));
    expect(missedDaysByDimension([daily], [done('2026-09-22')], rest, today).physical).toBe(0);
    expect(dimOpacityByDimension([daily], [done(today)], [], today).physical).toBe(1);
  });
});
