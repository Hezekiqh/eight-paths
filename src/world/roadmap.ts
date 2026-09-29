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
    title: 'Every Path fights its own way',
    body: 'Warriors swing swords, Mages throw spells, Clerics burst with light, and every character has a job only they can do.',
  },
  {
    title: 'The Berserker Kingdom',
    body: 'A warrior kingdom gone vicious under a barbarian king and his horde. Someone in your party will have to find their courage.',
  },
  {
    title: 'A choice at the throne',
    body: 'Hear why the king must rule, then choose: let them keep the throne, or crown one of your party.',
  },
  {
    title: 'The end of Season 1',
    body: 'Reach Overall Lv 20 to finish Season 1. The portal at the end is sealed, for now.',
  },
  {
    title: 'Season 2 and beyond',
    body: 'A new kingdom each season, with a new dungeon, a new king and a new choice. Every choice you make shapes the ending.',
  },
];
