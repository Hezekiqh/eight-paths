import { ARENA_CARRIED, ARENA_FAINTED, CARRIED_TO, arenaCarry, arenaRush } from '../dungeon';
import { MAPS, withStoryPoses } from '../maps';

// Episode 13, in the game (author, Oct 7, 2026): Brannoc faints, and the three carry him off to the side of the sand.
describe('the three carry Brannoc off', () => {
  const pit = MAPS['the-pit'];
  const at = (flags: string[], id: string) => withStoryPoses(pit, flags).npcs.find((n) => n.id === id)!;

  it('he is on his feet until he faints, then flat on his back, asleep', () => {
    expect(at([], 'brannoc-pit')).toMatchObject({ asleep: false, lying: false });
    expect(at([ARENA_FAINTED], 'brannoc-pit')).toMatchObject({ asleep: true, lying: true, snot: true });
  });

  it('once carried, everyone stands where the carry put them down, on open sand', () => {
    const flags = [ARENA_FAINTED, ARENA_CARRIED];
    const spots = {
      'arena-mott': CARRIED_TO.mott,
      'brannoc-pit': CARRIED_TO.brannoc,
      'arena-nails': CARRIED_TO.nails,
      'arena-silas': CARRIED_TO.silas,
    };
    for (const [id, [x, y]] of Object.entries(spots)) {
      expect(at(flags, id)).toMatchObject({ x, y });
      expect(pit.walkable).toContain(pit.tiles[y][x]);
    }
  });

  it('the rush starts where everyone stands, and the carry starts where the rush ends', () => {
    const rows = { mott: 1, nails: 2, silas: 3, brannoc: 4 };
    const rush = arenaRush(rows);
    const carry = arenaCarry(rows);
    for (const id of ['arena-mott', 'arena-nails', 'arena-silas', 'brannoc-pit']) {
      const n = pit.npcs.find((o) => o.id === id)!;
      const row = { 'arena-mott': 1, 'arena-nails': 2, 'arena-silas': 3, 'brannoc-pit': 4 }[id];
      const r = rush.find((a) => a.row === row)!;
      const c = carry.find((a) => a.row === row)!;
      expect(r.path[0]).toEqual([n.x, n.y]);
      expect(c.path[0]).toEqual(r.path[r.path.length - 1]);
      for (const [x, y] of [...r.path, ...c.path]) expect(pit.walkable).toContain(pit.tiles[y][x]);
    }
    // everyone carries him the same distance, so they arrive together
    const len = (p: [number, number][]) =>
      p.slice(1).reduce((d, q, i) => d + Math.hypot(q[0] - p[i][0], q[1] - p[i][1]), 0);
    for (const a of carry.filter((a) => a.row !== 3)) expect(len(a.path)).toBeCloseTo(10);
  });
});
