import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useReminderSync, useSettleOnDayChange, useToday } from '@/store/hooks';
import { colors } from '@/theme';

export default function TabsLayout() {
  const today = useToday();
  useSettleOnDayChange(today);
  useReminderSync(today);

  return (
    <NativeTabs
      tintColor={colors.grid}
      backgroundColor={colors.background}
      labelStyle={{ default: { color: colors.textMuted }, selected: { color: colors.text } }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Today</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="hexagon.fill" md="hexagon" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="journey">
        <NativeTabs.Trigger.Label>Journey</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="map.fill" md="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="character">
        <NativeTabs.Trigger.Label>Character</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="person.crop.circle.fill" md="person" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="quests">
        <NativeTabs.Trigger.Label>Quests</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="scroll.fill" md="list" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
