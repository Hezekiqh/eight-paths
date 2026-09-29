import * as Notifications from 'expo-notifications';

import { KEEPER_TITLE, planReminders, toDateKey, type PlannedReminder, type Quest } from '@/game';
import { useGameStore } from '@/store';
import { currentTier } from '@/premium/store';
import { selectReminderState, type ReminderState } from '@/store/selectors';

import type { ReminderAccess } from './ask-rules';
import { recentLines, recordOpen, settleSent, withPending, type PendingCall } from './stats-rules';
import { updateKeeperStats, useKeeperStats } from './stats-store';

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
  const now = Date.now();
  // Anything the last plan had due by now has fired; count it before it's replaced.
  updateKeeperStats((stats) => settleSent(stats, now));
  const access = state ? await getReminderAccess() : 'denied';
  if (!state || (access !== 'full' && access !== 'quiet')) {
    updateKeeperStats((stats) => withPending(stats, [], now));
    return;
  }

  const stats = useKeeperStats.getState();
  const clock = new Date(now);
  const plans = planReminders({
    ...state,
    minutesNow: clock.getHours() * 60 + clock.getMinutes(),
    lineStats: stats.lines,
    recentLines: recentLines(stats, now),
  });
  if (__DEV__) console.log(`[reminders] scheduling ${plans.length} from ${plans[0]?.date} at ${state.notificationTime}`);
  const categories = await syncDoneCategories(plans, state.quests);
  const pending: PendingCall[] = [];
  for (const plan of plans) {
    const [y, m, d] = plan.date.split('-').map(Number);
    const date = new Date(y, m - 1, d, plan.hour, plan.minute);
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: KEEPER_TITLE,
        body: plan.body,
        data: { lineId: plan.lineId, group: plan.group, missed: plan.missed, date: plan.date },
        // Long-press shows "Done: <quest>" buttons (N6).
        ...(categories.has(plan) ? { categoryIdentifier: categories.get(plan) } : {}),
        // The 10:30 PM last call may break through Focus; everything else waits politely.
        interruptionLevel: plan.timeSensitive ? 'timeSensitive' : 'active',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
    });
    pending.push({ lineId: plan.lineId, at: date.getTime(), body: plan.body, id });
  }
  updateKeeperStats((s) => withPending(s, pending, Date.now()));
}

/** Prefix of the Keeper's "Done" categories, so stale ones can be cleared. */
const DONE_CATEGORY = 'keeper-done-';

/** A "Done" action's id, and the quest it completes. */
export const DONE_ACTION = 'done:';

/**
 * Registers one notification category per set of quests the calls offer, each
 * with a "Done: <quest>" button that opens the app and completes it there
 * (iOS can't reliably run the app's code for a background action). Returns
 * each plan's category.
 */
async function syncDoneCategories(plans: PlannedReminder[], quests: Quest[]) {
  const titles = new Map(quests.map((q) => [q.id, q.title]));
  const byPlan = new Map<PlannedReminder, string>();
  const wanted = new Map<string, string[]>();
  for (const plan of plans) {
    if (plan.questIds.length === 0) continue;
    const id = DONE_CATEGORY + plan.questIds.join('.');
    byPlan.set(plan, id);
    wanted.set(id, plan.questIds);
  }
  try {
    for (const old of await Notifications.getNotificationCategoriesAsync()) {
      if (old.identifier.startsWith(DONE_CATEGORY) && !wanted.has(old.identifier)) {
        await Notifications.deleteNotificationCategoryAsync(old.identifier);
      }
    }
    for (const [id, questIds] of wanted) {
      await Notifications.setNotificationCategoryAsync(
        id,
        questIds.map((questId) => ({
          identifier: DONE_ACTION + questId,
          buttonTitle: `Done: ${titles.get(questId) ?? 'quest'}`,
          options: { opensAppToForeground: true },
        })),
      );
    }
  } catch {
    // Buttons are a bonus: without them the calls still go out.
    return new Map<PlannedReminder, string>();
  }
  return byPlan;
}

/**
 * Development only: one of the Keeper's calls in 5 seconds, with "Done"
 * buttons for today's quests still to do, to try the long-press on a device.
 */
export async function sendTestCall(): Promise<void> {
  if (!(await ensureReminderPermission())) return;
  const { quests, completions } = useGameStore.getState();
  const today = toDateKey(new Date());
  const left = quests.filter((q) => q.active && !completions.some((c) => c.questId === q.id && c.date === today));
  const plan = { questIds: left.slice(0, 3).map((q) => q.id) } as PlannedReminder;
  const categories = await syncDoneCategories([plan], quests);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: KEEPER_TITLE,
      body: 'A test knock. Long-press me.',
      data: { lineId: 'test', date: today },
      ...(categories.has(plan) ? { categoryIdentifier: categories.get(plan) } : {}),
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5 },
  });
}

/** Counts a tap on one of the Keeper's calls (N5). */
export function recordKeeperOpen(response: Notifications.NotificationResponse) {
  const { request, date } = response.notification;
  const lineId = request.content.data?.lineId;
  if (typeof lineId !== 'string') return;
  updateKeeperStats((stats) => recordOpen(stats, lineId, request.identifier, date));
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
