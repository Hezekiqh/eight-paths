import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking } from 'react-native';

import { SettingsRow } from '@/components/settings-row';
import { addDays, toDateKey } from '@/game';
import {
  ensureReminderPermission,
  getKeeperStatus,
  resyncRemindersNow,
  type KeeperStatus,
} from '@/notifications';
import { usePlayer } from '@/store/hooks';

/** "Today at 6:30 PM", "Tomorrow at 8:00 PM", "Thu, Oct 2 at 8:00 PM". */
export function describeCallTime(at: number, now = new Date()): string {
  const date = new Date(at);
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const key = toDateKey(date);
  const today = toDateKey(now);
  if (key === today) return `Today at ${time}`;
  if (key === addDays(today, 1)) return `Tomorrow at ${time}`;
  return `${date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })} at ${time}`;
}

type Row = { subtitle: string; onPress?: () => void };

/**
 * Whether the Keeper can reach the player, and when he'll next knock. Every way the calls can fail to arrive (permission off, quiet
 * delivery, a scheduling error) says so here, with the fix one tap away.
 */
export function KeeperStatusRows({ color }: { color: string }) {
  const tutorialDone = usePlayer()?.tutorialComplete ?? false;
  const [status, setStatus] = useState<KeeperStatus | null>(null);

  const refresh = useCallback(() => {
    getKeeperStatus()
      .then(setStatus)
      .catch(() => {});
  }, []);
  useFocusEffect(refresh);

  const allow = async () => {
    await ensureReminderPermission();
    refresh();
  };
  const replan = async () => {
    await resyncRemindersNow();
    refresh();
  };

  const row = ((): Row => {
    if (!status) return { subtitle: 'Checking…' };
    const { access, next, scheduled, lastSync } = status;
    if (access === 'denied') {
      return {
        subtitle: "Notifications are off for Eight Paths, so he can't knock. Tap to open iOS Settings.",
        onPress: () => Linking.openSettings(),
      };
    }
    if (access === 'undecided') {
      return { subtitle: "He can't knock yet. Tap to allow notifications.", onPress: allow };
    }
    if (!tutorialDone) return { subtitle: "He starts calling once you've finished your first quest." };
    if (scheduled === 0 && lastSync?.error) {
      return { subtitle: `His calls couldn't be scheduled (${lastSync.error}). Tap to try again.`, onPress: replan };
    }
    if (!next || scheduled === 0) return { subtitle: 'Nothing is scheduled. Tap to plan his calls again.', onPress: replan };
    const when = describeCallTime(next.at);
    if (access === 'quiet') {
      return {
        subtitle: `${when}, quietly: calls go to Notification Center with no banner or sound. Tap to allow banners.`,
        onPress: allow,
      };
    }
    return { subtitle: `${when}, unless you've played by then.` };
  })();

  return (
    <SettingsRow icon="bell" iconColor={color} title="The Keeper's next call" subtitle={row.subtitle} onPress={row.onPress} />
  );
}
