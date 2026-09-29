import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useEffect } from 'react';

import { toDateKey } from '@/game';
import { useSession } from '@/store/session';

import { DONE_ACTION } from './index';

/**
 * "Done: <quest>" on one of the Keeper's calls (N6). The app opens on Today,
 * which completes the quest with the usual celebration. Only a call for today
 * counts, since quests can only be completed on the day.
 */
export function handleDoneAction(response: Notifications.NotificationResponse) {
  const { actionIdentifier, notification } = response;
  if (!actionIdentifier.startsWith(DONE_ACTION)) return;
  const key = `${notification.request.identifier}:${actionIdentifier}`;
  const session = useSession.getState();
  if (session.handledResponses.includes(key)) return;
  useSession.setState({ handledResponses: [...session.handledResponses, key] });
  if (notification.request.content.data?.date !== toDateKey(new Date())) return;
  useSession.setState({ pendingQuest: actionIdentifier.slice(DONE_ACTION.length) });
  router.navigate('/');
}

/** Listens for "Done" taps, including the one that launched the app. */
export function useKeeperActions() {
  useEffect(() => {
    const launch = Notifications.getLastNotificationResponse();
    if (launch) handleDoneAction(launch);
    const subscription = Notifications.addNotificationResponseReceivedListener(handleDoneAction);
    return () => subscription.remove();
  }, []);
}
