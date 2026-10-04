import { CLASSES, type Dimension } from '@/game';
import { COMPANIONS, DEFAULT_PARTY, type CharacterId } from '@/story/companions';

import { MAPS, type MapId, type NpcObject } from './maps';

// The core eight are met, not drawn (author, Oct 2, 2026). The hero you woke as
// wakes with the first habit; Brannoc, if it wasn't him, is met in the Archive;
// the rest wait along the road, each before the first job only their Path can
// do, and once met they go home to the Archive.

/**
 * To recruit one of the core eight you need Lv 6 in their own Path (author, Oct 3, 2026): everyone
 * starts at Lv 5, so one real habit of that kind. Until then they turn you away, kindly, in their
 * own voice, and tell you to come back once you've done one.
 */
export const RECRUIT_LEVEL = 6;
export const recruitNeeds = (id: CharacterId) => ({ kind: 'path' as const, dimension: COMPANIONS[id].dimension, level: RECRUIT_LEVEL });

/** What each says when that part of your wellness hasn't had a habit yet. Drafts for the author. */
export const NOT_YET: Partial<Record<CharacterId, string[]>> = {
  brannoc: [
    'Forgive me, stranger. You do not look as though you have trained a single day.',
    'Come back once you have done a Physical habit, and my sword is yours.',
  ],
  ysolde: [
    'Your ledger tells me money is not much of a priority for you yet.',
    'Come back once you have done a Financial habit. I do not partner with spendthrifts.',
  ],
  quill: [
    "Hmm. It doesn't look like learning is very important to you right now.",
    "Come back once you've done an Intellectual habit. Then we'll have something to talk about. Footnote: I'll wait.",
  ],
  wren: [
    "Your spirit seems quiet, as if it isn't something you've made room for yet.",
    "Come back once you've done a Spiritual habit. I'll keep a candle lit.",
  ],
  oren: ["...Breathe.", "It doesn't seem your heart has been looked after yet. Come back once you've done an Emotional habit."],
  pip: [
    "Oh! You haven't done a single Social thing yet, have you?",
    "Come back once you've done a Social habit and I'll write you a song. A good one. Probably.",
  ],
  tamsin: [
    "Work doesn't look like it matters much to you yet.",
    "Come back once you've done an Occupational habit. Then we'll talk. Then we'll work.",
  ],
  moss: ["...You don't spend much time outside, do you.", "Come back once you've done an Environmental habit."],
};

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
