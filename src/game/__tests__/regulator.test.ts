import {
  CLEAN_DAY_BONUS,
  DAILY_DRAIN_CAP,
  DAILY_RESTORE_CAP,
  DEFAULT_STIMULI,
  MAX_HP,
  cleanStreaks,
  dayDrain,
  hpEvents,
  HP_PER_HABIT,
  localTime,
  POTION_TO,
  REGEN_PER_HOUR,
  simulateHp,
  hpTone,
  rawDrain,
  stimulusCost,
  surveyDue,
  type Stimulus,
} from '../regulator';

const byId = (id: string) => DEFAULT_STIMULI.find((s) => s.id === id)!;
const sugar = byId('sugar');
const adult = byId('adult');
const betting = byId('betting');
const nicotine = byId('nicotine');
const shortVideo = byId('short-video');

describe('costs', () => {
  it('costs severity × 2', () => {
    expect(DEFAULT_STIMULI.map((s) => stimulusCost(s.severity))).toEqual([20, 18, 16, 14, 14, 12, 12, 8, 6]);
  });

  it('counts any yes once in Easy mode, and times in Hard mode', () => {
    const report = { sugar: 3, 'short-video': 1 };
    expect(rawDrain(report, [sugar, shortVideo], 'easy')).toBe(6 + 14);
    expect(rawDrain(report, [sugar, shortVideo], 'hard')).toBe(18 + 14);
  });

  it('never drains more than the daily cap', () => {
    expect(dayDrain({ adult: 5 }, [adult], 'hard')).toBe(DAILY_DRAIN_CAP);
  });

  it('ignores stimuli the player did not pick', () => {
    expect(rawDrain({ adult: 1 }, [sugar], 'easy')).toBe(0);
  });
});

describe('the HP timeline', () => {
  const stimuli: Stimulus[] = [adult, sugar, betting, nicotine];
  const startAt = localTime('2026-10-01', 8 * 60);
  const hour = 60 * 60 * 1000;
  const events = (
    reports: Record<string, Record<string, number>>,
    reportedAt: Record<string, number>,
    habits: { date: string; at?: number }[] = [],
    mode: 'easy' | 'hard' = 'easy',
  ) => hpEvents({ startAt, reports, reportedAt, stimuli, mode, habits });

  it('starts full and stays full with nothing reported', () => {
    expect(simulateHp(startAt, startAt + 30 * hour, [])).toEqual({ hp: MAX_HP, potions: 0 });
  });

  it('takes a slip at check-in, then climbs 2 HP an hour (16 over a night)', () => {
    const e = events({ '2026-09-30': { adult: 1, sugar: 1 } }, { '2026-09-30': startAt });
    expect(simulateHp(startAt, startAt, e).hp).toBe(100 - 26);
    expect(simulateHp(startAt, startAt + 8 * hour, e).hp).toBe(100 - 26 + 8 * REGEN_PER_HOUR);
  });

  it('gives a clean day its bonus, and habits back their HP, capped per day', () => {
    const e = events(
      { '2026-09-30': { adult: 1 }, '2026-10-01': {} },
      { '2026-09-30': startAt, '2026-10-01': startAt + 2 * hour },
      Array.from({ length: 10 }, () => ({ date: '2026-10-01', at: 9 * 60 })),
    );
    expect(e.filter((x) => x.change === HP_PER_HABIT)).toHaveLength(DAILY_RESTORE_CAP / HP_PER_HABIT);
    expect(e.some((x) => x.change === CLEAN_DAY_BONUS)).toBe(true);
    // 80, then +2 regen and +30 from habits by 9:00, then the clean day at 10:00: full.
    expect(simulateHp(startAt, startAt + 2 * hour, e).hp).toBe(MAX_HP);
  });

  it("drinks the Keeper's potion below 20, back up to 50", () => {
    const e = events({ '2026-09-30': { adult: 9 } }, { '2026-09-30': startAt }, [], 'hard');
    // 100 − 90 = 10: the potion lifts it to 50.
    expect(simulateHp(startAt, startAt, e)).toEqual({ hp: POTION_TO, potions: 1 });
  });

  it('lets a heavy day sink below 20 even after a night of regen', () => {
    const e = events(
      { '2026-09-30': { adult: 1, betting: 1, nicotine: 1 }, '2026-10-01': { adult: 1, betting: 1, nicotine: 1 } },
      { '2026-09-30': startAt, '2026-10-01': startAt + 24 * hour },
      [],
    );
    // 100 − 54 = 46, +48 overnight = 94, − 54 = 40: no potion yet.
    expect(simulateHp(startAt, startAt + 24 * hour, e)).toEqual({ hp: 40, potions: 0 });
  });

  it('ignores habits from before the start', () => {
    expect(events({}, {}, [{ date: '2026-09-29', at: 600 }])).toEqual([]);
  });

  it('never drains more than the daily cap in one check-in', () => {
    const e = events({ '2026-09-30': { adult: 9 } }, { '2026-09-30': startAt }, [], 'hard');
    expect(e[0].change).toBe(-DAILY_DRAIN_CAP);
  });
});

describe('survey and streaks', () => {
  it('asks about yesterday once, and not before the start', () => {
    expect(surveyDue('2026-10-01', '2026-10-05', {})).toBe('2026-10-04');
    expect(surveyDue('2026-10-01', '2026-10-05', { '2026-10-04': {} })).toBeNull();
    expect(surveyDue('2026-10-05', '2026-10-05', {})).toBeNull();
    expect(surveyDue(null, '2026-10-05', {})).toBeNull();
  });

  it('counts clean-day streaks over reported days', () => {
    const reports = { '2026-10-01': {}, '2026-10-02': { sugar: 1 }, '2026-10-03': {}, '2026-10-04': {} };
    expect(cleanStreaks(reports, [sugar])).toEqual({ current: 2, best: 2 });
  });

  it('tones the bar like a Pokémon battle', () => {
    expect([hpTone(80), hpTone(40), hpTone(10)]).toEqual(['high', 'mid', 'low']);
  });
});
