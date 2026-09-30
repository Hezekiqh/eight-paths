import { keeperTalk, type KeeperContext } from '../keeper-talk';
import { FINALE, KEEPER_TALK } from '../keeper-talk-lines';
import type { HabitMemory } from '../memory';
import { seasonFinale } from '../scenes';

const memory = (over: Partial<HabitMemory> = {}): HabitMemory => ({
  habits: 20,
  days: 10,
  streak: 2,
  best: 4,
  strongest: { dimension: 'physical', name: 'Warrior', level: 8 },
  comeback: null,
  since: 20,
  ...over,
});
const ctx = (over: Partial<KeeperContext> = {}): KeeperContext => ({
  flags: [],
  discovered: ['archive'],
  candlesAway: 0,
  heartPieces: 0,
  memory: memory(),
  day: 3,
  ...over,
});

describe('the Keeper', () => {
  it('says something every time', () => {
    const t = keeperTalk(ctx());
    expect(t.lines.length).toBeGreaterThan(0);
    expect(t.said).toBeNull(); // nothing new: the rotation
  });

  it('reacts to the latest step of the story, once', () => {
    const flags = ['plush-won', 'kaldor-beaten', 'kaldor-allowed'];
    const first = keeperTalk(ctx({ flags, discovered: ['archive', 'courier-road'] }));
    const moment = KEEPER_TALK.moments.find((m) => `keeper:${m.id}` === first.said)!;
    expect(moment.when).toBe('kaldor-allowed');
    // Said once; the road and Plush are old news by now, so it's on to other things.
    const next = keeperTalk(ctx({ flags: [...flags, first.said!], discovered: ['archive', 'courier-road'] }));
    const after = KEEPER_TALK.moments.find((m) => `keeper:${m.id}` === next.said);
    expect(after?.when ?? 'none').not.toMatch(/first-back-from-road|plush-won/);
  });

  it('remembers a comeback, with pride', () => {
    const t = keeperTalk(ctx({ memory: memory({ comeback: { gap: 11, month: 'March', endedDaysAgo: 2 } }) }));
    expect(t.said).toBe('keeper:comeback-March-11');
    expect(t.lines.join(' ')).toMatch(/11|March/);
  });

  it('marks a streak once per step', () => {
    const t = keeperTalk(ctx({ memory: memory({ streak: 15, best: 20 }) }));
    expect(t.said).toBe('keeper:streak-14');
    expect(keeperTalk(ctx({ flags: [t.said!], memory: memory({ streak: 16, best: 20 }) })).said).toBeNull();
  });
});

describe('the last seal', () => {
  it('recalls your record and the king you left', () => {
    const allowed = seasonFinale(memory({ habits: 35 }), ['kaldor-allowed']);
    expect(allowed.join(' ')).toContain('35');
    expect(allowed).toEqual(expect.arrayContaining(FINALE.allowed));
    expect(seasonFinale(memory(), ['kaldor-dethroned'])).toEqual(expect.arrayContaining(FINALE.dethroned));
    expect(allowed.slice(-FINALE.end.length)).toEqual(FINALE.end);
  });

  it('leaves out the comeback line when there was none', () => {
    const lines = seasonFinale(memory(), []);
    expect(lines.join(' ')).not.toMatch(/\{/);
  });
});

describe('everything the Keeper and the seal say', () => {
  const all = [
    ...KEEPER_TALK.moments.flatMap((m) => m.lines),
    ...Object.values(KEEPER_TALK.habits).flat(),
    ...KEEPER_TALK.ambient,
    ...Object.values(FINALE).flatMap((v) => (Array.isArray(v) ? v : [v.name, ...v.text])),
  ];
  it('keeps the mystery', () => {
    for (const line of all) expect(line).not.toMatch(/Entity|Chosen One|Erasure/);
  });
  it('fits a dialogue box', () => {
    for (const line of all) expect(line.length).toBeLessThanOrEqual(160);
  });
});
