import { seededRoll, type Consistency, type Dimension } from '@/game';

import type { Question } from './maps';

// The Keeper, in the Archive, talking about how you're really doing: your
// streak and consistency, who's carrying the party, who's lagging, and who
// on the bench deserves a turn. Same voice as his notifications
// (KEEPER-LINES.md): warm, a little wry, never shaming, never inventing
// stakes. Drafts until the author approves them.

export const HOW_ASK = 'How am I doing?';
export const PARTY_ASK = 'Who should I bring along?';

export type KeeperHero = {
  name: string;
  /** Their own level (XP earned while in the party). */
  level: number;
  /** The class name the Path is known by ("Warrior"). */
  path: string;
  dimension: Dimension;
};

export type KeeperFacts = {
  today: string;
  name: string;
  /** The current showing-up streak, and the best ever. */
  streak: number;
  best: number;
  /** This week's consistency next to last week's. */
  week: { current: Consistency; previous: Consistency };
  /** Whoever stands on each Path right now. */
  party: KeeperHero[];
  /** Woken heroes who aren't in the party. */
  bench: KeeperHero[];
  /** The Path kept least well over the last 30 days, when it's slipping. */
  dusty: { path: string; hero: string } | null;
};

/** One of `options`, the same all day and different tomorrow. */
function pick<T>(options: T[], today: string, salt: string): T {
  return options[Math.floor(seededRoll(`${today}:${salt}`) * options.length)];
}

const fill = (text: string, vars: Record<string, string | number>) =>
  text.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ''));

/** What he says about your habits: the streak first, then the week. */
export function habitLine(f: KeeperFacts): string {
  const vars = { name: f.name, streak: f.streak, best: f.best };
  const { current, previous } = f.week;
  if (f.streak >= 14) {
    return fill(
      pick(
        [
          "{streak} days in a row, {name}. I've stopped pretending I'm not impressed.",
          "{streak} days. I had to start a second page just for your streak. I'm not complaining.",
        ],
        f.today,
        'streak14',
      ),
      vars,
    );
  }
  if (f.streak >= 7) {
    return fill(
      pick(
        [
          "{streak} days running. That's not luck any more, {name}. That's a habit.",
          '{streak} days. The party has started setting their clocks by you.',
        ],
        f.today,
        'streak7',
      ),
      vars,
    );
  }
  if (f.streak >= 3) {
    return fill(
      pick(
        [
          "{streak} days in a row. I've started leaving the lantern on for you.",
          "{streak} days. Small, steady, real. That's how all the good things start.",
        ],
        f.today,
        'streak3',
      ),
      vars,
    );
  }
  if (f.best >= 7 && f.streak < 3) {
    return fill("Your best run was {best} days. You've done it before. That was the hard part.", vars);
  }
  if (current.rate !== null && current.rate >= 0.8) {
    return "You've kept nearly everything you set yourself this week. The records are getting heavy. I don't mind.";
  }
  if (current.rate !== null && previous.rate !== null && current.rate > previous.rate) {
    return 'Better than last week. Not by a lot. By enough.';
  }
  if (current.rate !== null && previous.rate !== null && current.rate < previous.rate) {
    return "A quieter week than the last. Weeks are like that. The next one hasn't been written yet.";
  }
  return fill("Today's page is still open, {name}. One small thing, and I'll write it down.", vars);
}

/** Who's carrying the party, if anyone has pulled ahead. */
export function strongestLine(f: KeeperFacts): string | null {
  const top = [...f.party].sort((a, b) => b.level - a.level)[0];
  const second = [...f.party].sort((a, b) => b.level - a.level)[1];
  if (!top || top.level < 2 || (second && second.level === top.level)) return null;
  return fill(
    pick(
      [
        "{hero} is carrying the {path} Path. Level {level}. Don't tell them I said so, it'll go straight to their head.",
        "{hero}'s at level {level} now. They walked past me this morning like they owned the Archive.",
        'Level {level}, {hero}. Your {path} habits are showing, {name}. In the good way.',
      ],
      f.today,
      'strongest',
    ),
    { hero: top.name, level: top.level, path: top.path, name: f.name },
  );
}

/** Who's lagging: a Path gone quiet, or the lowest level in the party. */
export function weakestLine(f: KeeperFacts): string | null {
  if (f.dusty) {
    return fill(
      pick(
        [
          "The {path} Path has gone a bit dusty. {hero} hasn't complained. Much.",
          "{hero} keeps asking when the {path} Path is getting walked again. I said I'd pass it on. Consider it passed.",
        ],
        f.today,
        'dusty',
      ),
      f.dusty,
    );
  }
  const sorted = [...f.party].sort((a, b) => a.level - b.level);
  const low = sorted[0];
  const high = sorted[sorted.length - 1];
  if (!low || !high || high.level - low.level < 2) return null;
  return fill(
    pick(
      [
        "{hero} is still level {level}. A {path} quest or two would do them good. They're keener than they look.",
        "{hero}'s the quiet one at level {level}. Give the {path} Path some time and watch them surprise you.",
      ],
      f.today,
      'weakest',
    ),
    { hero: low.name, level: low.level, path: low.path },
  );
}

/** Party advice: a bench hero who'd outdo their Path's current walker, or just someone who'd be fun. */
export function partyLines(f: KeeperFacts): string[] {
  const walker = (d: Dimension) => f.party.find((p) => p.dimension === d);
  const better = f.bench
    .filter((b) => b.level > (walker(b.dimension)?.level ?? 0))
    .sort((a, b) => b.level - a.level)[0];
  if (better) {
    const now = walker(better.dimension)!;
    return [
      fill('{hero} has more miles in them than {now} right now. Level {level} to {nowLevel}.', {
        hero: better.name,
        now: now.name,
        level: better.level,
        nowLevel: now.level,
      }),
      fill("Might be worth a swap on the {path} Path. {now} won't sulk. Probably.", {
        path: better.path,
        now: now.name,
      }),
    ];
  }
  if (f.bench.length > 0) {
    const hero = pick(f.bench, f.today, 'bench');
    const vars = { hero: hero.name, path: hero.path, now: walker(hero.dimension)?.name ?? 'whoever' };
    return [
      fill(
        pick(
          [
            "Have you tried bringing {hero}? They've been sitting by the door with their boots on for days.",
            '{hero} asked me to mention them. Twice. This is me mentioning them.',
            'Bring {hero} along on the {path} Path sometime. The road is livelier with them. Louder, too.',
            "{hero} and {now} both want the {path} Path. I'm staying out of it. But {hero} did bring me tea.",
          ],
          f.today,
          'fun',
        ),
        vars,
      ),
      'Swap them in from your collection, whenever you like. No one stays offended for long.',
    ];
  }
  return [
    "You've only the eight so far. Good company, mind you.",
    'Keep walking your Paths. Every few levels, someone new wakes up and wants to come along.',
  ];
}

/** One remark to open with, rotating by day between his topics. */
export function keeperRemark(f: KeeperFacts): string[] {
  const topics = [habitLine(f), strongestLine(f), weakestLine(f)].filter((l): l is string => l !== null);
  if (f.bench.length > 0) topics.push(partyLines(f)[0]);
  return [pick(topics, f.today, 'remark')];
}

/** His two questions about you, added to the ones in archive.json. */
export function keeperQuestions(f: KeeperFacts): Question[] {
  const how = [habitLine(f), strongestLine(f), weakestLine(f)].filter((l): l is string => l !== null);
  return [
    { ask: HOW_ASK, answer: how },
    { ask: PARTY_ASK, answer: partyLines(f) },
  ];
}
