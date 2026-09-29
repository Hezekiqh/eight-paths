/**
 * The Keeper's track record on this phone (NOTIFICATIONS.md, N5): which lines
 * were sent, opened, and followed by a quest. Pure, so it can be tested
 * without the notification module. Nothing here leaves the phone.
 */

import type { LineRecord } from '@/game';

/** A completion this soon after a call counts as the call working. */
export const CONVERSION_WINDOW_MS = 2 * 60 * 60 * 1000;

/** A line sent this recently rests before it's used again. */
export const RECENT_DAYS = 10;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Sends kept for recent-line and conversion checks. */
const LOG_LIMIT = 100;

/** Opened notification ids kept so a tap is never counted twice. */
const OPENED_LIMIT = 50;

export type LineStats = LineRecord & { conversions: number };

export type SentCall = { lineId: string; at: number; opened: boolean; converted: boolean };

/** A scheduled call: when it will fire, what it says, and its notification id. */
export type PendingCall = { lineId: string; at: number; body?: string; id?: string };

/** How the last re-plan went, so a silent failure shows up in Settings. */
export type SyncReport = { at: number; scheduled: number; failed: number; error?: string };

export type KeeperStats = {
  lines: Record<string, LineStats>;
  /** Calls that have fired, newest last. */
  log: SentCall[];
  /** Calls scheduled by the last plan. */
  pending: PendingCall[];
  /** Notification ids already counted as opened. */
  openedIds: string[];
  lastSync?: SyncReport;
};

export const EMPTY_STATS: KeeperStats = { lines: {}, log: [], pending: [], openedIds: [] };

const bump = (stats: KeeperStats, lineId: string, field: keyof LineStats): Record<string, LineStats> => {
  const line = stats.lines[lineId] ?? { sends: 0, opens: 0, conversions: 0 };
  return { ...stats.lines, [lineId]: { ...line, [field]: line[field] + 1 } };
};

/**
 * Counts every pending call whose time has come as sent. A call is only
 * cancelled by re-planning, which always runs this first, so a call still
 * pending after its time really fired.
 */
export function settleSent(stats: KeeperStats, now: number): KeeperStats {
  const fired = stats.pending.filter((p) => p.at <= now);
  if (fired.length === 0) return stats;
  let next: KeeperStats = { ...stats, pending: stats.pending.filter((p) => p.at > now) };
  for (const call of fired) {
    next = {
      ...next,
      lines: bump(next, call.lineId, 'sends'),
      log: [...next.log, { lineId: call.lineId, at: call.at, opened: false, converted: false }].slice(-LOG_LIMIT),
    };
  }
  return next;
}

/** Replaces the pending calls with a new plan (after settling the old one). */
export function withPending(stats: KeeperStats, pending: PendingCall[], now: number): KeeperStats {
  return { ...settleSent(stats, now), pending };
}

/** A tap on a call. Counted once per notification. */
export function recordOpen(stats: KeeperStats, lineId: string, notificationId: string, firedAt: number): KeeperStats {
  if (stats.openedIds.includes(notificationId)) return stats;
  const settled = settleSent(stats, firedAt);
  const log = [...settled.log];
  const i = log.findLastIndex((c) => c.lineId === lineId && !c.opened);
  if (i >= 0) log[i] = { ...log[i], opened: true };
  return {
    ...settled,
    lines: bump(settled, lineId, 'opens'),
    log,
    openedIds: [...settled.openedIds, notificationId].slice(-OPENED_LIMIT),
  };
}

/** A quest completed at `now`: the calls sent in the two hours before it worked. */
export function recordCompletion(stats: KeeperStats, now: number): KeeperStats {
  const settled = settleSent(stats, now);
  let { lines } = settled;
  const log = settled.log.map((call) => {
    if (call.converted || call.at > now || now - call.at > CONVERSION_WINDOW_MS) return call;
    lines = bump({ ...settled, lines }, call.lineId, 'conversions');
    return { ...call, converted: true };
  });
  return log.some((c, i) => c !== settled.log[i]) ? { ...settled, lines, log } : settled;
}

/** Lines sent in the last 10 days. */
export function recentLines(stats: KeeperStats, now: number): string[] {
  return [...new Set(stats.log.filter((c) => now - c.at < RECENT_DAYS * DAY_MS).map((c) => c.lineId))];
}
