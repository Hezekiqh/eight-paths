import type { CharacterId } from '@/story/companions';

import { brannocAway } from './castle';
import { withoutNpcs, type Question, type WorldMap } from './maps';

// Each of the core eight has a room off the Archive (author, Oct 3, 2026), behind a door hidden
// in the wall that opens once you've met them and twinkles until you've been in. There you can
// ask them how the adventure's going and what they think you should do next. Drafts, for the author.

/** The hero whose room this map is, or null. */
export const roomOwner = (map: string): CharacterId | null =>
  map.startsWith('room-') ? (map.slice('room-'.length) as CharacterId) : null;

export const ADVENTURE_ASK = 'How is the adventure going?';
export const NEXT_ASK = 'What should we do next?';
export const DREAM_ASK = 'What was your dream?';

/** How each of them talks about it: an opener, then how they hand you the next step. */
const VOICE: Record<string, { so: string; next: string }> = {
  brannoc: {
    so: 'Better than I feared. I have only fainted the once.',
    next: 'Fear not. Well, I fear plenty. But I think we should',
  },
  ysolde: {
    so: 'By my count we are ahead. Not by much. I keep the books on these things.',
    next: 'The sensible move, and I am always sensible:',
  },
  quill: {
    so: 'Fascinating, mostly. Occasionally terrifying. I am writing all of it down.',
    next: 'If my notes are right, and they usually are, we',
  },
  wren: {
    so: 'We are further than we were. That is all a path ever asks.',
    next: 'I lit a candle for it last night. The flame leaned this way:',
  },
  oren: { so: 'Breathe. Look how far you have come. Now breathe again.', next: 'No rush. But when you are ready,' },
  pip: { so: "It's a great story so far! Needs a chorus. I'm working on it.", next: 'Next verse goes like this:' },
  tamsin: {
    so: "Running, mostly. A few squeaky bits. I'd tighten things up.",
    next: "Here's the plan. I drew it on a napkin:",
  },
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
  else if (did('pit-champion')) out.push("Your name's on the champions' wall now. The first new one since Kaldor's.");
  else if (did('jailed-with-brannoc')) out.push('We have been to prison, which I did not expect to say.');
  else if (did('felix-framed')) out.push('That Felix fellow is still out there. Somewhere. Plotting.');
  out.push(`${a.places} places walked, and ${a.met} of the eight of us found.`);
  return out;
}

/** Something mean to say to each of them (honor.ts: every menu has one), and how they take it. */
const MEAN: Record<string, { ask: string; answer: string[] }> = {
  brannoc: {
    ask: 'Must you cower in here all day?',
    answer: ['Not all day. I take breaks. To cower elsewhere.', '...That was a jest. I think. I am working on them.'],
  },
  ysolde: {
    ask: 'Do you ever stop counting?',
    answer: ['No. I counted that. It goes in the ledger, under "unkind".', 'The column is getting long.'],
  },
  quill: {
    ask: 'Nobody reads your notes, Quill.',
    answer: ['Footnote: I do.', "Footnote to the footnote: that hurt. I'm writing that down too."],
  },
  wren: {
    ask: 'Your candles stink up the whole Archive.',
    answer: ["They're beeswax. They smell of honey.", "I'll light one for you anyway. You seem like you need it."],
  },
  oren: {
    ask: 'Breathe? Is that all you ever say?',
    answer: ['...Breathe.', 'There. You said something unkind, and I said something useful. Drink some water.'],
  },
  pip: {
    ask: 'Your songs are terrible, Pip.',
    answer: ["Terrible's a start! Terrible's a genre!", "...I'll write a sad one. About you. It'll be terrible."],
  },
  tamsin: {
    ask: 'Must you clank about all day?',
    answer: ['Yes.', "Half the shelves in this place stay up because I clank. Want me to stop? Didn't think so."],
  },
  moss: { ask: 'Say something for once, Moss.', answer: ['No.', '...Rude.'] },
};

// ---- "What was your dream?" (author, Oct 7, 2026): "If you ask a character and it's not their time,
// they will reveal a little bit, but not much. They will reveal their full dream during their arc."
// Brannoc's arc is Season 1's: once the Painters' School flashback has played, he tells you all of it
// (STORY.md, "Brannoc's dream"). The other seven get their arcs later: a teaser each for now, true to
// their character file and giving nothing away. Their full dreams are the author's to write.

/** Set when the Painters' School flashback plays (Brannoc's arc): from then on he tells you his dream. */
export const BRANNOC_FLASHBACK = 'brannoc-flashback';

