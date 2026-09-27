import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { OnboardingStep } from '@/components/onboarding-step';
import { DEFAULT_PLAYER_NAME, useOnboardingDraft } from '@/store/onboarding';
import { colors, fonts, spacing, windowStyle } from '@/theme';

export default function WelcomeScreen() {
  const name = useOnboardingDraft((s) => s.name);
  const setName = useOnboardingDraft((s) => s.setName);

  return (
    <OnboardingStep
      step={1}
      title="Eight Paths"
      subtitle="Turn your habits into quests and watch all eight sides of your life level up."
      footer={<Button title="Continue" onPress={() => router.push('/onboarding/class')} />}>
      <Text style={styles.label}>What should we call you?</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={DEFAULT_PLAYER_NAME}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="next"
        onSubmitEditing={() => router.push('/onboarding/class')}
        maxLength={24}
      />
      <Pressable accessibilityRole="button" onPress={() => router.push('/backup')} hitSlop={8} style={styles.restore}>
        <Text style={styles.restoreText}>New phone? Restore from a backup</Text>
      </Pressable>
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontSize: 21, fontFamily: fonts.semibold },
  input: {
    ...windowStyle,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 18,
    padding: spacing.lg,
  },
  restore: { alignSelf: 'center', paddingVertical: spacing.sm },
  restoreText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, textDecorationLine: 'underline' },
});
