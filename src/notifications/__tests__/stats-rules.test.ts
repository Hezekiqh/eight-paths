import {
  CONVERSION_WINDOW_MS,
  EMPTY_STATS,
  recentLines,
  recordCompletion,
  recordOpen,
  settleSent,
  withPending,
} from '../stats-rules';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const t0 = Date.UTC(2026, 8, 28, 20);

const planned = withPending(
  EMPTY_STATS,
  [
    { lineId: 'a1', at: t0, id: 'n1' },
    { lineId: 'd1', at: t0 + DAY, id: 'n2' },
  ],
  t0 - HOUR,
);

describe('the Keeper stats', () => {
  it('counts a call as sent once its time has passed, and not before', () => {
    expect(settleSent(planned, t0 - 1).lines).toEqual({});
    const after = settleSent(planned, t0 + 1);
    expect(after.lines.a1).toEqual({ sends: 1, opens: 0, conversions: 0 });
    expect(after.pending.map((p) => p.lineId)).toEqual(['d1']);
    expect(after.log).toEqual([{ lineId: 'a1', at: t0, opened: false, converted: false }]);
  });

  it('settles the old plan before a new one replaces it, so cancelled future calls never count', () => {
    const replanned = withPending(planned, [{ lineId: 'e1', at: t0 + 2 * DAY }], t0 + HOUR);
    expect(Object.keys(replanned.lines)).toEqual(['a1']);
    expect(replanned.pending.map((p) => p.lineId)).toEqual(['e1']);
  });

  it('counts an open once per notification', () => {
    const opened = recordOpen(planned, 'a1', 'n1', t0);
    expect(opened.lines.a1).toMatchObject({ sends: 1, opens: 1 });
    expect(opened.log[0].opened).toBe(true);
    expect(recordOpen(opened, 'a1', 'n1', t0)).toBe(opened);
  });

  it('credits a quest done within 2 hours of a call, once', () => {
    const done = recordCompletion(planned, t0 + HOUR);
    expect(done.lines.a1.conversions).toBe(1);
    expect(recordCompletion(done, t0 + HOUR + 1).lines.a1.conversions).toBe(1);
    const late = recordCompletion(planned, t0 + CONVERSION_WINDOW_MS + 1);
    expect(late.lines.a1.conversions).toBe(0);
  });

  it('lists lines sent in the last 10 days', () => {
    const sent = settleSent(planned, t0 + 1);
    expect(recentLines(sent, t0 + 9 * DAY)).toEqual(['a1']);
    expect(recentLines(sent, t0 + 10 * DAY)).toEqual([]);
  });
});
