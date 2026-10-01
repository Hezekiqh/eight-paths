import { COMPANIONS, DEFAULT_PARTY, type CharacterId } from '@/story/companions';

import type { GameData } from './index';

/** One copy of a hero moving in (+1) or out (-1) by trade, as the server recorded it. */
export type TradeMove = { id: number; characterId: CharacterId; delta: 1 | -1 };

type TradeState = Pick<GameData, 'owned' | 'party' | 'drops' | 'redrawn' | 'traded' | 'tradeMoves'>;

/** `list` without its last `item`. */
function withoutLast<T>(list: T[], item: T): T[] {
  const i = list.lastIndexOf(item);
  return i < 0 ? list : [...list.slice(0, i), ...list.slice(i + 1)];
}

/**
 * Applies the server's trade moves that this save hasn't seen yet, each once,
 * by id. A save restored from a backup made before a trade replays it, so a
 * traded copy can't come back.
 *
 * - An arriving copy joins the collection and waits for its hatch like any
 *   drop, marked as not redoable (Premium redos are for draws, not trades).
 * - A leaving copy is taken away, along with a waiting hatch if there are now
 *   more hatches than copies. If it was the last copy and the hero stood on
 *   their Path, the Path's core companion steps back in.
 *
 * `traded` keeps the net change actually applied, so the copies a player woke
 * themselves are always `owned - traded` (see earnedCopies).
 * Returns the changes, or null when there's nothing new.
 */
export function applyTradeMoves(state: TradeState, moves: TradeMove[]): Partial<TradeState> | null {
  const seen = new Set(state.tradeMoves);
  const fresh = moves.filter((m) => !seen.has(m.id) && COMPANIONS[m.characterId]).sort((a, b) => a.id - b.id);
  if (fresh.length === 0) return null;

  const owned = { ...(state.owned ?? {}) };
  const traded = { ...state.traded };
  const party = { ...state.party };
  let drops = [...state.drops];
  let redrawn = [...state.redrawn];

  for (const { characterId: id, delta } of fresh) {
    const had = owned[id] ?? 0;
    const now = Math.max(0, had + delta);
    if (now === had) continue;
    if (now > 0) owned[id] = now;
    else delete owned[id];
    const net = (traded[id] ?? 0) + (now - had);
    if (net !== 0) traded[id] = net;
    else delete traded[id];

    if (delta > 0) {
      drops.push(id);
      redrawn.push(id);
      continue;
    }
    // Never more waiting hatches than copies held.
    while (drops.filter((d) => d === id).length > now) {
      drops = withoutLast(drops, id);
      redrawn = withoutLast(redrawn, id);
    }
    const path = COMPANIONS[id].dimension;
    if (now === 0 && party[path] === id) party[path] = DEFAULT_PARTY[path];
  }

  return {
    owned,
    traded,
    party,
    drops,
    redrawn,
    tradeMoves: [...state.tradeMoves, ...fresh.map((m) => m.id)],
  };
}

/**
 * How many copies of each hero the player has woken themselves and seen hatch:
 * what the phone reports to the server. Copies still waiting to hatch aren't
 * counted yet (a Premium redo could still swap them), nor are traded ones.
 */
export function earnedCopies(state: Pick<GameData, 'owned' | 'drops' | 'traded'>): Partial<Record<CharacterId, number>> {
  const earned: Partial<Record<CharacterId, number>> = {};
  for (const [id, copies] of Object.entries(state.owned ?? {}) as [CharacterId, number][]) {
    const waiting = state.drops.filter((d) => d === id).length;
    const n = copies - waiting - (state.traded[id] ?? 0);
    if (n > 0) earned[id] = n;
  }
  return earned;
}
