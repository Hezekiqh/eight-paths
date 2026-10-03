import { StyleSheet, Text, TextInput } from 'react-native';

import { Button } from '@/components/button';
import { OnboardingStep } from '@/components/onboarding-step';
import { useGameStore } from '@/store';
import { DEFAULT_PLAYER_NAME, useOnboardingDraft } from '@/store/onboarding';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/** Everyone starts as a Mage, with only the first habit; the Keeper's tour takes it from here. */
const START_CLASS = 'intellectual';

/**
 * The only onboarding screen: your name. Then the game starts, and the Keeper
 * walks you through making a habit, the graph, your first habit and the tabs.
 */
export default function WelcomeScreen() {
  const name = useOnboardingDraft((s) => s.name);
  const setName = useOnboardingDraft((s) => s.setName);
  const reset = useOnboardingDraft((s) => s.reset);
  const startGame = useGameStore((s) => s.startGame);

  const start = () => {
    startGame({ name: name.trim() || DEFAULT_PLAYER_NAME, classDimension: START_CLASS, quests: [] });
    reset();
  };

  return (
    <OnboardingStep
      title="Eight Paths"
      subtitle="Turn your habits into quests and watch all eight sides of your life level up."
      footer={<Button title="Begin" onPress={start} />}>
      <Text style={styles.label}>What should we call you?</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={DEFAULT_PLAYER_NAME}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        autoCapitalize="words"
        autoCorrect={false}
        returnKeyType="go"
        onSubmitEditing={start}
        maxLength={24}
      />
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
});
