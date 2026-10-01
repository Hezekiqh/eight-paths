import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { CharacterId } from '@/story/companions';

import { useSocial } from './store';

/** A finished trade to show: who it was with, and which copies left and arrived. */
export type TradeMoment = { tradeId: string; partner: string; left: CharacterId[]; arrived: CharacterId[] };

/** A trade move as the server lists it, with the trade it belongs to and when. */
export type MoveRow = { id: number; characterId: CharacterId; delta: 1 | -1; tradeId: string | null; createdAt: string };

/** Only trades this recent get their moment: a new phone doesn't replay a year of trades. */
export const MOMENT_DAYS = 3;
/** How many seen ids to remember of each kind. */
const KEEP = 200;

/**
 * Groups trade moves this save hasn't applied into one moment per trade,
 * skipping trades already shown (a restored backup replays moves, not moments)
 * and ones older than MOMENT_DAYS. `partners` names the other player per trade.
 */
export function momentsFrom(
  fresh: MoveRow[],
  seen: string[],
  partners: Record<string, string>,
  now = Date.now(),
): TradeMoment[] {
  const cutoff = now - MOMENT_DAYS * 24 * 60 * 60 * 1000;
  const byTrade = new Map<string, TradeMoment>();
  for (const m of fresh) {
    if (!m.tradeId || seen.includes(m.tradeId) || Date.parse(m.createdAt) < cutoff) continue;
    const moment = byTrade.get(m.tradeId) ?? {
      tradeId: m.tradeId,
      partner: partners[m.tradeId] ?? 'a friend',
      left: [],
      arrived: [],
    };
    (m.delta > 0 ? moment.arrived : moment.left).push(m.characterId);
    byTrade.set(m.tradeId, moment);
  }
  return [...byTrade.values()];
}

type NoticeState = {
  /** Trades whose moment has been shown (or queued), so it never shows twice. */
  seenTrades: string[];
  /** Offers received that the player has seen on the Social tab (the tab's dot). */
  seenOffers: string[];
  /** Moments waiting to play, oldest first. Not saved: a missed moment isn't worth replaying. */
  moments: TradeMoment[];
  queueMoments: (moments: TradeMoment[]) => void;
  finishMoment: () => void;
  markOffersSeen: (ids: string[]) => void;
};

const remember = (list: string[], ids: string[]) => [...new Set([...list, ...ids])].slice(-KEEP);

/** Trade notices on this phone, kept apart from the game save so a restored backup can't replay them. */
export const useTradeNotices = create<NoticeState>()(
  persist(
    (set) => ({
      seenTrades: [],
      seenOffers: [],
      moments: [],
      queueMoments: (moments) =>
        set((s) => {
          const fresh = moments.filter((m) => !s.seenTrades.includes(m.tradeId));
          if (fresh.length === 0) return s;
          return {
            moments: [...s.moments, ...fresh],
            seenTrades: remember(
              s.seenTrades,
              fresh.map((m) => m.tradeId),
            ),
          };
        }),
      finishMoment: () => set((s) => ({ moments: s.moments.slice(1) })),
      markOffersSeen: (ids) =>
        set((s) => (ids.every((id) => s.seenOffers.includes(id)) ? s : { seenOffers: remember(s.seenOffers, ids) })),
    }),
    {
      name: 'eight-paths-trade-notices',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ seenTrades: s.seenTrades, seenOffers: s.seenOffers }),
    },
  ),
);

/** How many offers friends sent that the player hasn't seen on the Social tab yet. */
export function useNewOfferCount(): number {
  const me = useSocial((s) => s.profile?.id);
  const offers = useSocial((s) => s.offers);
  const seen = useTradeNotices((s) => s.seenOffers);
  return offers.filter((o) => o.toId === me && !seen.includes(o.id)).length;
}
