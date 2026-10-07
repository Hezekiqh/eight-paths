import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Stats, and the Dopamine Regulator's screens pushed over it, with the tab bar still showing. */
export default function StatsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
