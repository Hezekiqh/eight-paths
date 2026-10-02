import {
  DIMENSIONS,
  MAX_REST_TOKENS,
  formatTime,
  parseTime,
  type Boost,
  type Completion,
  type Dimension,
  type Goal,
  type XpGrant,
  type Player,
  type Quest,
  type RestDay,
} from '@/game';

import { COMPANIONS, DEFAULT_PARTY, STARTERS, isCharacterId, type CharacterId } from '@/story/companions';

import type { GameData } from './index';

/**
 * Bump this whenever the saved shape changes, and add a migration from the
 * previous version below. Never edit a migration once it has shipped.
 */
export const SAVE_VERSION = 11;

type RawSave = Record<string, unknown>;
export type Migration = (save: RawSave) => RawSave;

/** Keyed by the version being migrated FROM: `1: (v1) => v2`. */
export const MIGRATIONS: Record<number, Migration> = {
  // v2 adds the party. Everything earned so far was earned with the core
  // companions: sanitizeSave credits them on completions with no character.
  1: (save) => ({ ...save, party: DEFAULT_PARTY }),
  // v3 adds objectives, goals, shards and bonus XP; all start empty.
  2: (save) => save,
  // v4 adds the Vibration setting to the player; sanitizeSave turns it on.
  3: (save) => save,
  // v5 adds reveal tracking; null means "count everyone already unlocked as met".
  4: (save) => ({ ...save, revealed: null }),
  // v6 adds the Objectives layout choice to the player; sanitizeSave defaults it to upright.
  5: (save) => save,
  // v7 replaces fixed unlock levels with random arrivals every 3–5 Path levels.
  // owned null means "work out who was already unlocked" (reconcileDraws does it).
  6: (save) => ({ ...save, owned: null, nextDraw: {}, drops: [] }),
  // v8 adds Premium redos of waiting drops; sanitizeSave starts the list empty.
  7: (save) => save,
  // v9 adds completion times and the "at my usual time" reminder setting;
  // sanitizeSave turns it on only for players who never changed the 8 PM default.
  8: (save) => save,
  // v10 adds the player's own quest order; sanitizeSave starts it null (their usual order).
  9: (save) => save,
  // v11 adds trades: net copies traded and the server moves applied; sanitizeSave starts both empty.
  10: (save) => save,
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (v: unknown): v is RawSave => typeof v === 'object' && v !== null && !Array.isArray(v);
const isDimension = (v: unknown): v is Dimension =>
  typeof v === 'string' && (DIMENSIONS as readonly string[]).includes(v);
const isDateKey = (v: unknown): v is string => typeof v === 'string' && DATE_KEY.test(v);
const asArray = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

function cleanPlayer(raw: unknown): Player | null {
  if (!isObject(raw) || !isDimension(raw.classDimension)) return null;
  const tokens = typeof raw.restTokens === 'number' && Number.isFinite(raw.restTokens) ? raw.restTokens : 1;
  const time = typeof raw.notificationTime === 'string' ? parseTime(raw.notificationTime) : parseTime('');
  return {
    name: typeof raw.name === 'string' && raw.name.trim() ? raw.name : 'Adventurer',
    ...(isCharacterId(raw.origin) && STARTERS.includes(raw.origin) ? { origin: raw.origin } : {}),
    classDimension: raw.classDimension,
    restTokens: Math.min(MAX_REST_TOKENS, Math.max(0, Math.round(tokens))),
    onboardedAt: isDateKey(raw.onboardedAt) ? raw.onboardedAt : '1970-01-01',
    tutorialComplete: raw.tutorialComplete === true,
    notificationTime: formatTime(time.hour, time.minute),
    hapticsEnabled: raw.hapticsEnabled !== false,
    objectivesLandscape: raw.objectivesLandscape === true,
    // Someone who picked their own time keeps it; the untouched default learns.
    smartReminders:
      typeof raw.smartReminders === 'boolean' ? raw.smartReminders : formatTime(time.hour, time.minute) === '20:00',
  };
}

function cleanQuest(raw: unknown): Quest | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || !isDimension(raw.dimension)) return null;
  const days = asArray(raw.repeatDays).filter(
    (d): d is number => Number.isInteger(d) && (d as number) >= 0 && (d as number) <= 6,
  );
  return {
    id: raw.id,
    title: typeof raw.title === 'string' ? raw.title : 'Untitled quest',
    dimension: raw.dimension,
    repeatDays: [...new Set(days)].sort(),
    active: raw.active !== false,
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    ...(isDateKey(raw.archivedAt) ? { archivedAt: raw.archivedAt } : {}),
    ...(Array.isArray(raw.skippedOn) ? { skippedOn: [...new Set(raw.skippedOn.filter(isDateKey))] } : {}),
  };
}

function cleanCompletion(raw: unknown): Completion | null {
  if (
    !isObject(raw) ||
    typeof raw.id !== 'string' ||
    typeof raw.questId !== 'string' ||
    !isDimension(raw.dimension) ||
    !isDateKey(raw.date) ||
    typeof raw.xp !== 'number' ||
    !Number.isFinite(raw.xp) ||
    raw.xp < 0
  ) {
    return null;
  }
  return {
    id: raw.id,
    questId: raw.questId,
    dimension: raw.dimension,
    date: raw.date,
    xp: raw.xp,
    // Unknown or missing: credit the core companion, who held every slot first.
    characterId: isCharacterId(raw.characterId) ? raw.characterId : DEFAULT_PARTY[raw.dimension],
    ...(Number.isInteger(raw.at) && (raw.at as number) >= 0 && (raw.at as number) < 24 * 60 ? { at: raw.at as number } : {}),
  };
}

