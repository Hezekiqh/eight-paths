import { dimOpacityByDimension, idleDaysByDimension, opacityForIdleDays } from '../dimming';
import { done } from './helpers';

describe('dimming', () => {
  it('maps idle days to opacity', () => {
    expect(opacityForIdleDays(0)).toBe(1);
    expect(opacityForIdleDays(2)).toBe(1);
    expect(opacityForIdleDays(3)).toBe(0.5);
    expect(opacityForIdleDays(6)).toBe(0.5);
    expect(opacityForIdleDays(7)).toBe(0.25);
    expect(opacityForIdleDays(30)).toBe(0.25);
  });

  it('counts never-completed dimensions from onboarding', () => {
    const idle = idleDaysByDimension([], '2026-09-20', '2026-09-26');
    expect(idle.social).toBe(6);
  });

  it('restores full brightness after one completion', () => {
    const since = '2026-09-01';
    expect(dimOpacityByDimension([], since, '2026-09-26').physical).toBe(0.25);
    expect(dimOpacityByDimension([done('2026-09-26')], since, '2026-09-26').physical).toBe(1);
    expect(dimOpacityByDimension([done('2026-09-22')], since, '2026-09-26').physical).toBe(0.5);
  });
});
