import {
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
});

describe('level curve', () => {
  it('needs 20 × L to go from L to L+1', () => {
    expect(xpToNextLevel(5)).toBe(100);
    expect(xpToNextLevel(10)).toBe(200);
  });

  it('starts every dimension at level 5 with 0 XP', () => {
    expect(levelFromXp(0)).toEqual({ level: 5, xpIntoLevel: 0, xpForNext: 100 });
  });

  it('levels up exactly at the threshold and carries XP over', () => {
    expect(levelFromXp(99).level).toBe(5);
    expect(levelFromXp(100)).toEqual({ level: 6, xpIntoLevel: 0, xpForNext: 120 });
    expect(levelFromXp(226)).toEqual({ level: 7, xpIntoLevel: 6, xpForNext: 140 });
  });

  it('takes 10 plain completions to reach level 6', () => {
    expect(levelFromXp(9 * 10).level).toBe(5);
    expect(levelFromXp(10 * 10).level).toBe(6);
  });

  it('scales the overall curve ×8', () => {
    expect(overallLevelFromXp(0)).toEqual({ level: 5, xpIntoLevel: 0, xpForNext: 800 });
    expect(overallLevelFromXp(799).level).toBe(5);
    expect(overallLevelFromXp(800)).toEqual({ level: 6, xpIntoLevel: 0, xpForNext: 960 });
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
    const gain = describeXpGain(40, 10);
    expect(gain.leveledUp).toBe(false);
    expect(gain.before.xpIntoLevel).toBe(40);
    expect(gain.after.xpIntoLevel).toBe(50);
  });

  it('reports a level-up with carry-over', () => {
    const gain = describeXpGain(95, 13);
    expect(gain.leveledUp).toBe(true);
    expect(gain.after).toEqual({ level: 6, xpIntoLevel: 8, xpForNext: 120 });
  });
});