/** Not their time yet: a little, not much. */
const DREAM_TEASER: Record<string, string[]> = {
  brannoc: ['Paint, maybe. Somewhere quiet.', '...That is all I shall say. A man must keep some mystery.'],
  ysolde: [
    'Mine had no ledger in it. Imagine that.',
    "...Don't. It's not itemised yet. I'll show you when the numbers are right.",
  ],
  quill: [
    'I wrote it down. Forty pages, with footnotes.',
    "Footnote one: you may read it when it's finished. It isn't finished.",
  ],
  wren: [
    "I'll tell you when I'm sure of it.",
    "You'll know. The lantern will be very bright. ...It's fairly dim at the moment.",
  ],
  oren: ['* She turns her prayer beads until her thumb finds the gap where one is missing.', 'Another day.'],
  pip: [
    "It's a song! I just haven't got the last verse.",
    'Every time I get close, I change the ending. Ask me later!',
  ],
  tamsin: ["Don't have dreams. Have plans.", "...Fine. One. It's on a napkin somewhere. Don't go looking for it."],
  moss: ['...Tuft knows.', "Tuft isn't telling either."],
};

/** His arc has reached it: the whole dream, in his own words (STORY.md, "Brannoc's dream"). */
const BRANNOC_DREAM = [
  'I have told no one this. Not even Sweetheart.',
  'I dreamt I lived in the city, alone, in rooms full of books and paint. Nobody bowed. Nobody knew my name.',
  'I was a teacher. A professor! Boys and girls who argued with me, and thought for themselves, and did what was best for the kingdom, and what was best for themselves.',
  'I was no prince. There was no war to lead. The kingdom was at peace, and only my students knew me.',
  'My mother and father were alive. Mother was cross with me: no grandchild yet, and was I even trying?',
  'Father laughed and told her to stop rushing the boy. Then he took me aside and asked if I needed any advice.',
  'I laughed. In the dream I laughed and laughed.',
  'I never wanted the power, you see. Only the freedom. ...There. Now you know. Do not tell Quill. He will want footnotes.',
];

/** What they tell you of their dream: all of it in their arc, a little before then. */
export function dreamFor(id: CharacterId, flags: string[]): string[] {
  if (id === 'brannoc' && flags.includes(BRANNOC_FLASHBACK)) return BRANNOC_DREAM;
  return DREAM_TEASER[id] ?? ['Ask me another time.'];
}

/** What they say back: how it's going, the guide's next step in their words, their dream, and the mean one. */
export function roomQuestions(id: CharacterId, a: Adventure, next: string): Question[] {
  const voice = VOICE[id];
  const mean = MEAN[id];
  return [
    { ask: ADVENTURE_ASK, answer: soFar(id, a) },
    { ask: NEXT_ASK, answer: [`${voice?.next ?? 'Next:'} ${next.charAt(0).toLowerCase()}${next.slice(1)}`] },
    { ask: DREAM_ASK, answer: dreamFor(id, a.flags) },
    ...(mean ? [{ ...mean, deed: 'bad' as const }] : []),
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

/**
 * The Archive or a hero's room, with each hero in one place today: the hall or their room. King
 * Brannoc, ruling until he catches you up (castle.ts), is in neither.
 */
export function withRoster(map: WorldMap, day: number, flags: string[] = []): WorldMap {
  if (brannocAway(flags))
    map = withoutNpcs(
      map,
      map.npcs.filter((n) => n.character === 'brannoc').map((n) => n.id),
    );
  if (map.id === 'archive')
    return withoutNpcs(
      map,
      map.npcs.filter((n) => n.id.startsWith('hall-') && !outToday(n.id.slice('hall-'.length), day)).map((n) => n.id),
    );
  const owner = roomOwner(map.id);
  return owner && outToday(owner, day)
    ? withoutNpcs(
        map,
        map.npcs.filter((n) => n.character === owner).map((n) => n.id),
      )
    : map;
}

/** Today, as a day count (local midnight to midnight). */
export const dayNumber = (now = new Date()) => Math.floor((now.getTime() - now.getTimezoneOffset() * 60000) / 86400000);

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
        'A chamber of my own? With a door that bolts from the INSIDE?',
        'I thank you. For the cell. For coming back for me. I have begun a list of things I do not fear. It has one thing on it now.',
      ],
    },
    {
      id: 'brannoc-lv10',
      when: { level: 10 },
      lines: ['I felt that. Are my arms grown greater? Do not answer. Yes. Answer.'],
    },
    {
      id: 'brannoc-lv20',
      when: { level: 20 },
      lines: ['I tried the swing. Awake, this time.', 'I felled a bookshelf. Quill is furious. I am overjoyed.'],
    },
    {
      id: 'brannoc-king',
      when: { flag: 'kaldor-beaten' },
      lines: [
        'We bested the Kingbreaker. Me. Brannoc the Fainter.',
        'I did not faint once. I very nearly did. Twice. But I did not.',
      ],
    },
    {
      // back from his throne (castle.ts): ruling by raven
      id: 'brannoc-remote',
      when: { flag: 'brannoc-rejoined' },
      lines: [
        'Three ravens this morning. The advisor asks whether building a moat counts as causing a problem.',
        'I replied: it depends on the moat. Then I put a candle in the window so they know I am "in the office".',
        'I do not know what an office is. But I am in it.',
      ],
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
