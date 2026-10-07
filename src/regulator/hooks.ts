import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { cleanStreaks, dayRestore, hpEvents, simulateHp, surveyDue } from '@/game/regulator';
import { usePremium } from '@/premium/store';
import { useGameStore } from '@/store';

import { allStimuli, selectedStimuli, useRegulator } from './store';

/** The Regulator is running: Premium, switched on, and introduced. Only then does the HP bar show. */
export function useRegulatorActive(): boolean {
  const premium = usePremium((s) => s.premium);
  const on = useRegulator((s) => s.enabled && s.onboarded);
  return premium && on;
}

export function useTrackedStimuli() {
  const selected = useRegulator((s) => s.selected);
  const custom = useRegulator((s) => s.custom);
  return useMemo(() => selectedStimuli(selected, custom), [selected, custom]);
}

/** The time, ticking every few minutes (and on coming back to the app), for the bar's hourly climb. */
const TICK_MS = 5 * 60 * 1000;
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, []);
  return now;
}

/**
 * The HP bar right now, replayed from the start. Habits are only counted
 * here, on the phone: nothing from the Regulator is written to the game save.
 */
export function useHp(today: string) {
  const startAt = useRegulator((s) => s.startAt);
  const reports = useRegulator((s) => s.reports);
  const reportedAt = useRegulator((s) => s.reportedAt);
  const mode = useRegulator((s) => s.mode);
  const custom = useRegulator((s) => s.custom);
  const completions = useGameStore((s) => s.completions);
  const tick = useNow();
  return useMemo(() => {
    // Every stimulus, not just today's picks: dropping one later doesn't rewrite the past.
    const stimuli = allStimuli(custom);
    const events = startAt ? hpEvents({ startAt, reports, reportedAt, stimuli, mode, habits: completions }) : [];
    // The clock only ticks every few minutes; a check-in or habit just now still counts at once.
    const now = Math.max(tick, events.length ? events[events.length - 1].at : 0);
    const { hp, potions } = startAt ? simulateHp(startAt, now, events) : { hp: 100, potions: 0 };
    const todayRestore = dayRestore(completions.filter((c) => c.date === today).length);
    return { hp, potions, todayRestore, streaks: cleanStreaks(reports, stimuli) };
  }, [startAt, reports, reportedAt, mode, custom, completions, tick, today]);
}

/** The day this morning's survey is about, or null when there's nothing to ask. */
export function useSurveyDue(today: string): string | null {
  const active = useRegulatorActive();
  const start = useRegulator((s) => s.start);
  const reports = useRegulator((s) => s.reports);
  const tracking = useRegulator((s) => s.selected.length > 0);
  if (!active || !tracking) return null;
  return surveyDue(start, today, reports);
}
