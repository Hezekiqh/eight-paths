import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroTabButton } from '@/components/retro-tab-bar';
import { useInviteRewards } from '@/social/rewards';
import { useSocialSync } from '@/social/sync';
import { useObjectives, useReminderSync, useRevealQueue, useSettleOnDayChange, useToday } from '@/store/hooks';
import { FRAME, colors, spacing } from '@/theme';

export default function TabsLayout() {
  const today = useToday();
  useSettleOnDayChange(today);
  useRevealQueue();
  useReminderSync(today);
  useSocialSync();
  useInviteRewards();
  const insets = useSafeAreaInsets();
  const { unclaimed } = useObjectives(today);

  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList
        style={[
          styles.bar,
          {
            paddingBottom: Math.max(insets.bottom, spacing.sm),
            // Clear the notch when the Objectives tab turns the phone sideways.
            paddingLeft: Math.max(insets.left, spacing.sm),
            paddingRight: Math.max(insets.right, spacing.sm),
          },
        ]}>
        {/* Today is the index route, so the app opens on it. */}
        <TabTrigger name="index" href="/" asChild>
          <RetroTabButton label="Today" icon="sun" />
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
        <TabTrigger name="quests" href="/quests" asChild>
          <RetroTabButton label="Quests" icon="script" />
        </TabTrigger>
        {/* Last, since opening it turns the phone sideways. */}
        <TabTrigger name="objectives" href="/objectives" asChild>
          <RetroTabButton label="Objectives" icon="gamepad" badge={unclaimed > 0} />
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
});
