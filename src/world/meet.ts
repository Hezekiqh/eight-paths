import { CLASSES, type Dimension } from '@/game';
import { COMPANIONS, DEFAULT_PARTY, type CharacterId } from '@/story/companions';

import { MAPS, type MapId, type NpcObject } from './maps';

// The core eight are met, not drawn (author, Oct 2, 2026). The hero you woke as
// wakes with the first habit; Brannoc, if it wasn't him, is met in the Archive;
// the rest wait along the road, each before the first job only their Path can
// do, and once met they go home to the Archive.

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

/**
 * The Season 1 starters know the face you woke with (Player.origin) and say so
 * first, in their own way. {name} is who you look like. Draft lines for the author.
 */
export const REMEMBERS: Partial<Record<CharacterId, string>> = {
  brannoc: "{name}? {name}! I'd know that face in a crowd of a thousand. I've been in a crowd of a thousand.",
  ysolde: '{name}. You look exactly as I remember. That is not a compliment, it is an inventory.',
  quill: "{name}! It's really you! I wrote your face down so I wouldn't forget it. I forgot where I wrote it.",
  wren: "{name}. I prayed you'd wake looking like yourself. Somebody up there owes me one.",
};

/**
 * What's said when they join: a hello for the face you woke with, their own
 * lines, then that they'll step in for their Path's jobs (like a field move).
 */
export function meetingLines(npc: NpcObject, origin?: CharacterId): string[] {
  const id = npc.character;
  const known = id && origin && id !== origin ? REMEMBERS[id] : undefined;
  const className = id ? CLASSES[COMPANIONS[id].dimension].className : null;
  return [
    ...(known ? [known.replaceAll('{name}', COMPANIONS[origin!].name)] : []),
    ...npc.lines,
    className
      ? `${npc.name} joins your party! When something needs a ${className}, ${npc.name} steps up.`
      : `${npc.name} joins your party!`,
  ];
}
