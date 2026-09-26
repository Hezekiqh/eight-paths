import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { toDateKey, type RadarFilter } from '@/game';

import { useGameStore, type GameData } from './index';
import {
  selectAllQuestGroups,
  selectClassInfo,
  selectDimensionStats,
  selectOverallProgress,
  selectRadar,
  selectTodayQuestGroups,
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
