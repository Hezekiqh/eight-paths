/**
 * "Coming soon" in the World menu: what's still being built, in the order it
 * arrives (WORLDS.md, the Eight Kings). Player-facing and spoiler-free: no
 * names of who anyone was, no endings. Draft copy for the author to approve.
 * Season 1 (the Buried Barracks, the Berserker Kingdom, the throne and the
 * sealed portal) is built, so only what comes after it is listed.
 */
export type RoadmapItem = { title: string; body: string };

export const ROADMAP: RoadmapItem[] = [
  {
    title: 'Beyond the sealed portal',
    body: 'Season 2 opens the portal at the end of the Field of Banners. Past it lies the next kingdom, with a new dungeon, a new king and a new choice.',
  },
  {
    title: 'Every choice shapes the ending',
    body: 'Each season adds a kingdom, and the choices you make at every throne carry forward to the end of the Eight Kings.',
  },
];
