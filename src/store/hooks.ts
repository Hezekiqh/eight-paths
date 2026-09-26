import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { toDateKey, type RadarFilter } from '@/game';
import { syncReminders } from '@/notifications';

import { useGameStore, type GameData } from './index';
import {
  selectAllQuestGroups,
  selectClassInfo,
  selectDimensionStats,
  selectOverallProgress,
  selectPlayedToday,
  selectQuest,
  selectRadar,
  selectTodayQuestGroups,
  selectTutorialQuest,
} from './selectors';

/** Today's date key; refreshes when the app returns to the foreground. */
export function useToday(): string {
  const [today, setToday] = useState(() => toDateKey(new Date()));
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setToday(toDateKey(new Date()));
    });
    return () => sub.remove();
  }, []);
  return today;
}

function useGameData(): GameData {
  return useGameStore(
    useShallow(({ player, quests, completions, restDays, lastSettledDate }) => ({
      player,
      quests,
      completions,
      restDays,
      lastSettledDate,
    })),
  );
}

export const usePlayer = () => useGameStore((s) => s.player);

export function useClassInfo() {
  const data = useGameData();
  return useMemo(() => selectClassInfo(data), [data]);
}

export function useDimensionStats(today: string) {
  const data = useGameData();
  return useMemo(() => selectDimensionStats(data, today), [data, today]);
}

export function useOverallProgress() {
  const data = useGameData();
  return useMemo(() => selectOverallProgress(data), [data]);
}

export function useTodayQuestGroups(today: string) {
  const data = useGameData();
  return useMemo(() => selectTodayQuestGroups(data, today), [data, today]);
}

export function useAllQuestGroups(today: string) {
  const data = useGameData();
  return useMemo(() => selectAllQuestGroups(data, today), [data, today]);
}

export function useTutorialQuest(today: string) {
  const data = useGameData();
  return useMemo(() => selectTutorialQuest(data, today), [data, today]);
}

/** True once the persisted game has loaded from storage. */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => useGameStore.persist.onFinishHydration(onChange),
    () => useGameStore.persist.hasHydrated(),
  );
}

export function useQuest(id: string | undefined) {
  const data = useGameData();
  return useMemo(() => selectQuest(data, id), [data, id]);
}

export function useRadar(filter: RadarFilter, today: string) {
  const data = useGameData();
  return useMemo(() => selectRadar(data, filter, today), [data, filter, today]);
}

/** Settles rest tokens for any midnights passed since the last visit. */
export function useSettleOnDayChange(today: string) {
  const settle = useGameStore((s) => s.settle);
  const hasPlayer = useGameStore((s) => s.player !== null);
  useEffect(() => {
    if (hasPlayer) settle(today);
  }, [settle, hasPlayer, today]);
}

/**
 * Keeps the scheduled evening reminders in step with the player's chosen
 * time and whether they've already played today.
 */
export function useReminderSync(today: string) {
  const data = useGameData();
  const notificationTime = data.player?.notificationTime ?? '20:00';
  const enabled = data.player?.tutorialComplete ?? false;
  const playedToday = useMemo(() => selectPlayedToday(data, today), [data, today]);

  useEffect(() => {
    syncReminders({ today, notificationTime, playedToday, enabled });
  }, [today, notificationTime, playedToday, enabled]);
}
