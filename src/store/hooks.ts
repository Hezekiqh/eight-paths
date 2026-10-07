import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import { AppState } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import {
  habitStats,
  msUntilNextMidnight,
  stats,
  toDateKey,
  usualReminderTime,
  type RadarFilter,
  type StatsPeriod,
} from '@/game';
import { syncReminders } from '@/notifications';
import { usePremium } from '@/premium/store';
import { useTradeNotices } from '@/social/notices';

import { pickData, useGameStore, type GameData } from './index';
import { useSession } from './session';
import {
  selectAllQuestGroups,
  selectClassInfo,
  selectCollection,
  selectObjectives,
  selectDimensionStats,
  selectCalendar,
  selectMilestones,
  selectMonthComparison,
  selectOverallProgress,
  selectXpTotals,
  selectProgressSummary,
  selectReminderState,
  selectQuest,
  selectRadar,
  selectTodayQuests,
  selectTutorialQuest,
} from './selectors';

/**
 * Today's date key. Rolls over at local midnight even while the app stays
 * open, and re-checks whenever the app returns to the foreground (timers
 * don't run while it's suspended).
 */
export function useToday(): string {
  const [today, setToday] = useState(() => toDateKey(new Date()));
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      setToday(toDateKey(new Date()));
      clearTimeout(timer);
      // A second of slack so the timer never fires just before midnight.
      timer = setTimeout(refresh, msUntilNextMidnight(new Date()) + 1000);
    };
    timer = setTimeout(refresh, msUntilNextMidnight(new Date()) + 1000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, []);
  return today;
}

function useGameData(): GameData {
  return useGameStore(useShallow(pickData));
}

export const usePlayer = () => useGameStore((s) => s.player);

export function useClassInfo() {
  const data = useGameData();
  return useMemo(() => selectClassInfo(data), [data]);
}

export function useCollection() {
  const data = useGameData();
  return useMemo(() => selectCollection(data), [data]);
}

export function useObjectives(today: string) {
  const data = useGameData();
  return useMemo(() => selectObjectives(data, today), [data, today]);
}

export const useGoals = () => useGameStore((s) => s.goals);

export function useDimensionStats(today: string) {
  const data = useGameData();
  return useMemo(() => selectDimensionStats(data, today), [data, today]);
}

/** The reminder time learned from the player's quests, or null while still learning. */
export function useLearnedReminderTime(): string | null {
  const completions = useGameStore((s) => s.completions);
  return useMemo(() => usualReminderTime(completions), [completions]);
}

export function useXpTotals() {
  const data = useGameData();
  return useMemo(() => selectXpTotals(data), [data]);
}

export function useOverallProgress() {
  const data = useGameData();
  return useMemo(() => selectOverallProgress(data), [data]);
}

export function useTodayQuests(today: string) {
  const data = useGameData();
  return useMemo(() => selectTodayQuests(data, today), [data, today]);
}

export function useProgressSummary(today: string) {
  const data = useGameData();
  return useMemo(() => selectProgressSummary(data, today), [data, today]);
}

export function useMonthComparison(today: string) {
  const data = useGameData();
  return useMemo(() => selectMonthComparison(data, today), [data, today]);
}

export function useCalendar(month: string, today: string) {
  const data = useGameData();
  return useMemo(() => selectCalendar(data, month, today), [data, month, today]);
}

/** One habit's stats sheet, with `month` as its calendar (game/habit-stats); null if the quest is gone. */
export function useHabitStats(id: string | undefined, month: string, today: string) {
  const data = useGameData();
  return useMemo(() => {
    const quest = selectQuest(data, id);
    return quest ? { quest, stats: habitStats(quest, data.completions, data.restDays, today, month) } : null;
  }, [data, id, month, today]);
}

/** Everything on the Stats tab for a week, a month or a year (game/stats). */
export function useStats(period: StatsPeriod, today: string) {
  const data = useGameData();
  return useMemo(() => stats(data.quests, data.completions, data.restDays, today, period), [data, today, period]);
}

export function useMilestones() {
  const data = useGameData();
  return useMemo(() => selectMilestones(data), [data]);
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
 * Keeps the Keeper's scheduled calls in step with the save: re-planned on
 * every launch, day change and change to anything a call talks about.
 */
export function useReminderSync(today: string) {
  const data = useGameData();
  const enabled = data.player?.tutorialComplete ?? false;
  const tier = usePremium((s) => (s.premium ? 'premium' : 'free'));
  const state = useMemo(() => selectReminderState(data, today, tier), [data, today, tier]);
  // Compared by value, so unrelated saves (XP, party order) don't re-plan.
  const key = JSON.stringify(state);

  useEffect(() => {
    syncReminders(enabled ? state : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
}

/** How long a new character waits before their reveal, so the XP banner shows first. */
const REVEAL_DELAY_MS = 2200;

/**
 * Plays the reveal cutscene for each newly unlocked character, one at a time.
 * On an older save (revealed is null) everyone already unlocked counts as met.
 */
export function useRevealQueue() {
  const drops = useGameStore((s) => s.drops);
  const hasPlayer = useGameStore((s) => s.player !== null);
  // Nothing hatches behind the opening intro; it waits until the intro is over.
  const introDone = useSession((s) => s.introDone);
  // Heroes arriving by trade hatch after the trade's moment has played.
  const tradeShowing = useTradeNotices((s) => s.moments.length > 0);
  // The queue length when the last hatch was opened: wait until it shrinks before the next.
  const opened = useRef<number | null>(null);
  const next = drops[0];

  useEffect(() => {
    if (opened.current !== null && drops.length < opened.current) opened.current = null;
    if (!hasPlayer || !next || !introDone || tradeShowing || opened.current !== null) return;
    const timer = setTimeout(() => {
      opened.current = drops.length;
      router.push({ pathname: '/reveal/[id]', params: { id: next } });
    }, REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [hasPlayer, next, drops.length, introDone, tradeShowing]);
}

/**
 * Hands out characters as they come due: whenever XP or shards change, each
 * Path that has reached its next arrival gets a random character (see
 * store/draws). Also carries an old save's collection over on first run.
 */
export function useCharacterDraws() {
  const hasPlayer = useGameStore((s) => s.player !== null);
  const completions = useGameStore((s) => s.completions);
  const xpGrants = useGameStore((s) => s.xpGrants);
  const shards = useGameStore((s) => s.shards);
  const reconcile = useGameStore((s) => s.reconcileDraws);
  useEffect(() => {
    if (hasPlayer) reconcile();
  }, [hasPlayer, completions, xpGrants, shards, reconcile]);
}
