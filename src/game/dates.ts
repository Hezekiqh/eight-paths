// Dates are local calendar days stored as 'YYYY-MM-DD'. Arithmetic runs in UTC
// on those keys so daylight-saving shifts never skip or repeat a day.

const MS_PER_DAY = 86_400_000;

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

function utcToKey(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function addDays(key: string, days: number): string {
  return utcToKey(keyToUtc(key) + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (positive when `to` is later). */
export function daysBetween(from: string, to: string): number {
  return Math.round((keyToUtc(to) - keyToUtc(from)) / MS_PER_DAY);
}

/** 0 = Sunday … 6 = Saturday. */
export function dayOfWeek(key: string): number {
  return new Date(keyToUtc(key)).getUTCDay();
}

/** Parses 'HH:MM' (24-hour); falls back to 20:00 for anything malformed. */
export function parseTime(time: string): { hour: number; minute: number } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return { hour: 20, minute: 0 };
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return { hour: 20, minute: 0 };
  return { hour, minute };
}

export function formatTime(hour: number, minute: number): string {
  return `${pad(hour)}:${pad(minute)}`;
}

/** Milliseconds from `now` until the next local midnight (always > 0). */
export function msUntilNextMidnight(now: Date): number {
  const next = new Date(now);
  next.setHours(24, 0, 0, 0);
  return next.getTime() - now.getTime();
}
