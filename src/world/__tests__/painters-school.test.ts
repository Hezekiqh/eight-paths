import type { Dialogue } from '@/components/world/dialogue-box';

import { MAPS, tilesOf, type WorldMap } from '../maps';
import { MEMORIES } from '../memories';
import { EXITS } from '../progress';
import {
  HOOK_TILE,
  PAINTINGS,
  PAINTINGS_HUNG,
  PLATES,
  SCHOOL,
  fallenLines,
  hookDialogue,
  paintingsShown,
  rightOrder,
} from '../painters-school';

// The Painters' School's puzzle (author, Oct 7, 2026): four paintings off the wall, the story of a boy and a
// sword. Hang them back in order and Brannoc's memory of the school is there to be had.

const school = MAPS[SCHOOL] as WorldMap;

/** Plays the wall's menu, picking these paintings (by title) a hook at a time. */
function hangAs(titles: string[]) {
  const said: Dialogue[] = [];
  let hung = false;
  let after = false;
  const h = {
    say: (d: Dialogue) => said.push(d),
    hang: () => (hung = true),
    after: () => (after = true),
  };
  const first = hookDialogue([], h, ['Four bare hooks.']);
  first.choices!.find((c) => c.label.startsWith('Hang'))!.then();
  for (const title of titles) {
    const menu = said.at(-1)!;
    expect(menu.choices!.length).toBeLessThanOrEqual(4);
    menu.choices!.find((c) => c.label === title)!.then();
  }
  const last = said.at(-1)!;
  last.then?.();
  return { hung, after, last, said };
}

describe("the Painters' School", () => {
  it('opens off the South Road and back', () => {
    expect(EXITS.find((e) => e.id === 'south-school')!.to!.map).toBe(SCHOOL);
    expect(EXITS.find((e) => e.id === 'school-south')!.to!.map).toBe('south-road');
  });

  it('is quiet: nobody to fight', () => {
    expect(school.enemies).toEqual([]);
    expect(school.boss).toBeUndefined();
  });

  it('has the four paintings on its floor, each saying what it shows', () => {
    for (const p of PAINTINGS) {
      expect(tilesOf(school, [p.tile])).toHaveLength(1);
      expect(school.walkable).toContain(p.tile);
      expect(school.examine[p.tile].join(' ')).toMatch(/sword/);
    }
  });

  it("names the hooks' plates in the order they hang", () => {
    const plates = school.examine[HOOK_TILE].join(' ');
    PLATES.forEach((plate, i) => expect(plates).toContain(`${['I', 'II', 'III', 'IV'][i]}. ${plate}.`));
  });

  it('can be solved: hung in order, they stay up, and the memory follows', () => {
    expect(rightOrder(PAINTINGS.map((p) => p.tile))).toBe(true);
    // the last one goes on the last hook by itself
    const right = hangAs(PAINTINGS.slice(0, 3).map((p) => p.title));
    expect(right.hung).toBe(true);
    expect(right.after).toBe(true);
    expect(right.last.lines.at(-1)).toBe('It reads, now.');
  });

  it('turns back any other order', () => {
    const titles = PAINTINGS.map((p) => p.title);
    const wrong = hangAs([titles[1], titles[0], titles[2]]);
    expect(wrong.hung).toBe(false);
    expect(wrong.after).toBe(false);
    expect(rightOrder(['z', 'y', 'x', 'w'])).toBe(false);
  });

  it('shows them where they fell, then on the hooks once hung', () => {
    const fallen = paintingsShown(school, []);
    expect(fallen.map((p) => school.tiles[p.y][p.x])).toEqual(PAINTINGS.map((p) => p.tile));
    const hung = paintingsShown(school, [PAINTINGS_HUNG]);
    expect(hung.every((p) => p.hung && school.tiles[p.y][p.x] === HOOK_TILE)).toBe(true);
    expect(new Set(hung.map((p) => p.x)).size).toBe(4);
    expect(hung.map((p) => p.x)).toEqual([...hung.map((p) => p.x)].sort((a, b) => a - b));
    expect(paintingsShown(MAPS['south-road'], [])).toEqual([]);
    expect(fallenLines(PAINTINGS[0].tile, [])).toBeNull();
    expect(fallenLines(PAINTINGS[0].tile, [PAINTINGS_HUNG])).not.toBeNull();
  });

  it("keeps Brannoc's memory here, waiting on the paintings, and it opens his dream", () => {
    const memory = MEMORIES.find((m) => m.map === SCHOOL)!;
    expect(memory.whose).toBe('brannoc');
    expect(memory.needs).toMatchObject({ kind: 'flag', flag: PAINTINGS_HUNG });
    expect(memory.sets).toBe('brannoc-flashback');
    // the stool it waits at faces the hooks
    expect(school.tiles[memory.y][memory.x]).toBe('C');
  });

  it("has B.'s sketchbook and the master's statue", () => {
    expect(school.examine.k.join(' ')).toContain('B.');
    expect(school.examine.S.join(' ')).toMatch(/MASTER/);
  });
});
