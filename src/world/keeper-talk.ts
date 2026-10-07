import { SHOW_UP_MILESTONES } from '@/game/milestones';

import { KEEPER_TALK } from './keeper-talk-lines';
import { CHESTS, chestFlag } from './items';
import { fill, type HabitMemory } from './memory';

/** The Keeper's wobbly-shelf line, after Tamsin goes home (draft, WORLDS.md). */
const TAMSIN_GONE =
  'Tamsin came by for her other spanner before she went. She fixed the wobbly shelf while she was here. I miss the wobble.';

// What the Keeper says when you come back to the Archive: one new thing each
// time you talk to him, the most important first (like Hades' House), then
// his usual questions. Each reaction plays once (a keeper:<id> flag), except
// the habit ones, which come back when your record moves on (a longer
// streak, a new comeback). When nothing's new, a line from the rotation.

export type Trigger =
  | 'first-back-from-road'
  | 'plush-won'
  | 'kaldor-allowed'
  | 'kaldor-dethroned'
  | 'you-crowned'
  | 'first-fall'
  | 'first-heart-piece'
  | 'whole-heart'
  | 'first-candle'
  | 'dessa-letter'
  | 'season-done';

export type KeeperContext = {
  /** The World's story flags (keeper:<id> marks what he's said). */
  flags: string[];
  discovered: string[];
  /** Candles rested at outside the Archive. */
  candlesAway: number;
  heartPieces: number;
  memory: HabitMemory;
  /** Today, as a day number, to turn the rotation. */
  day: number;
  /** Who you're walking as: Brannoc hears about the throne as his own. */
  hero?: string;
};

/** In order of importance: the story's biggest news first. */
const PRIORITY: { when: Trigger; happened: (c: KeeperContext) => boolean }[] = [
  { when: 'season-done', happened: (c) => c.flags.includes('season-1') },
  { when: 'kaldor-allowed', happened: (c) => c.flags.includes('kaldor-allowed') },
  // the throne went to you, not Brannoc (author, Oct 4, 2026)
  { when: 'you-crowned', happened: (c) => c.flags.includes('you-king') },
  { when: 'kaldor-dethroned', happened: (c) => c.flags.includes('kaldor-dethroned') && !c.flags.includes('you-king') },
  { when: 'plush-won', happened: (c) => c.flags.includes('plush-won') },
  { when: 'dessa-letter', happened: (c) => c.flags.includes(chestFlag(DESSA_CHEST)) },
  { when: 'whole-heart', happened: (c) => c.heartPieces >= 4 },
  { when: 'first-heart-piece', happened: (c) => c.heartPieces >= 1 },
  { when: 'first-fall', happened: (c) => c.flags.includes('fallen') },
  { when: 'first-candle', happened: (c) => c.candlesAway > 0 },
  { when: 'first-back-from-road', happened: (c) => c.discovered.includes('courier-road') },
];

/** The story, in order: only the latest step that's happened gets his reaction (no "welcome back from the road" after Kaldor). */
const STORY: Trigger[] = [
  'first-back-from-road',
  'plush-won',
  'kaldor-allowed',
  'kaldor-dethroned',
  'you-crowned',
  'season-done',
];

/** The chest Dessa's letter is in. */
const DESSA_CHEST = CHESTS.find((ch) => ch.item === 'dessa-letter')?.id ?? '';

const STREAK_MARKS = [7, 14, 30, 60, 100, 200, 365];

/** A habit line to say, keyed so it plays once per step of your record. */
function habitLine(m: HabitMemory, flags: string[], day: number): { id: string; line: string } | null {
  const pick = (key: string, variant: number) => {
    const lines = KEEPER_TALK.habits[key] ?? [];
    return lines.length > 0 ? lines[variant % lines.length] : null;
  };
  const candidates: { id: string; key: string; values: Record<string, string | number | undefined> }[] = [];
  if (m.comeback && m.comeback.endedDaysAgo <= 7)
    candidates.push({
      id: `comeback-${m.comeback.month}-${m.comeback.gap}`,
      key: 'comeback',
      values: { gap: m.comeback.gap, month: m.comeback.month },
    });
  const mark = [...STREAK_MARKS].reverse().find((n) => m.streak >= n);
  if (mark) candidates.push({ id: `streak-${mark}`, key: 'streak', values: { n: m.streak } });
  if (m.streak >= 5 && m.streak === m.best)
    candidates.push({ id: `best-${m.best}`, key: 'best', values: { n: m.best } });
  const shown = [...SHOW_UP_MILESTONES].reverse().find((n) => n >= 30 && m.days >= n);
  if (shown) candidates.push({ id: `shown-${shown}`, key: 'shownUp', values: { days: shown } });
  if (m.strongest && m.strongest.level >= 10)
    candidates.push({
      id: `strongest-${m.strongest.dimension}-${Math.floor(m.strongest.level / 10)}`,
      key: 'strongest',
      values: { path: m.strongest.name, level: m.strongest.level },
    });
  if (m.days <= 3) candidates.push({ id: 'newcomer', key: 'newcomer', values: {} });
  for (const c of candidates) {
    if (flags.includes(`keeper:${c.id}`)) continue;
    const template = pick(c.key, day);
    const line = template ? fill(template, c.values) : null;
    if (line) return { id: c.id, line };
  }
  return null;
}

/** What the Keeper opens with this time, and the flag that marks it said (if any). */
export function keeperTalk(c: KeeperContext): { lines: string[]; said: string | null } {
  const latest = [...STORY].reverse().find((t) => PRIORITY.find((p) => p.when === t)!.happened(c));
  for (const p of PRIORITY) {
    if (!p.happened(c)) continue;
    if (STORY.includes(p.when) && p.when !== latest) continue;
    const moments = KEEPER_TALK.moments.filter((m) => m.when === p.when);
    const unsaid = moments.find((m) => !c.flags.includes(`keeper:${m.id}`));
    if (unsaid)
      return {
        lines: (c.hero === 'brannoc' && unsaid.asBrannoc) || unsaid.lines,
        said: `keeper:${unsaid.id}`,
      };
  }
  const habit = habitLine(c.memory, c.flags, c.day);
  if (habit) return { lines: [habit.line], said: `keeper:${habit.id}` };
  // Once Tamsin has gone home (the party split), she isn't about to fix anything here.
  const ambient = c.flags.includes('left:tamsin')
    ? KEEPER_TALK.ambient.map((l) => (l.startsWith('Tamsin says') ? TAMSIN_GONE : l))
    : KEEPER_TALK.ambient;
  return { lines: ambient.length > 0 ? [ambient[c.day % ambient.length]] : [], said: null };
}
