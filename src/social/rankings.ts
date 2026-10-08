import { CLASSES, DIMENSIONS, type Dimension } from '@/game';
import { COMPANIONS, ROSTER, STARTERS, isCharacterId, type CharacterId, type Rarity } from '@/story/companions';

/** Copies of each hero a player holds right now. */
export type Holdings = Partial<Record<CharacterId, number>>;

/** A player on a ranking, real or one of the rivals. */
export type RankedPlayer = {
  userId: string;
  username: string;
  founderNumber: number | null;
  leader: string | null;
  level: number;
  holdings: Holdings;
  /** One of the made-up players that fill the lists (never sent to the server). */
  rival?: boolean;
};

/** A niche ranking: what it's called, and how a collection scores on it. */
export type Board = {
  id: string;
  title: string;
  /** One line on what counts. */
  blurb: string;
  /** "3 of 8", "5 heroes", ... */
  unit: (score: number) => string;
  score: (holdings: Holdings) => number;
  /** The hero to show beside a player: their leader, unless the board is about one hero. */
  face?: (holdings: Holdings) => CharacterId | null;
};

const held = (h: Holdings) => (Object.keys(h) as CharacterId[]).filter((id) => isCharacterId(id) && (h[id] ?? 0) > 0);
const heroes = (n: number) => `${n} ${n === 1 ? 'hero' : 'heroes'}`;
const STARS: Rarity[] = [5, 4, 3, 2, 1];
const KINDS = DIMENSIONS.length * STARS.length;

/** The hero a player holds most copies of (lowest collection number on a tie). */
function mostCopied(h: Holdings): CharacterId | null {
  let best: CharacterId | null = null;
  for (const id of held(h)) {
    const n = h[id] ?? 0;
    const b = best ? (h[best] ?? 0) : 0;
    if (n > b || (n === b && best && COMPANIONS[id].number < COMPANIONS[best].number)) best = id;
  }
  return best;
}

/** Every ranking a player can follow, in the order the picker shows them. */
export const BOARDS: Board[] = [
  {
    id: 'first-8',
    title: 'The First 8',
    blurb: 'The most of the eight protagonists',
    unit: (n) => `${n} of 8`,
    score: (h) => held(h).filter((id) => COMPANIONS[id].kind === 'core').length,
  },
  ...DIMENSIONS.map(
    (d: Dimension): Board => ({
      id: `path-${d}`,
      title: `Most ${CLASSES[d].className}s`,
      blurb: `The most ${CLASSES[d].className} heroes`,
      unit: heroes,
      score: (h) => held(h).filter((id) => COMPANIONS[id].dimension === d).length,
    }),
  ),
  ...STARS.map(
    (r): Board => ({
      id: `stars-${r}`,
      title: `Most ${r}★`,
      blurb: `The most ${r}-star heroes`,
      unit: heroes,
      score: (h) => held(h).filter((id) => COMPANIONS[id].rarity === r).length,
    }),
  ),
  {
    id: 'one-kind',
    title: 'Most of One Kind',
    blurb: 'The most copies of a single hero',
    unit: (n) => `${n} ${n === 1 ? 'copy' : 'copies'}`,
    score: (h) => {
      const top = mostCopied(h);
      return top ? (h[top] ?? 0) : 0;
    },
    face: mostCopied,
  },
  {
    id: 'diverse',
    title: 'Most Diverse',
    blurb: `Heroes from the most Paths and star tiers (${KINDS} kinds in all)`,
    unit: (n) => `${n} of ${KINDS} kinds`,
    score: (h) => new Set(held(h).map((id) => `${COMPANIONS[id].dimension}:${COMPANIONS[id].rarity}`)).size,
  },
];

export const BOARD_BY_ID = Object.fromEntries(BOARDS.map((b) => [b.id, b])) as Record<string, Board>;

/** New players follow these until they choose their own. */
export const DEFAULT_BOARDS = ['first-8', 'stars-5'];

export type BoardRow = { player: RankedPlayer; score: number; face: string | null };