/** A character only stands on their own Path; anything else falls back to the core companion. */
function cleanParty(raw: unknown): Record<Dimension, CharacterId> {
  const save = isObject(raw) ? raw : {};
  return Object.fromEntries(
    DIMENSIONS.map((d) => {
      const id = save[d];
      return [d, isCharacterId(id) && COMPANIONS[id].dimension === d ? id : DEFAULT_PARTY[d]];
    }),
  ) as Record<Dimension, CharacterId>;
}

function cleanGrant(raw: unknown): XpGrant | null {
  if (
    !isObject(raw) ||
    typeof raw.id !== 'string' ||
    !isDateKey(raw.date) ||
    !isDimension(raw.dimension) ||
    typeof raw.xp !== 'number' ||
    !Number.isFinite(raw.xp) ||
    raw.xp < 0 ||
    (raw.source !== 'drop' && raw.source !== 'goal')
  ) {
    return null;
  }
  return {
    id: raw.id,
    date: raw.date,
    dimension: raw.dimension,
    xp: raw.xp,
    characterId: isCharacterId(raw.characterId) ? raw.characterId : DEFAULT_PARTY[raw.dimension],
    source: raw.source,
  };
}

function cleanBoost(raw: unknown): Boost | null {
  if (!isObject(raw) || !isDateKey(raw.date) || !isDimension(raw.dimension)) return null;
  return { date: raw.date, dimension: raw.dimension };
}

function cleanGoal(raw: unknown): Goal | null {
  if (!isObject(raw) || typeof raw.id !== 'string' || typeof raw.title !== 'string') return null;
  return {
    id: raw.id,
    title: raw.title,
    ...(isDimension(raw.dimension) ? { dimension: raw.dimension } : {}),
    ...(isDateKey(raw.dueDate) ? { dueDate: raw.dueDate } : {}),
    createdAt: isDateKey(raw.createdAt) ? raw.createdAt : '1970-01-01',
    ...(isDateKey(raw.completedAt) ? { completedAt: raw.completedAt } : {}),
  };
}

function cleanShards(raw: unknown): Partial<Record<CharacterId, number>> {
  if (!isObject(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(([id, n]) => isCharacterId(id) && typeof n === 'number' && Number.isInteger(n) && n > 0),
  );
}

/** Net traded copies: any non-zero whole number (negative when copies went out). */
function cleanTraded(raw: unknown): Partial<Record<CharacterId, number>> {
  if (!isObject(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(([id, n]) => isCharacterId(id) && Number.isInteger(n) && n !== 0),
  );
}

function cleanNextDraw(raw: unknown): Partial<Record<Dimension, number>> {
  if (!isObject(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(([d, n]) => isDimension(d) && typeof n === 'number' && Number.isFinite(n)),
  );
}

function cleanRestDay(raw: unknown): RestDay | null {
  if (!isObject(raw) || !isDateKey(raw.date)) return null;
  if (raw.dimension !== 'all' && !isDimension(raw.dimension)) return null;
  return { date: raw.date, dimension: raw.dimension };
}

const keep = <T>(items: unknown[], clean: (raw: unknown) => T | null) =>
  items.map(clean).filter((x): x is T => x !== null);

/**
 * Turns whatever came out of storage into valid game data: missing fields get
 * defaults and malformed entries are dropped, so one bad record can never
 * stop the app from loading or wipe the rest of the player's progress.
 */
export function sanitizeSave(raw: unknown): GameData {
  const save = isObject(raw) ? raw : {};
  return {
    player: cleanPlayer(save.player),
    quests: keep(asArray(save.quests), cleanQuest),
    completions: keep(asArray(save.completions), cleanCompletion),
    restDays: keep(asArray(save.restDays), cleanRestDay),
    lastSettledDate: isDateKey(save.lastSettledDate) ? save.lastSettledDate : null,
    party: cleanParty(save.party),
    xpGrants: keep(asArray(save.xpGrants), cleanGrant),
    boosts: keep(asArray(save.boosts), cleanBoost),
    shards: cleanShards(save.shards),
    claimed: asArray(save.claimed).filter((c): c is string => typeof c === 'string'),
    goals: keep(asArray(save.goals), cleanGoal),
    revealed: Array.isArray(save.revealed) ? save.revealed.filter(isCharacterId) : null,
    owned: isObject(save.owned) ? cleanShards(save.owned) : null,
    nextDraw: cleanNextDraw(save.nextDraw),
    drops: asArray(save.drops).filter(isCharacterId),
    redrawn: asArray(save.redrawn).filter(isCharacterId),
    questOrder: Array.isArray(save.questOrder)
      ? save.questOrder.filter((id): id is string => typeof id === 'string')
      : null,
    traded: cleanTraded(save.traded),
    tradeMoves: asArray(save.tradeMoves).filter((id): id is number => Number.isSafeInteger(id)),
  };
}

/**
 * Upgrades a save from `fromVersion` to SAVE_VERSION one step at a time, then
 * sanitizes it. A save from a newer build (fromVersion > SAVE_VERSION) is only
 * sanitized, so opening it in an older build keeps everything it understands.
 */
export function migrateSave(
  persisted: unknown,
  fromVersion: number,
  migrations: Record<number, Migration> = MIGRATIONS,
  toVersion: number = SAVE_VERSION,
): GameData {
  let save: RawSave = isObject(persisted) ? { ...persisted } : {};
  for (let v = fromVersion; v < toVersion; v += 1) {
    const step = migrations[v];
    if (step) save = step(save);
  }
  return sanitizeSave(save);
}
