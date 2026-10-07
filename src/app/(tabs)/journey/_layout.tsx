import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Opening the Regulator straight from Today still puts Stats underneath it, so Back lands there. */
export const unstable_settings = { initialRouteName: 'index' };

/** Stats, and the Dopamine Regulator's screens pushed over it, with the tab bar still showing. */
export default function StatsLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
