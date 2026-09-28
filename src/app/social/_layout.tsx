import { Stack } from 'expo-router';

import { colors } from '@/theme';

/** Friends and the Second 100: its own stack, shown as one modal. */
export default function SocialLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
