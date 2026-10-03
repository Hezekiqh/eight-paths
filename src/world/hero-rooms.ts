import type { CharacterId } from '@/story/companions';

import { withoutNpcs, type Question, type WorldMap } from './maps';

// Each of the core eight has a room off the Archive (author, Oct 3, 2026), behind a door hidden
// in the wall that opens once you've met them and twinkles until you've been in. There you can
// ask them how the adventure's going and what they think you should do next. Drafts, for the author.

/** The hero whose room this map is, or null. */
export const roomOwner = (map: string): CharacterId | null =>
  map.startsWith('room-') ? (map.slice('room-'.length) as CharacterId) : null;

export const ADVENTURE_ASK = 'How is the adventure going?';
export const NEXT_ASK = 'What should we do next?';

/** How each of them talks about it: an opener, then how they hand you the next step. */
const VOICE: Record<string, { so: string; next: string }> = {
  brannoc: { so: "Honestly? Better than I thought. I've only fainted the once.", next: "Okay. Okay. Don't panic. I think we should" },
  ysolde: { so: 'By my count we are ahead. Not by much. I keep the books on these things.', next: 'The sensible move, and I am always sensible:' },
  quill: { so: 'Fascinating, mostly. Occasionally terrifying. I am writing all of it down.', next: 'If my notes are right, and they usually are, we' },
  wren: { so: 'We are further than we were. That is all a path ever asks.', next: 'I lit a candle for it last night. The flame leaned this way:' },
  oren: { so: 'Breathe. Look how far you have come. Now breathe again.', next: 'No rush. But when you are ready,' },
  pip: { so: "It's a great story so far! Needs a chorus. I'm working on it.", next: 'Next verse goes like this:' },
  tamsin: { so: "Running, mostly. A few squeaky bits. I'd tighten things up.", next: "Here's the plan. I drew it on a napkin:" },
  moss: { so: 'Good.', next: 'Next:' },
};

export type Adventure = {
  /** Places you've set foot in, the Archive included. */
  places: number;
  /** The core eight you've met. */
  met: number;
  flags: string[];
};

/** A line or two about what's happened, in their voice, from what's in the save. */
function soFar(id: CharacterId, a: Adventure): string[] {
  const out = [VOICE[id]?.so ?? 'So far, so good.'];
  const did = (f: string) => a.flags.includes(f);
  if (did('kaldor-beaten')) out.push('We beat the Kingbreaker. I still think about that.');
  else if (did('pit-champion')) out.push("Your name's on the champions' wall now. The first one not crossed out.");
  else if (did('jailed-with-brannoc')) out.push('We have been to prison, which I did not expect to say.');
  else if (did('felix-framed')) out.push('That Felix fellow is still out there. Somewhere. Plotting.');
  out.push(`${a.places} places walked, and ${a.met} of the eight of us found.`);
  return out;
}

/** What they say back: how it's going, and the guide's next step in their words. */
export function roomQuestions(id: CharacterId, a: Adventure, next: string): Question[] {
  const voice = VOICE[id];
  return [
    { ask: ADVENTURE_ASK, answer: soFar(id, a) },
    { ask: NEXT_ASK, answer: [`${voice?.next ?? 'Next:'} ${next.charAt(0).toLowerCase()}${next.slice(1)}`] },
  ];
}

// ---- Out and about: on any given day some of them are exploring the Archive hall instead of
// sitting in their rooms (author, Oct 3, 2026). Each hero has a spot in the hall (archive.json,
// `hall-<id>`); which of them are out changes by the day.

/** Out in the hall today, rather than in their room: roughly one day in three each. */
export function outToday(id: string, day: number): boolean {
  let h = day * 31;
  for (const c of id) h = (h * 33 + c.charCodeAt(0)) % 9973;
  return h % 3 === 0;
}

/** The Archive or a hero's room, with each hero in one place today: the hall or their room. */
export function withRoster(map: WorldMap, day: number): WorldMap {
  if (map.id === 'archive')
    return withoutNpcs(
      map,
      map.npcs.filter((n) => n.id.startsWith('hall-') && !outToday(n.id.slice('hall-'.length), day)).map((n) => n.id),
    );
  const owner = roomOwner(map.id);
  return owner && outToday(owner, day) ? withoutNpcs(map, map.npcs.filter((n) => n.character === owner).map((n) => n.id)) : map;
}

/** Today, as a day count (local midnight to midnight). */
export const dayNumber = (now = new Date()) =>
  Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);

// ---- Something new to say: a beat in their own arc, or a level you've reached on their Path.
// Their door twinkles until you've heard it; it's what they open with next time you talk.

export type News = {
  id: string;
  /** Said once you've got here. */
  when: { flag?: string; level?: number };
  lines: string[];
};

/** Each hero's news, in order: the first not yet heard is the one they have for you. */
export const HERO_NEWS: Partial<Record<CharacterId, News[]>> = {
  brannoc: [
    {
      id: 'brannoc-room',
      when: { flag: 'brannoc-joined' },
      lines: [
        "So this is mine? A whole room? With a door?",
        "Thank you. For the cell. For coming back. I'm going to put that on my list. The list of things I'm not scared of. It's got one thing on it now.",
      ],
    },
    {
      id: 'brannoc-lv10',
      when: { level: 10 },
      lines: ["I felt that. Lv 10. My arms are... are my arms bigger? Don't answer that. Yes. Answer that."],
    },
    {
      id: 'brannoc-lv20',
      when: { level: 20 },
      lines: [
        'Lv 20. I tried the swing. Awake, this time.',
        'I broke a shelf. Quill is furious. I am thrilled.',
      ],
    },
    {
      id: 'brannoc-king',
      when: { flag: 'kaldor-beaten' },
      lines: ['We beat the Kingbreaker. Me. Fainting Brannoc.', "I didn't faint once. I nearly did. Twice. But I didn't."],
    },
  ],
};

/** Level thresholds everyone has something to say about, if they've nothing of their own for it. */
const LEVEL_NEWS: Record<number, string[]> = {
  10: ["Lv 10! I felt it from in here. Whatever you're doing out there, keep doing it."],
  20: ["Lv 20. That's not luck any more. That's you."],
};

/** Heard: they won't say it again. */
export const saidFlag = (news: News) => `said:${news.id}`;

/** What they have for you that you haven't heard (`level`: theirs, on their Path): their own news first, then the shared level lines. */
export function pendingNews(id: CharacterId, flags: string[], level: number): News | null {
  const heard = (n: string) => flags.includes(`said:${n}`);
  const due = (w: News['when']) => (!w.flag || flags.includes(w.flag)) && (!w.level || level >= w.level);
  const own = (HERO_NEWS[id] ?? []).find((n) => !heard(n.id) && due(n.when));
  if (own) return own;
  const levels = new Set((HERO_NEWS[id] ?? []).flatMap((n) => (n.when.level ? [n.when.level] : [])));
  for (const lv of [10, 20]) {
    const nid = `${id}-lv${lv}`;
    if (!levels.has(lv) && level >= lv && !heard(nid)) return { id: nid, when: { level: lv }, lines: LEVEL_NEWS[lv] };
  }
  return null;
}
