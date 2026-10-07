import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** The Stats tab. (The Dopamine Regulator's screens open over everything; see src/app/regulator.) */
export default function StatsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
