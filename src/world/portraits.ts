import { MAPS } from './maps';
import { WALKER_ROWS, type WalkerId } from './walkers';

/**
 * Who's talking in a dialogue box: their face (the top of their walker, drawn
 * big) and their voice (a blip per letter, like Undertale's).
 */

/** Every speaker by name, from every map's people, plus the core walkers by id. */
const BY_NAME = new Map<string, WalkerId>();
for (const map of Object.values(MAPS)) {
  for (const npc of map.npcs) {
    // (a variant walker, like Brannoc without his sword, never stands for their name: pass `sprite` for it)
    if (npc.sprite in WALKER_ROWS && npc.sprite !== 'brannocbare') BY_NAME.set(npc.name.toUpperCase(), npc.sprite);
  }
}

/** The walker to draw for a speaker, matched on their full name, then on one word of it ("VARGA" is Captain Varga). */
export function portraitFor(name: string | undefined): WalkerId | undefined {
  if (!name) return undefined;
  const key = name.trim().toUpperCase();
  const exact = BY_NAME.get(key);
  if (exact) return exact;
  const id = key.split(' ')[0].toLowerCase();
  if (id in WALKER_ROWS) return id as WalkerId;
  for (const [full, sprite] of BY_NAME) {
    if (!key.includes(' ') && full.split(' ').includes(key)) return sprite;
  }
  return undefined;
}

/**
 * A line said by someone else mid-conversation, written "VARGA: text": who
 * says it, and the text without the name. Only names that match a person
 * count, so signs ("BY ORDER OF THE KING: …") stay as they are.
 */
export function splitSpeaker(line: string): {
  speaker?: string;
  sprite?: WalkerId;
  text: string;
  narration?: boolean;
} {
  // "* text": narration, even in a box someone's speaking in (a boss's intro: what you see, not what he says)
  if (line.startsWith('* ')) return { text: line.slice(2), narration: true };
  const m = line.match(/^([A-Z][A-Z' ]{1,30}): (.+)$/s);
  if (!m) return { text: line };
  const sprite = portraitFor(m[1]);
  if (!sprite) return { text: line };
  const speaker = m[1].toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  return { speaker, sprite, text: m[2] };
}

/** 0 is the Keeper's alone: deeper than anyone. */
export type Voice = 0 | 1 | 2 | 3 | 4 | 5;

/** The big and the old speak low; children speak high. */
const VOICES: Partial<Record<WalkerId, Voice>> = {
  kaldor: 1,
  aurek: 1,
  plush: 1,
  bo: 1,
  keeper: 0,
  harrow: 2,
  hugo: 2,
  brannoc: 2,
  brunna: 5,
  pim: 5,
  // the Deep Cells (author, Oct 6, 2026): four voices you can tell apart in one breath
  oldmott: 1,
  gary: 2,
  garyasleep: 2,
  silasseen: 3,
  nails: 4,
  // Aurek the Tall, the Kaloseum's Warden: as low as he is tall
  warden: 1,
};

/** A speaker's voice, lowest (1) to highest (5): set for some, otherwise one of the middle three, fixed by their name. */
export function voiceFor(name: string | undefined, sprite: WalkerId | undefined): Voice {
  if (sprite && VOICES[sprite] !== undefined) return VOICES[sprite]!;
  let hash = 0;
  for (const c of name ?? '') hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
  return (2 + (hash % 3)) as Voice;
}
