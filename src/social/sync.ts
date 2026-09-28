import Constants from 'expo-constants';
import { useEffect, useRef } from 'react';

import { useGameStore } from '@/store';
import { useCollection, useOverallProgress, useProgressSummary, useToday } from '@/store/hooks';

import { fetchCollection, refreshStats, startSocial, uploadCollection, uploadSnapshot, type Snapshot } from './api';
import { socialEnabled } from './config';
import { useSocial } from './store';

const SYNC_DELAY_MS = 1500;

/**
 * Keeps the server's copy of the player's public profile and collection up to
 * date: a short while after anything changes, it uploads the party, overall
 * level, consistency numbers (if shared) and any newly woken characters.
 * Habits never leave the phone. Failures are silent; the next change retries.
 */
export function useSocialSync() {
  const status = useSocial((s) => s.status);
  const share = useSocial((s) => s.shareConsistency);
  const userId = useSocial((s) => s.profile?.id ?? null);
  const today = useToday();
  const player = useGameStore((s) => s.player);
  const party = useGameStore((s) => s.party);
  const collection = useCollection();
  const level = useOverallProgress().level;
  const summary = useProgressSummary(today);
  const uploaded = useRef<Set<string> | null>(null);
  const lastSnapshot = useRef('');

  useEffect(() => {
    if (socialEnabled) startSocial();
  }, []);

  const unlocked = collection.entries.filter((e) => e.unlocked).map((e) => e.companion.id);
  const snapshot: Snapshot = {
    leader: player ? party[player.classDimension] : null,
    party: Object.values(party),
    level,
    daysShownUp: share ? summary.daysShownUp : null,
    streak: share ? summary.showUp.current : null,
    appVersion: Constants.expoConfig?.version ?? null,
  };
  const snapshotKey = JSON.stringify(snapshot);
  const unlockedKey = unlocked.join(',');

  useEffect(() => {
    if (status !== 'ready' || !userId) return;
    const timer = setTimeout(async () => {
      try {
        if (snapshotKey !== lastSnapshot.current) {
          await uploadSnapshot(JSON.parse(snapshotKey));
          lastSnapshot.current = snapshotKey;
        }
        if (!uploaded.current) uploaded.current = new Set(await fetchCollection(userId));
        const fresh = unlockedKey.split(',').filter((id) => id && !uploaded.current!.has(id));
        if (fresh.length) {
          await uploadCollection(fresh);
          fresh.forEach((id) => uploaded.current!.add(id));
          // Rarity changes as players wake heroes; show this player's own effect right away.
          await refreshStats();
        }
      } catch {
        // Offline or the server is busy: the next change tries again.
      }
    }, SYNC_DELAY_MS);
    return () => clearTimeout(timer);
  }, [status, userId, snapshotKey, unlockedKey]);
}
