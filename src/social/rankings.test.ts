import { COMPANIONS, ROSTER, STARTERS } from '@/story/companions';

import { BOARDS, BOARD_BY_ID, DEFAULT_BOARDS, RIVALS, collectionValue, rankBoard, type RankedPlayer } from './rankings';
import { usernameProblem } from './username';

const core = ROSTER.filter((c) => c.kind === 'core');
const player = (id: string, holdings: RankedPlayer['holdings']): RankedPlayer => ({
  userId: id,
  username: id,
  founderNumber: null,
  leader: null,
  level: 1,
  holdings,
});

describe('rivals', () => {
  it('are all new players with 5 to 20 heroes, one of them a starter', () => {
    expect(RIVALS.length).toBeGreaterThanOrEqual(20);
    for (const r of RIVALS) {
      const heroes = Object.keys(r.holdings);
      expect(heroes.length).toBeGreaterThanOrEqual(5);
      expect(heroes.length).toBeLessThanOrEqual(20);
      expect(heroes.some((h) => STARTERS.includes(h as never))).toBe(true);
      expect(heroes.every((h) => h in COMPANIONS)).toBe(true);
      expect(r.rival).toBe(true);
    }
  });

  it('have valid, unique usernames', () => {
    const names = RIVALS.map((r) => r.username);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(usernameProblem(n)).toBeNull();
  });
});

describe('rankings', () => {
  it('every board has a unique id, and the defaults exist', () => {
    expect(new Set(BOARDS.map((b) => b.id)).size).toBe(BOARDS.length);
    for (const id of DEFAULT_BOARDS) expect(BOARD_BY_ID[id]).toBeDefined();
    expect(BOARDS).toHaveLength(1 + 8 + 5 + 2);
  });

  it('scores each kind of ranking', () => {
    const h = { [core[0].id]: 1, [core[1].id]: 4 };
    expect(BOARD_BY_ID['first-8'].score(h)).toBe(2);
    expect(BOARD_BY_ID['one-kind'].score(h)).toBe(4);
    expect(BOARD_BY_ID['one-kind'].face!(h)).toBe(core[1].id);
    expect(BOARD_BY_ID[`path-${core[0].dimension}`].score(h)).toBe(1);
    expect(BOARD_BY_ID[`stars-${core[0].rarity}`].score(h)).toBeGreaterThanOrEqual(1);
    expect(BOARD_BY_ID.diverse.score(h)).toBe(
      new Set([core[0], core[1]].map((c) => `${c.dimension}:${c.rarity}`)).size,
    );
  });

  it('ranks best first, leaves out zero scores but always keeps you', () => {
    const rows = rankBoard(
      BOARD_BY_ID['first-8'],
      [player('me', {}), player('a', { [core[0].id]: 1 }), player('b', { [core[0].id]: 1, [core[1].id]: 1 })],
      'me',
    );
    expect(rows.map((r) => r.player.userId)).toEqual(['b', 'a', 'me']);
  });

  it('values a collection the way the server does', () => {
    const id = core[0].id;
    expect(collectionValue({ [id]: 1 }, { [id]: { wokenBy: 1, players: 10 } })).toBe(100);
    expect(collectionValue({ [id]: 1 }, { [id]: { wokenBy: 10, players: 10 } })).toBe(10);
    expect(collectionValue({ [id]: 1 }, {})).toBe(100);
  });
});
