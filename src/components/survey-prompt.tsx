import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PixelIcon } from '@/components/pixel-icon';
import { haptics } from '@/haptics';
import { useSurveyDue } from '@/regulator/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/** On Today, while yesterday's Dopamine Regulator check-in is still to answer. */
export function SurveyPrompt({ today }: { today: string }) {
  const due = useSurveyDue(today);
  if (!due) return null;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tap();
        router.push('/regulator-survey');
      }}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.cardRaised }]}>
      <PixelIcon name="potion" color={colors.accent} size={24} />
      <View style={styles.text}>
        <Text style={styles.title}>Morning check-in</Text>
        <Text style={styles.subtitle}>How was yesterday? About ten seconds.</Text>
      </View>
      <PixelIcon name="chevron-right" color={colors.textFaint} size={24} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...windowStyle,
    borderColor: colors.accent,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 21, fontFamily: fonts.semibold },
  subtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
});
