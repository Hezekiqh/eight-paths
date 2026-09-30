import { FREE_WORLD_MS, addPlay, playLeft } from '../playtime';

const today = '2026-10-01';

describe('Other World playtime', () => {
  it('gives free players 15 minutes a day, and Premium no limit', () => {
    const fresh = { date: '', ms: 0 };
    expect(playLeft(fresh, today, 'free')).toBe(FREE_WORLD_MS);
    expect(playLeft({ date: today, ms: FREE_WORLD_MS + 5 }, today, 'free')).toBe(0);
    expect(playLeft({ date: today, ms: FREE_WORLD_MS * 4 }, today, 'premium')).toBe(Infinity);
  });

  it('adds up play through the day and starts over at midnight', () => {
    const morning = addPlay({ date: today, ms: 0 }, today, 60_000);
    const evening = addPlay(morning, today, 120_000);
    expect(evening).toEqual({ date: today, ms: 180_000 });
    expect(playLeft(evening, today, 'free')).toBe(FREE_WORLD_MS - 180_000);
    const tomorrow = addPlay(evening, '2026-10-02', 1_000);
    expect(tomorrow).toEqual({ date: '2026-10-02', ms: 1_000 });
    expect(playLeft(evening, '2026-10-02', 'free')).toBe(FREE_WORLD_MS);
  });
});
