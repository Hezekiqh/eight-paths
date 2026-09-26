import { router } from 'expo-router';
import { StyleSheet, Text, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { OnboardingStep } from '@/components/onboarding-step';
import { DEFAULT_PLAYER_NAME, useOnboardingDraft } from '@/store/onboarding';
import { colors, radius, spacing } from '@/theme';

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
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.text, fontSize: 16, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 18,
    padding: spacing.lg,
  },
});
