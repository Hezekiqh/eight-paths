import { DIMENSIONS } from '../types';
import { radarData } from '../radar';
import { done } from './helpers';

const today = '2026-09-26';

describe('radarData', () => {
  it('draws an even octagon for all-time with no XP', () => {
    const r = radarData([], 'all', today);
    for (const d of DIMENSIONS) expect(r.current[d]).toBe(1);
    expect(r.ghost).toBeNull();
  });

  it('scales all-time shares so the largest touches the ring', () => {
    const cs = [done(today, 'physical'), done(today, 'physical', 'q2'), done(today, 'social', 'q3')];
    const r = radarData(cs, 'all', today);
    expect(r.current.physical).toBe(1);
    expect(r.current.social).toBe(0.5);
    expect(r.current.financial).toBe(0);
  });

  it('uses a 70 XP minimum ring for Week so one completion never fills it', () => {
    const r = radarData([done(today)], 'week', today);
    expect(r.outerRingXp).toBe(70);
    expect(r.current.physical).toBeCloseTo(10 / 70);
  });

  it('grows the ring to the top dimension', () => {
    const cs = Array.from({ length: 10 }, (_, i) => done(today, 'physical', `q${i}`));
    const r = radarData(cs, 'week', today);
    expect(r.outerRingXp).toBe(100);
    expect(r.current.physical).toBe(1);
  });

  it('draws the previous window as a ghost', () => {
    const cs = [done(today), done('2026-09-20'), done('2026-09-19', 'social'), done('2026-09-12', 'social')];
    const r = radarData(cs, 'week', today);
    expect(r.xp.physical).toBe(20); // 20th–26th window
    expect(r.ghost?.social).toBeCloseTo(10 / 70); // 13th–19th window
  });

  it('uses 30-day windows and a 300 XP ring for Month', () => {
    const cs = [done('2026-08-28'), done('2026-08-27', 'social')];
    const r = radarData(cs, 'month', today);
    expect(r.outerRingXp).toBe(300);
    expect(r.xp.physical).toBe(10);
    expect(r.xp.social).toBe(0);
    expect(r.ghost?.social).toBeCloseTo(10 / 300);
  });
});
