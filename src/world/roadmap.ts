/**
 * "Coming soon" in the World menu: what's still being built, in the order it
 * arrives (WORLDS.md, the Eight Kings). Player-facing and spoiler-free: no
 * names of who anyone was, no endings. Draft copy for the author to approve.
 */
export type RoadmapItem = { title: string; body: string };

export const ROADMAP: RoadmapItem[] = [
  {
    title: 'The Buried Barracks',
    body: 'The first dungeon: a sunken fort full of holes in the walls, boulders to push, and only one true way out.',
  },
  {
    title: 'Battles',
    body: 'One-on-one, turn by turn. Warriors swing swords, Mages throw spells, Clerics burst with light, and every Path fights its own way.',
  },
  {
    title: 'The first kingdom, and its king',
    body: 'Find the king, hear why they must rule, then choose: let them keep the throne, or crown one of your party.',
  },
  {
    title: 'Cocoons in the World',
    body: 'Sleepers along the road, woken by your real Path levels.',
  },
  {
    title: 'The last seal',
    body: 'What waits for you at Overall Lv 20, the end of the road.',
  },
  {
    title: 'Seven more kingdoms',
    body: 'A dungeon, a road and a king for every Path. Each choice you make shapes the ending.',
  },
];
