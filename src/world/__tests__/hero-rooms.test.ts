import { DEFAULT_PARTY } from '@/story/companions';

import { ADVENTURE_ASK, NEXT_ASK, roomOwner, roomQuestions } from '../hero-rooms';

describe("a hero's room", () => {
  it('belongs to the hero in its name', () => {
    expect(roomOwner('room-brannoc')).toBe('brannoc');
    expect(roomOwner('archive')).toBeNull();
  });

  it('lets every one of the core eight say how it is going, and hand you the next step in their words', () => {
    for (const id of Object.values(DEFAULT_PARTY)) {
      const [so, next] = roomQuestions(id, { places: 4, met: 2, flags: ['pit-champion'] }, 'Win at the Kaldorium.');
      expect(so.ask).toBe(ADVENTURE_ASK);
      expect(so.answer.join(' ')).toContain('4 places walked, and 2 of the eight of us found.');
      expect(so.answer.join(' ')).toContain('champions');
      expect(next.ask).toBe(NEXT_ASK);
      expect(next.answer[0]).toMatch(/win at the Kaldorium\.$/);
    }
  });
});

describe('who is where', () => {
  const { outToday, withRoster, pendingNews, saidFlag } = jest.requireActual('../hero-rooms') as typeof import('../hero-rooms');
  const { MAPS } = jest.requireActual('../maps') as typeof import('../maps');

  it('puts each hero in exactly one place each day: the hall or their room', () => {
    for (let day = 20000; day < 20030; day++)
      for (const id of Object.values(DEFAULT_PARTY)) {
        const hall = withRoster(MAPS.archive, day).npcs.some((n) => n.id === `hall-${id}`);
        const room = withRoster(MAPS[`room-${id}` as keyof typeof MAPS], day).npcs.some((n) => n.character === id);
        expect([id, day, hall !== room, hall]).toEqual([id, day, true, outToday(id, day)]);
      }
  });

  it('sends some of them out exploring, but not everyone every day', () => {
    const out = Array.from({ length: 30 }, (_, i) => Object.values(DEFAULT_PARTY).filter((id) => outToday(id, 20000 + i)).length);
    expect(Math.max(...out)).toBeLessThan(8);
    expect(out.reduce((a, b) => a + b, 0)).toBeGreaterThan(30);
  });

  it("has news once you've reached it, said once", () => {
    expect(pendingNews('brannoc', [], 5)).toBeNull();
    const first = pendingNews('brannoc', ['brannoc-joined'], 5)!;
    expect(first.id).toBe('brannoc-room');
    expect(pendingNews('brannoc', ['brannoc-joined', saidFlag(first)], 5)).toBeNull();
    expect(pendingNews('moss', [], 10)?.lines[0]).toMatch(/Lv 10/);
    expect(pendingNews('moss', ['said:moss-lv10'], 12)).toBeNull();
  });
});

describe('the story and the collection', () => {
  const { walkersFor, partyWithYou } = jest.requireActual('../hero') as typeof import('../hero');
  const owned = Object.fromEntries(Object.values(DEFAULT_PARTY).map((id) => [id, 1]));

  it('walks the core eight with you only once met in this run of the story, though all are yours', () => {
    expect(walkersFor(DEFAULT_PARTY, owned, [], [])).toEqual([]);
    expect(walkersFor(DEFAULT_PARTY, owned, [], ['met:brannoc'])).toEqual(['brannoc']);
    expect(partyWithYou(DEFAULT_PARTY, owned, ['met:quill'])).toEqual(['quill']);
    // outside the World, the collection alone
    expect(walkersFor(DEFAULT_PARTY, owned)).toHaveLength(8);
  });
});

describe('recruiting the core eight', () => {
  const { NOT_YET, recruitNeeds, RECRUIT_LEVEL } = jest.requireActual('../meet') as typeof import('../meet');
  const { standing } = jest.requireActual('../progress') as typeof import('../progress');
  const { emptyDimensionRecord, levelFromXp } = jest.requireActual('@/game') as typeof import('@/game');
  let lv6 = 0;
  while (levelFromXp(lv6).level < 6) lv6++;

  it('takes Lv 6 in their own Path, one habit past where everyone starts', () => {
    expect(RECRUIT_LEVEL).toBe(6);
    for (const id of Object.values(DEFAULT_PARTY)) {
      const needs = recruitNeeds(id);
      const none = { total: 0, byPath: emptyDimensionRecord(0), flags: [] };
      expect(standing(needs, none).met).toBe(false);
      const byPath = emptyDimensionRecord(0);
      byPath[needs.dimension] = lv6;
      expect(standing(needs, { total: 0, byPath, flags: [] }).met).toBe(true);
      // and each says so in their own words
      expect(NOT_YET[id]?.join(' ')).toMatch(/Come back/);
    }
  });
});
