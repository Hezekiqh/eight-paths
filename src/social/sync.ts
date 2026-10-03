import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { useGameStore } from '@/store';
import { useOverallProgress, useProgressSummary, useToday } from '@/store/hooks';
import { useSession } from '@/store/session';
import { earnedCopies } from '@/store/trades';
import { isCharacterId } from '@/story/companions';

import { fetchTradeMoves, fetchTradePartners, refreshOffers, refreshStats, reportCollection, startSocial, uploadSnapshot, type Snapshot } from './api';
import { socialEnabled } from './config';
import { momentsFrom, useTradeNotices, type MoveRow } from './notices';
import { useSocial } from './store';

const SYNC_DELAY_MS = 1500;

/**
 * Keeps the server's copy of the player's public profile and collection up to
 * date: a short while after anything changes, it uploads the party, overall
 * level, consistency numbers (if shared) and how many copies of each hero the
 * player has woken. It also brings in trades (see useTradeSync).
 * Habits never leave the phone. Failures are silent; the next change retries.
 */
export function useSocialSync() {
  const status = useSocial((s) => s.status);
  const share = useSocial((s) => s.shareConsistency);
  const userId = useSocial((s) => s.profile?.id ?? null);
  const today = useToday();
  const player = useGameStore((s) => s.player);
  const party = useGameStore((s) => s.party);
  const owned = useGameStore((s) => s.owned);
  const drops = useGameStore((s) => s.drops);
  const traded = useGameStore((s) => s.traded);
  const level = useOverallProgress().level;
  const summary = useProgressSummary(today);
  const reported = useRef<Partial<Record<string, number>>>({});
  const lastSnapshot = useRef('');

  useTradeSync(status === 'ready' ? userId : null);
  useTradeMoments();

  // A different account, or Start over, starts from nothing reported.
  const resets = useSocial((s) => s.resets);
  useEffect(() => {
    reported.current = {};
    lastSnapshot.current = '';
  }, [userId, resets]);

  useEffect(() => {
    if (socialEnabled) startSocial();
  }, []);

  const earned = earnedCopies({ owned, drops, traded });
  const snapshot: Snapshot = {
    leader: player ? party[player.classDimension] : null,
    party: Object.values(party),
    level,
    daysShownUp: share ? summary.daysShownUp : null,
    streak: share ? summary.showUp.current : null,
    appVersion: Constants.expoConfig?.version ?? null,
  };
  const snapshotKey = JSON.stringify(snapshot);
  const earnedKey = JSON.stringify(earned);

  useEffect(() => {
    if (status !== 'ready' || !userId) return;
    const timer = setTimeout(async () => {
      try {
        if (snapshotKey !== lastSnapshot.current) {
          await uploadSnapshot(JSON.parse(snapshotKey));
          lastSnapshot.current = snapshotKey;
        }
        const counts = JSON.parse(earnedKey) as Record<string, number>;
        const raised = Object.fromEntries(Object.entries(counts).filter(([id, n]) => n > (reported.current[id] ?? 0)));
        if (Object.keys(raised).length) {
          const woken = await reportCollection(raised);
          Object.assign(reported.current, raised);
          // Rarity changes as players wake heroes; show this player's own effect right away.
          if (woken > 0) await refreshStats();
        }
      } catch {
        // Offline or the server is busy: the next change tries again.
      }
    }, SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, userId, snapshotKey, earnedKey]);
}

/**
 * Brings the server's trade moves into the save. Moves are applied once each,
 * by id, so a restored backup gets every trade since it was made replayed.
 * Trades new to this phone also queue their moment (see trade-moment), which
 * plays before the arrivals hatch.
 */
export async function pullTrades() {
  const game = useGameStore.getState();
  if (game.player === null) return;
  const applied = new Set(game.tradeMoves);
  const rows = (await fetchTradeMoves()).filter(
    (r): r is MoveRow => isCharacterId(r.characterId) && (r.delta === 1 || r.delta === -1),
  );
  const fresh = rows.filter((r) => !applied.has(r.id));
  if (fresh.length === 0) return;
  const notices = useTradeNotices.getState();
  const tradeIds = [...new Set(fresh.map((r) => r.tradeId).filter((t): t is string => !!t))].filter(
    (t) => !notices.seenTrades.includes(t),
  );
  const partners = await fetchTradePartners(tradeIds).catch(() => ({}));
  notices.queueMoments(momentsFrom(fresh, notices.seenTrades, partners));
  useGameStore.getState().applyTradeMoves(fresh);
}

/**
 * Opens the trade moment for each finished trade waiting in the queue, one at
 * a time, once the opening intro is over.
 */
function useTradeMoments() {
  const next = useTradeNotices((s) => s.moments[0]?.tradeId);
  const introDone = useSession((s) => s.introDone);
  const opened = useRef<string | null>(null);

  useEffect(() => {
    if (!next || !introDone || opened.current === next) return;
    opened.current = next;
    router.push('/trade-moment');
  }, [next, introDone]);
}

/** Pulls trades and open offers when the player signs in and each time the app comes back to the front. */
function useTradeSync(userId: string | null) {
  const hasPlayer = useGameStore((s) => s.player !== null);

  useEffect(() => {
    if (!userId || !hasPlayer) return;
    const pull = () =>
      Promise.all([pullTrades(), refreshOffers()]).catch(() => {
        // Offline: the next time the app comes to the front tries again.
      });
    pull();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') pull();
    });
    return () => sub.remove();
  }, [userId, hasPlayer]);
}
