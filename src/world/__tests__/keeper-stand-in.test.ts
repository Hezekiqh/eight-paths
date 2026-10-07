import { MAPS, withoutGone } from '../maps';
import { metFlag, wokeFlag } from '../meet';

// Whoever you woke as, the Keeper stands where they'd have been in Warrior City (author, Oct 4, 2026).
const PLACES = [
  ['wc-library', 'quill'],
  ['wc-guild', 'ysolde'],
  ['wc-chapel', 'wren'],
] as const;

describe('the Keeper in your place', () => {
  it.each(PLACES)('%s: the Keeper only if you woke as %s, standing where they would', (map, hero) => {
    const npcs = (flags: string[]) => withoutGone(MAPS[map], flags).npcs;
    const keeper = (flags: string[]) => npcs(flags).find((n) => n.name === 'The Keeper');
    const them = MAPS[map].npcs.find((n) => n.character === hero)!;
    // someone else's run: the hero is there, the Keeper isn't
    expect(keeper([])).toBeUndefined();
    // your run: the hero is you, so the Keeper stands in their spot
    const woke = [metFlag(hero), wokeFlag(hero)];
    expect(npcs(woke).some((n) => n.character === hero)).toBe(false);
    expect([keeper(woke)?.x, keeper(woke)?.y]).toEqual([them.x, them.y]);
    // meeting them normally doesn't bring the Keeper in
    expect(keeper([metFlag(hero)])).toBeUndefined();
  });
});
