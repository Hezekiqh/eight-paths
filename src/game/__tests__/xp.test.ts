import {
  OVERALL_SCALE,
  describeXpGain,
  levelFromXp,
  overallLevelFromXp,
  totalXp,
  xpByDimension,
  xpForCompletion,
  xpToNextLevel,
} from '../xp';
import { done } from './helpers';

describe('xp per completion', () => {
  it('is 10 outside the class dimension', () => {
    expect(xpForCompletion('physical', 'intellectual')).toBe(10);
  });

  it('is 13 in the class dimension (10 × 1.25 rounded up)', () => {
    expect(xpForCompletion('intellectual', 'intellectual')).toBe(13);
  });

  it('halves after three completions in the same Path on the same day', () => {
    expect(xpForCompletion('physical', 'intellectual', 2)).toBe(10);
    expect(xpForCompletion('physical', 'intellectual', 3)).toBe(5);
    expect(xpForCompletion('intellectual', 'intellectual', 5)).toBe(7);
  });
});

describe('level curve', () => {
  it('needs 30 XP at level 5, 10 more per level, capped at 150', () => {
    expect(xpToNextLevel(5)).toBe(30);
    expect(xpToNextLevel(6)).toBe(40);
    expect(xpToNextLevel(10)).toBe(80);
    expect(xpToNextLevel(17)).toBe(150);
    expect(xpToNextLevel(40)).toBe(150);
  });

  it('is never steeper than the 1.0 curve, so no existing level can drop', () => {
    for (let level = 5; level <= 200; level += 1) {
      expect(xpToNextLevel(level)).toBeLessThanOrEqual(20 * level);
      expect(xpToNextLevel(level, OVERALL_SCALE)).toBeLessThanOrEqual(20 * level * 8);
    }
  });

  it('starts every dimension at level 5 with 0 XP', () => {
    expect(levelFromXp(0)).toEqual({ level: 5, xpIntoLevel: 0, xpForNext: 30 });
  });

  it('levels up exactly at the threshold and carries XP over', () => {
    expect(levelFromXp(29).level).toBe(5);
    expect(levelFromXp(30)).toEqual({ level: 6, xpIntoLevel: 0, xpForNext: 40 });
    expect(levelFromXp(76)).toEqual({ level: 7, xpIntoLevel: 6, xpForNext: 50 });
  });

  it('gives a first level-up after three completions', () => {
    expect(levelFromXp(2 * 10).level).toBe(5);
    expect(levelFromXp(3 * 10).level).toBe(6);
  });

  it('scales the overall curve ×4', () => {
    expect(overallLevelFromXp(0)).toEqual({ level: 5, xpIntoLevel: 0, xpForNext: 120 });
    expect(overallLevelFromXp(119).level).toBe(5);
    expect(overallLevelFromXp(120)).toEqual({ level: 6, xpIntoLevel: 0, xpForNext: 160 });
  });
});

describe('xp totals', () => {
  it('sums per dimension and overall', () => {
    const cs = [done('2026-09-01', 'physical'), done('2026-09-02', 'social', 'q2', 13)];
    expect(xpByDimension(cs).physical).toBe(10);
    expect(xpByDimension(cs).social).toBe(13);
    expect(xpByDimension(cs).financial).toBe(0);
    expect(totalXp(cs)).toBe(23);
  });
});

describe('describeXpGain', () => {
  it('reports a plain fill', () => {
    const gain = describeXpGain(10, 10);
    expect(gain.leveledUp).toBe(false);
    expect(gain.before.xpIntoLevel).toBe(10);
    expect(gain.after.xpIntoLevel).toBe(20);
  });

  it('reports a level-up with carry-over', () => {
    const gain = describeXpGain(25, 13);
    expect(gain.leveledUp).toBe(true);
    expect(gain.after).toEqual({ level: 6, xpIntoLevel: 8, xpForNext: 40 });
  });
});
