import * as Notifications from 'expo-notifications';

import { KEEPER_TITLE, planReminders, toDateKey } from '@/game';
import { useGameStore } from '@/store';
import { currentTier } from '@/premium/store';
import { selectReminderState, type ReminderState } from '@/store/selectors';

import type { ReminderAccess } from './ask-rules';

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
 * Replaces every pending call with the Keeper's plan from now on (none when
 * `state` is null: before onboarding ends, or with no save). Runs serially so
 * overlapping calls can't interleave cancel and schedule.
 */
export function syncReminders(state: ReminderState | null): Promise<void> {
  queue = queue.then(() => doSync(state)).catch(() => {});
  return queue;
}

async function doSync(state: ReminderState | null) {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!state) return;
  const access = await getReminderAccess();
  if (access !== 'full' && access !== 'quiet') return;

  const now = new Date();
  const plans = planReminders({ ...state, minutesNow: now.getHours() * 60 + now.getMinutes() });
  if (__DEV__) console.log(`[reminders] scheduling ${plans.length} from ${plans[0]?.date} at ${state.notificationTime}`);
  for (const plan of plans) {
    const [y, m, d] = plan.date.split('-').map(Number);
    await Notifications.scheduleNotificationAsync({
      content: {
        title: KEEPER_TITLE,
        body: plan.body,
        data: { lineId: plan.lineId, group: plan.group, missed: plan.missed },
        // The 10:30 PM last call may break through Focus; everything else waits politely.
        interruptionLevel: plan.timeSensitive ? 'timeSensitive' : 'active',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(y, m - 1, d, plan.hour, plan.minute),
      },
    });
  }
}

function accessOf(permission: Notifications.NotificationPermissionsStatus): ReminderAccess {
  if (permission.granted) return 'full';
  if (permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'quiet';
  return permission.canAskAgain ? 'undecided' : 'denied';
}

/** What iOS currently allows the Keeper to send. */
export async function getReminderAccess(): Promise<ReminderAccess> {
  return accessOf(await Notifications.getPermissionsAsync());
}

/**
 * Shows the system permission dialog (also from quiet delivery, which iOS
 * allows once), then re-plans. Returns whether banners are allowed now.
 */
export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  await resyncRemindersNow();
  return requested.granted;
}

/**
 * "Not now" on the Keeper's card: quiet delivery to Notification Center, with
 * no system dialog, so the one real ask is saved for later. iOS only grants it
 * before the player has answered the dialog.
 */
export async function allowQuietReminders(): Promise<void> {
  if ((await getReminderAccess()) !== 'undecided') return;
  await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true, allowProvisional: true },
  });
  await resyncRemindersNow();
}

/** Resyncs from the current saved game, e.g. right after permission is granted. */
export function resyncRemindersNow(): Promise<void> {
  const data = useGameStore.getState();
  const state = selectReminderState(data, toDateKey(new Date()), currentTier());
  return syncReminders(data.player?.tutorialComplete ? state : null);
}
