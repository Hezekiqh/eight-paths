import { addDays } from '../dates';
import { settleRestDays, type RestLedger } from '../rest';
import { dimensionStreak, habitStreak, showUpStreak } from '../streaks';
import { done, quest } from './helpers';

const start = '2026-09-01';
const fresh: RestLedger = { restTokens: 1, restDays: [], lastSettledDate: null };

function activeDays(from: string, count: number) {
  return Array.from({ length: count }, (_, i) => done(addDays(from, i)));
}

describe('settleRestDays', () => {
  it("doesn't settle today", () => {
    const ledger = settleRestDays(fresh, [], [], start, start);
    expect(ledger).toEqual(fresh);
  });

  it('spends a token on a missed habit: its streak survives, the day does not', () => {
    const run = quest({ id: 'run' });
    const cs = [done('2026-09-01', 'physical', 'run'), done('2026-09-03', 'physical', 'run')];
    const ledger = settleRestDays(fresh, cs, [run], start, '2026-09-04');
    expect(ledger.restTokens).toBe(0);
    expect(ledger.restDays).toEqual([{ date: '2026-09-02', dimension: 'physical', questId: 'run' }]);
    expect(ledger.lastSettledDate).toBe('2026-09-03');
    expect(habitStreak(run, cs, ledger.restDays, '2026-09-04')).toBe(2);
    expect(dimensionStreak(cs, ledger.restDays, [run], 'physical', start, '2026-09-04').current).toBe(2);
    // The day itself still counts as missed.
    expect(showUpStreak(cs, ledger.restDays, start, '2026-09-04').current).toBe(1);
  });

  it('spends one token per missed habit, longest streak first, until they run out', () => {
    const run = quest({ id: 'run' });
    const read = quest({ id: 'read', dimension: 'intellectual' });
    const cs = [
      done('2026-08-31', 'physical', 'run'),
      done('2026-09-01', 'physical', 'run'),
      done('2026-09-01', 'intellectual', 'read'),
    ];
    const ledger = settleRestDays({ ...fresh, restTokens: 1 }, cs, [run, read], '2026-08-31', '2026-09-03');
    // Only one token on the 2nd: it goes to run (2 days) over read (1 day).
    expect(ledger.restDays).toEqual([{ date: '2026-09-02', dimension: 'physical', questId: 'run' }]);
    expect(habitStreak(read, cs, ledger.restDays, '2026-09-03')).toBe(0);

    const two = settleRestDays({ ...fresh, restTokens: 2 }, cs, [run, read], '2026-08-31', '2026-09-03');
    expect(two.restTokens).toBe(0);
    expect(two.restDays.map((r) => r.questId)).toEqual(['run', 'read']);
  });

  it('lets streaks reset when no token is left', () => {
    const run = quest({ id: 'run' });
    const cs = [done('2026-09-01', 'physical', 'run'), done('2026-09-04', 'physical', 'run')];
    const ledger = settleRestDays(fresh, cs, [run], start, '2026-09-05');
    expect(ledger.restTokens).toBe(0);
    expect(ledger.restDays).toHaveLength(1);
    expect(habitStreak(run, cs, ledger.restDays, '2026-09-05')).toBe(1);
  });

  it('spends nothing on a day with no habits, even with nothing done', () => {
    const cs = [done('2026-09-01'), done('2026-09-03')];
    expect(settleRestDays(fresh, cs, [], start, '2026-09-04').restTokens).toBe(1);
  });

  it('keeps older whole-day rests working', () => {
    const run = quest({ id: 'run' });
    const cs = [done('2026-09-01', 'physical', 'run'), done('2026-09-03', 'physical', 'run')];
    const old = [{ date: '2026-09-02', dimension: 'all' as const }];
    expect(habitStreak(run, cs, old, '2026-09-04')).toBe(2);
    expect(showUpStreak(cs, old, start, '2026-09-04').current).toBe(2);
  });

  it('earns a token for each 7-day active run', () => {
    const cs = activeDays(start, 14);
    const ledger = settleRestDays(fresh, cs, [], start, addDays(start, 14));
    expect(ledger.restTokens).toBe(3);
  });

  it('caps tokens at 3', () => {
    const cs = activeDays(start, 28);
    const ledger = settleRestDays(fresh, cs, [], start, addDays(start, 28));
    expect(ledger.restTokens).toBe(3);
  });

  it('only counts a run once the 7th day is over', () => {
    const cs = activeDays(start, 7);
    expect(settleRestDays(fresh, cs, [], start, addDays(start, 6)).restTokens).toBe(1);
    expect(settleRestDays(fresh, cs, [], start, addDays(start, 7)).restTokens).toBe(2);
  });

  it('is idempotent and resumes from the last settled day', () => {
    const run = quest({ id: 'run' });
    const cs = [done('2026-09-01', 'physical', 'run')];
    const once = settleRestDays(fresh, cs, [run], start, '2026-09-03');
    expect(settleRestDays(once, cs, [run], start, '2026-09-03')).toEqual(once);
    const later = settleRestDays(once, cs, [run], start, '2026-09-04');
    expect(later.lastSettledDate).toBe('2026-09-03');
    expect(later.restDays).toHaveLength(1);
  });

  it('saves only the missed habit on a day where others were done', () => {
    const run = quest({ id: 'run' });
    const read = quest({ id: 'read', dimension: 'intellectual' });
    const quests = [run, read];
    const cs = [
      done('2026-09-01', 'physical', 'run'),
      done('2026-09-01', 'intellectual', 'read'),
      done('2026-09-02', 'intellectual', 'read'),
      done('2026-09-03', 'physical', 'run'),
      done('2026-09-03', 'intellectual', 'read'),
    ];
    const ledger = settleRestDays(fresh, cs, quests, start, '2026-09-04');
    expect(ledger.restTokens).toBe(0);
    expect(ledger.restDays).toEqual([{ date: '2026-09-02', dimension: 'physical', questId: 'run' }]);
    expect(habitStreak(run, cs, ledger.restDays, '2026-09-04')).toBe(2);
    expect(dimensionStreak(cs, ledger.restDays, quests, 'physical', start, '2026-09-04').current).toBe(2);
  });

  it("doesn't spend a token when there's no streak to save", () => {
    const run = quest({ id: 'run' });
    // Nothing done yet: a missed first day has nothing to protect.
    expect(settleRestDays(fresh, [], [run], start, '2026-09-03')).toMatchObject({ restTokens: 1, restDays: [] });
  });

  it("doesn't spend a token on a day where everything due was done", () => {
    const run = quest({ id: 'run' });
    const cs = [done('2026-09-01', 'physical', 'run'), done('2026-09-02', 'physical', 'run')];
    expect(settleRestDays(fresh, cs, [run], start, '2026-09-03').restTokens).toBe(1);
  });
});
