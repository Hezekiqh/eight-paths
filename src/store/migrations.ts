import {
  DIMENSIONS,
  MAX_REST_TOKENS,
  formatTime,
  parseTime,
  type Completion,
  type Dimension,
  type Player,
  type Quest,
  type RestDay,
} from '@/game';

import type { GameData } from './index';

/**
 * Bump this whenever the saved shape changes, and add a migration from the
 * previous version below. Never edit a migration once it has shipped.
 */
export const SAVE_VERSION = 1;

type RawSave = Record<string, unknown>;
export type Migration = (save: RawSave) => RawSave;

/** Keyed by the version being migrated FROM: `1: (v1) => v2`. */
export const MIGRATIONS: Record<number, Migration> = {};

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
    classDimension: raw.classDimension,
    restTokens: Math.min(MAX_REST_TOKENS, Math.max(0, Math.round(tokens))),
    onboardedAt: isDateKey(raw.onboardedAt) ? raw.onboardedAt : '1970-01-01',
    tutorialComplete: raw.tutorialComplete === true,
    notificationTime: formatTime(time.hour, time.minute),
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
  return { id: raw.id, questId: raw.questId, dimension: raw.dimension, date: raw.date, xp: raw.xp };
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
