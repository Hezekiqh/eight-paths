import { TabList, TabSlot, TabTrigger, Tabs } from 'expo-router/ui';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RetroTabButton } from '@/components/retro-tab-bar';
import { useReminderSync, useSettleOnDayChange, useToday } from '@/store/hooks';
import { FRAME, colors, spacing } from '@/theme';

export default function TabsLayout() {
  const today = useToday();
  useSettleOnDayChange(today);
  useReminderSync(today);
  const insets = useSafeAreaInsets();

  return (
    <Tabs style={styles.root}>
      <TabSlot />
      <TabList style={[styles.bar, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TabTrigger name="index" href="/" asChild>
          <RetroTabButton label="Today" symbol="hexagon.fill" />
        </TabTrigger>
        <TabTrigger name="journey" href="/journey" asChild>
          <RetroTabButton label="Journey" symbol="map.fill" />
        </TabTrigger>
        <TabTrigger name="character" href="/character" asChild>
          <RetroTabButton label="Character" symbol="person.crop.circle.fill" />
        </TabTrigger>
        <TabTrigger name="quests" href="/quests" asChild>
          <RetroTabButton label="Quests" symbol="scroll.fill" />
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
    paddingHorizontal: spacing.sm,
  },
});