/**
 * A ranking, best first: players who score nothing are left off (except
 * `meId`, who's always there). Ties go to the bigger collection, then the name.
 */
export function rankBoard(board: Board, players: RankedPlayer[], meId: string | null): BoardRow[] {
  return players
    .map((player) => ({
      player,
      score: board.score(player.holdings),
      face: board.face?.(player.holdings) ?? player.leader,
      size: held(player.holdings).length,
    }))
    .filter((r) => r.score > 0 || r.player.userId === meId)
    .sort((a, b) => b.score - a.score || b.size - a.size || a.player.username.localeCompare(b.player.username))
    .map(({ player, score, face }) => ({ player, score, face }));
}

/**
 * Collection value, as the server works it out: each hero is worth more the
 * fewer players have woken it (5 to 100). `wokenBy` and `players` come from
 * character_stats; heroes nobody has woken yet are worth the full 100.
 */
export function collectionValue(h: Holdings, stats: Record<string, { wokenBy: number; players: number }>): number {
  return held(h).reduce((sum, id) => {
    const s = stats[id];
    if (!s || s.players <= 0) return sum + 100;
    return sum + Math.max(5, Math.round(100 * (1 - (s.wokenBy - 1) / s.players)));
  }, 0);
}

// ---------------------------------------------------------------- rivals

/**
 * Made-up players that fill the rankings while the game is young: all new,
 * each with 5 to 20 heroes. Names nod to Zelda, Mario, Undertale, Pokémon,
 * Grand Theft Auto and Mortal Kombat. They live only on this phone.
 */
const RIVAL_NAMES = [
  'HeroOfTime',
  'TriforceTina',
  'NotZelda',
  'HyruleHank',
  'Navi_Says_Hey',
  'Plumber64',
  'ItsaMeMaria',
  'MushroomKing',
  'WarpPipeWes',
  'BowserJrJr',
  'StayDetermined',
  'BadTimeSans',
  'TemmieFlakes',
  'PapyrusSpaghet',
  'ProfOakFan',
  'Pika4Life',
  'GottaWakeEmAll',
  'TeamRocketJess',
  'CatchMeIfUCan',
  'GroveStreetCJ',
  'WastedAgain',
  'ViceCityVic',
  'LibertyLou',
  'FinishHim',
  'FlawlessVictory',
  'GetOverHere',
  'SubZeroCool',
  'FatalityFred',
];

/** Small, repeatable random numbers: the same rival always has the same heroes. */
function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261);

/** How often a new player wakes a hero of each star count. */
const RARITY_WEIGHT: Record<Rarity, number> = { 1: 40, 2: 28, 3: 18, 4: 9, 5: 3 };

function rival(name: string): RankedPlayer {
  const rand = seeded(hash(name));
  const count = 5 + Math.floor(rand() * 16);
  const holdings: Holdings = {};
  // Everyone starts as one of the four starters.
  holdings[STARTERS[Math.floor(rand() * STARTERS.length)]] = 1;
  const pool = ROSTER.filter((c) => c.kind !== 'legend');
  while (Object.keys(holdings).length < count) {
    const total = pool.reduce((s, c) => s + RARITY_WEIGHT[c.rarity], 0);
    let pick = rand() * total;
    const hero = pool.find((c) => (pick -= RARITY_WEIGHT[c.rarity]) <= 0) ?? pool[0];
    const roll = rand();
    holdings[hero.id] = (holdings[hero.id] ?? 0) + (roll < 0.05 ? 3 : roll < 0.25 ? 2 : 1);
  }
  const ids = held(holdings);
  const leader = ids.reduce((a, b) => (COMPANIONS[b].rarity > COMPANIONS[a].rarity ? b : a), ids[0]);
  return {
    userId: `rival:${name}`,
    username: name,
    founderNumber: null,
    leader,
    level: 2 + Math.floor(ids.length / 2 + rand() * 3),
    holdings,
    rival: true,
  };
}

export const RIVALS: RankedPlayer[] = RIVAL_NAMES.map(rival);
