import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';

import { useGameStore } from '@/store';

import { recordCompletion } from './stats-rules';
import { updateKeeperStats } from './stats-store';

import { recordKeeperOpen } from './index';

/**
 * Keeps the Keeper's track record (N5): taps on his calls, including the one
 * that launched the app, and quests completed soon after a call.
 */
export function useKeeperStatsTracking() {
  useEffect(() => {
    const launch = Notifications.getLastNotificationResponse();
    if (launch) recordKeeperOpen(launch);
    const subscription = Notifications.addNotificationResponseReceivedListener(recordKeeperOpen);
    return () => subscription.remove();
  }, []);

  const count = useGameStore((s) => s.completions.length);
  const previous = useRef(count);
  useEffect(() => {
    if (count > previous.current) updateKeeperStats((stats) => recordCompletion(stats, Date.now()));
    previous.current = count;
  }, [count]);
}
