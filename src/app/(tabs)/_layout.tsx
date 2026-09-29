import { usePathname } from 'expo-router';
import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroTabButton } from '@/components/retro-tab-bar';
import { useInviteRewards } from '@/social/rewards';
import { useKeeperActions } from '@/notifications/use-keeper-actions';
import { useKeeperAsk } from '@/notifications/use-keeper-ask';
import { useKeeperStatsTracking } from '@/notifications/use-keeper-stats';
import { usePurchases } from '@/premium/purchases';
import { useSocialSync } from '@/social/sync';
import {
  useCharacterDraws,
  useObjectives,
  useReminderSync,
  useRevealQueue,
  useSettleOnDayChange,
  useToday,
} from '@/store/hooks';
import { useSession } from '@/store/session';
import { FRAME, colors, spacing } from '@/theme';

export default function TabsLayout() {
  const today = useToday();
  useSettleOnDayChange(today);
  useCharacterDraws();
  useRevealQueue();
  useReminderSync(today);
  useKeeperAsk(today);
  useKeeperStatsTracking();
  useKeeperActions();
  useSocialSync();
  usePurchases();
  useInviteRewards();
  const insets = useSafeAreaInsets();
  const { unclaimed } = useObjectives(today);
  // The game fills the screen; its pause menu leads back to the World menu and the other tabs.
  const worldPlaying = useSession((s) => s.worldPlaying);
  const inWorld = usePathname() === '/world' && worldPlaying;

  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList
        style={[
          styles.bar,
          inWorld && styles.hidden,
          {
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            // Clear the notch if the phone is still sideways.
            paddingLeft: Math.max(insets.left, spacing.sm),
            paddingRight: Math.max(insets.right, spacing.sm),
          },
        ]}>
        {/* Today is the index route, so the app opens on it. */}
        <TabTrigger name="index" href="/" asChild>
          <RetroTabButton label="Today" icon="script" />
        </TabTrigger>
        <TabTrigger name="character" href="/character" asChild>
          <RetroTabButton label="Profile and collection" icon="star" />
        </TabTrigger>
        <TabTrigger name="social-tab" href="/social-tab" asChild>
          <RetroTabButton label="Social" icon="users" />
        </TabTrigger>
        <TabTrigger name="journey" href="/journey" asChild>
          <RetroTabButton label="Journey" icon="map" />
        </TabTrigger>
        {/* Last, since opening it turns the phone sideways. The quest board inside holds the objectives. */}
        <TabTrigger name="world" href="/world" asChild>
          <RetroTabButton label="World" icon="gamepad" badge={unclaimed > 0} />
        </TabTrigger>
      </TabList>
    </Tabs>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  // A menu window pinned to the bottom: framed on top, flush with the screen edges.
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderTopWidth: FRAME,
    borderColor: colors.frame,
    paddingTop: spacing.xs,
  },
  hidden: { display: 'none' },
});
