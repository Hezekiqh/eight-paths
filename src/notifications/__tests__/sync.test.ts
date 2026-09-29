import * as Notifications from 'expo-notifications';

import { useGameStore } from '@/store';

import { getKeeperStatus, resyncRemindersNow, sendTestCall } from '../index';
import { EMPTY_STATS } from '../stats-rules';
import { useKeeperStats } from '../stats-store';

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  cancelAllScheduledNotificationsAsync: jest.fn(async () => {}),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(async () => []),
  getNotificationCategoriesAsync: jest.fn(async () => []),
  deleteNotificationCategoryAsync: jest.fn(async () => true),
  setNotificationCategoryAsync: jest.fn(async () => ({})),
  SchedulableTriggerInputTypes: { DATE: 'date', TIME_INTERVAL: 'timeInterval' },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
}));

const mocked = jest.mocked(Notifications);
const granted = { granted: true, canAskAgain: true, status: 'granted', expires: 'never' };
const denied = { granted: false, canAskAgain: false, status: 'denied', expires: 'never' };

function startPlaying() {
  useGameStore.getState().startGame(
    { name: 'Ada', classDimension: 'intellectual', quests: [{ title: 'Read 20 min', dimension: 'intellectual' }] },
    '2026-09-01',
  );
  useGameStore.setState((s) => ({ player: s.player && { ...s.player, tutorialComplete: true } }));
}

beforeEach(() => {
  jest.clearAllMocks();
  useKeeperStats.setState(EMPTY_STATS);
  mocked.getPermissionsAsync.mockResolvedValue(granted as never);
  mocked.requestPermissionsAsync.mockResolvedValue(granted as never);
  let n = 0;
  mocked.scheduleNotificationAsync.mockImplementation(async () => `n${(n += 1)}`);
  startPlaying();
});

describe('scheduling the Keeper', () => {
  it('schedules his calls with a sound, and reports how many', async () => {
    await resyncRemindersNow();
    const calls = mocked.scheduleNotificationAsync.mock.calls;
    expect(calls.length).toBeGreaterThan(10);
    expect(calls.every(([req]) => req.content.sound === 'default' && req.content.title === 'The Keeper')).toBe(true);
    expect(useKeeperStats.getState().lastSync).toMatchObject({ scheduled: calls.length, failed: 0 });
  });

  it('keeps going when one call fails, and records the error instead of hiding it', async () => {
    mocked.scheduleNotificationAsync.mockRejectedValueOnce(new Error('bad date'));
    await resyncRemindersNow();
    const { lastSync, pending } = useKeeperStats.getState();
    expect(lastSync).toMatchObject({ failed: 1, error: 'bad date' });
    expect(lastSync?.scheduled).toBe(mocked.scheduleNotificationAsync.mock.calls.length - 1);
    expect(pending).toHaveLength(lastSync!.scheduled);
  });

  it('records a failure that stops the whole plan', async () => {
    mocked.cancelAllScheduledNotificationsAsync.mockRejectedValueOnce(new Error('no center'));
    await resyncRemindersNow();
    expect(useKeeperStats.getState().lastSync).toMatchObject({ scheduled: 0, error: 'no center' });
  });
});

describe('the test call', () => {
  it('knocks in 5 seconds, and stays out of the record', async () => {
    expect(await sendTestCall()).toBe('full');
    const [[req]] = mocked.scheduleNotificationAsync.mock.calls;
    expect(req.trigger).toMatchObject({ seconds: 5 });
    expect(req.content.body).toBe('A test knock, Ada. If you can read this, I can reach you.');
    expect(req.content.data).toMatchObject({ lineId: 'test' });
  });

  it("sends nothing when notifications are off, and says so", async () => {
    mocked.getPermissionsAsync.mockResolvedValue(denied as never);
    expect(await sendTestCall()).toBe('denied');
    expect(mocked.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});

describe('the status', () => {
  it('shows the next planned call and what iOS holds', async () => {
    await resyncRemindersNow();
    mocked.getAllScheduledNotificationsAsync.mockResolvedValue(new Array(64).fill({}) as never);
    const status = await getKeeperStatus();
    expect(status).toMatchObject({ access: 'full', scheduled: 64 });
    expect(status.next?.at).toBeGreaterThan(Date.now());
  });
});
