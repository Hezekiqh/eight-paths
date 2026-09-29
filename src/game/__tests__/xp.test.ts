import {
  describeXpGain,
  levelFromXp,
  overallLevelFromXp,
  totalXp,
  xpByDimension,
  tasksToNextLevel,
  tasksToNextOverallLevel,
  xpForCompletion,
  xpToNextLevel,
} from '../xp';
import { done } from './helpers';

describe('xp per completion', () => {
  it('is 10 for a free player and 20 with Premium, whatever the class', () => {
    expect(xpForCompletion()).toBe(10);
    expect(xpForCompletion(0, 'premium')).toBe(20);
  });

  it('stops at 30 XP a Path a day, or 60 with Premium', () => {
    expect(xpForCompletion(20)).toBe(10);
    expect(xpForCompletion(30)).toBe(0);
    expect(xpForCompletion(40, 'premium')).toBe(20);
    expect(xpForCompletion(60, 'premium')).toBe(0);
  });

  it('lets a boost double the XP but never past the cap', () => {
    expect(xpForCompletion(0, 'free', true)).toBe(20);
    expect(xpForCompletion(20, 'free', true)).toBe(10);
    expect(xpForCompletion(40, 'premium', true)).toBe(20);
  });
});

describe('level curve', () => {
  it('levels quickly at the start: 1, 2, 3, 4, 5 tasks', () => {
    expect([5, 6, 7, 8, 9].map(tasksToNextLevel)).toEqual([1, 2, 3, 4, 5]);
  });

  it('then adds a task every two levels, settling at 10 from level 18', () => {
    expect([10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 50].map(tasksToNextLevel)).toEqual([
      6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 10, 10,
    ]);
  });

  it('turns tasks into XP at 10 each', () => {
    expect(xpToNextLevel(5)).toBe(10);
    expect(xpToNextLevel(9)).toBe(50);
    expect(xpToNextLevel(30)).toBe(100);
  });

  it('is gentler than the previous curve everywhere, so no existing level can drop', () => {
    const previous = (level: number) => Math.min(30 + 10 * (level - 5), 150);
    for (let level = 5; level <= 200; level += 1) {
      expect(xpToNextLevel(level)).toBeLessThanOrEqual(previous(level));
    }
  });

  it('starts every Path at level 5 with 0 XP', () => {
    expect(levelFromXp(0)).toEqual({ level: 5, xpIntoLevel: 0, xpForNext: 10 });
  });

  it('levels up on the very first task, then after 2 more, then 3', () => {
    expect(levelFromXp(10)).toEqual({ level: 6, xpIntoLevel: 0, xpForNext: 20 });
    expect(levelFromXp(20).level).toBe(6);
    expect(levelFromXp(30)).toEqual({ level: 7, xpIntoLevel: 0, xpForNext: 30 });
    expect(levelFromXp(60).level).toBe(8);
    expect(levelFromXp(150).level).toBe(10);
  });

  it('carries XP over past a level', () => {
    expect(levelFromXp(35)).toEqual({ level: 7, xpIntoLevel: 5, xpForNext: 30 });
  });
});

describe('overall level', () => {
  it('reaches level 100 after 365 tasks: about 90 days at 4 a day', () => {
    expect(overallLevelFromXp(3640).level).toBe(99);
    expect(overallLevelFromXp(3650)).toEqual({ level: 100, xpIntoLevel: 0, xpForNext: 60 });
  });

  it('steps from 2 to 5 tasks a level on the first climb', () => {
    expect([5, 14, 15, 39, 40, 69, 70, 99].map(tasksToNextOverallLevel)).toEqual([2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('climbs again after 100: 6 tasks, one more every 5 levels, up to 15', () => {
    expect([100, 104, 105, 110, 144, 145, 300].map(tasksToNextOverallLevel)).toEqual([6, 6, 7, 8, 14, 15, 15]);
  });

  it('is gentler than the previous overall curve, so no existing overall level drops', () => {
    const previous = (level: number) => Math.min(30 + 10 * (level - 5), 150) * 4;
    for (let level = 5; level <= 300; level += 1) {
      expect(tasksToNextOverallLevel(level) * 10).toBeLessThanOrEqual(previous(level));
    }
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
    // 40 XP is level 7 with 10 of 30; one more task makes it 20 of 30.
    const gain = describeXpGain(40, 10);
    expect(gain.leveledUp).toBe(false);
    expect(gain.before.xpIntoLevel).toBe(10);
    expect(gain.after.xpIntoLevel).toBe(20);
  });

  it('reports a level-up with carry-over', () => {
    // 25 XP is level 6 with 15 of 20; 13 more crosses into level 7 with 8 left over.
    const gain = describeXpGain(25, 13);
    expect(gain.leveledUp).toBe(true);
    expect(gain.after).toEqual({ level: 7, xpIntoLevel: 8, xpForNext: 30 });
  });
});
