import { DEFAULT_PARTY } from '@/story/companions';

import { COCOONS, advisedBy, brokenCocoons, cocoonAt } from '../cocoons';
import { MAPS, withoutGone, type MapId } from '../maps';

describe('cocoons', () => {
  it('never hold one of the core eight', () => {
    for (const c of COCOONS) expect(Object.values(DEFAULT_PARTY)).not.toContain(c.character);
  });

  it('stand on their own tile in their map', () => {
    for (const c of COCOONS) {
      const map = MAPS[c.map as MapId];
      expect(map.tiles[c.y][c.x]).toBe(c.tile);
      expect(cocoonAt(c.map, c.tile)).toBe(c);
      expect(map.examine[c.tile]?.length).toBeGreaterThan(0);
    }
  });

  it('show as split silk once broken', () => {
    expect(brokenCocoons('courier-road', [])).toEqual([]);
    expect(brokenCocoons('courier-road', ['felix-hatched'])).toEqual([{ x: 5, y: 11 }]);
  });
});

describe('Felix', () => {
  const road = MAPS['courier-road'];
  const here = (map: (typeof MAPS)[MapId], flags: string[]) => withoutGone(map, flags).npcs.some((n) => n.id === 'felix');

  it('stands by the cocoon once it hatches, and leaves for good when he says what he will do', () => {
    expect(here(road, [])).toBe(false);
    expect(here(road, ['felix-hatched'])).toBe(true);
    const what = road.npcs.find((n) => n.id === 'felix')!.questions!.find((q) => q.sets)!;
    expect(what.sets).toBe('felix-left');
    expect(here(road, ['felix-hatched', 'felix-left'])).toBe(false);
  });

  it("turns up beside Kaldor, with two guards and a word for you, until the king's beaten", () => {
    const hall = MAPS['war-hall'];
    expect(here(hall, [])).toBe(false);
    expect(here(hall, ['felix-left'])).toBe(true);
    expect(here(hall, ['felix-left', 'kaldor-beaten'])).toBe(false);
    expect(advisedBy('war-hall', [])).toBeNull();
    const advised = advisedBy('war-hall', ['felix-left'])!;
    expect(advised.guards).toHaveLength(2);
    for (const g of advised.guards) expect(hall.solid[g.y * hall.width + g.x]).toBe(0);
    expect(advised.lines[0]).toMatch(/^FELIX: /);
  });
});
