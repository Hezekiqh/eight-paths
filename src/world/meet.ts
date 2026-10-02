import type { Dimension } from '@/game';
import { COMPANIONS, DEFAULT_PARTY, type CharacterId } from '@/story/companions';

import { MAPS, type MapId, type NpcObject } from './maps';

// The core eight are met, not drawn (author, Oct 2, 2026). Brannoc wakes with
// the first habit; the other seven wait along the road, each before the first
// job only their Path can do, and once met they go home to the Archive.

/** The story flag set when you meet one of the core eight in the Other World. */
export const metFlag = (id: CharacterId) => `met:${id}`;

/** Where each of the core eight is found, by Path: the place, and who stands there. */
export const MEETINGS: Partial<Record<Dimension, { map: MapId; npc: NpcObject }>> = Object.fromEntries(
  Object.values(MAPS).flatMap((m) =>
    m.npcs
      .filter((n) => n.meets && n.character)
      .map((n) => [COMPANIONS[n.character!].dimension, { map: m.id as MapId, npc: n }]),
  ),
);

/** "Pip is somewhere on the March Road." For a job whose Path you haven't met yet. */
export function whereToMeet(path: Dimension): string | null {
  const m = MEETINGS[path];
  if (!m) return null;
  return `${COMPANIONS[DEFAULT_PARTY[path]].name} is somewhere in ${MAPS[m.map].name.replace(/^The /, 'the ')}.`;
}

/** What's said when they join: their own lines first, then how to walk as them. */
export function meetingLines(npc: NpcObject): string[] {
  return [...npc.lines, `${npc.name} joins your party! Walk as ${npc.name} from the pause menu (Party).`];
}
