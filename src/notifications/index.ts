import * as Notifications from 'expo-notifications';

import { planReminders, toDateKey } from '@/game';
import { useGameStore } from '@/store';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let queue: Promise<void> = Promise.resolve();

/**
 * Replaces every pending reminder with the plan for the next two weeks.
 * Runs serially so overlapping calls can't interleave cancel and schedule.
 */
export function syncReminders(options: {
  today: string;
  notificationTime: string;
  playedToday: boolean;
  enabled: boolean;
}): Promise<void> {
  queue = queue.then(() => doSync(options)).catch(() => {});
  return queue;
}

async function doSync({
  today,
  notificationTime,
  playedToday,
  enabled,
}: Parameters<typeof syncReminders>[0]) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!enabled) return;
  const { granted } = await Notifications.getPermissionsAsync();
  if (!granted) return;

  const now = new Date();
  const plans = planReminders(today, notificationTime, playedToday, now.getHours() * 60 + now.getMinutes());
  if (__DEV__) console.log(`[reminders] scheduling ${plans.length} from ${plans[0]?.date} at ${notificationTime}`);
  for (const plan of plans) {
    const [y, m, d] = plan.date.split('-').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Eight Paths', body: plan.body },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(y, m - 1, d, plan.hour, plan.minute),
      },
    });
  }
}

/** Asks for permission if the player has never been asked; returns whether granted. */
export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  if (requested.granted) await resyncRemindersNow();
  return requested.granted;
}


/** Resyncs from the current saved game, e.g. right after permission is granted. */
export function resyncRemindersNow(): Promise<void> {
  const { player, completions } = useGameStore.getState();
  const today = toDateKey(new Date());
  return syncReminders({
    today,
    notificationTime: player?.notificationTime ?? '20:00',
    playedToday: completions.some((c) => c.date === today),
    enabled: player?.tutorialComplete ?? false,
  });
}
