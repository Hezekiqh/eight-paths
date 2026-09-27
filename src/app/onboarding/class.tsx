import { router } from 'expo-router';

import { Button } from '@/components/button';
import { ClassGrid } from '@/components/class-grid';
import { OnboardingStep } from '@/components/onboarding-step';
import { CLASSES } from '@/game';
import { useOnboardingDraft } from '@/store/onboarding';
import { colors } from '@/theme';

export default function ClassScreen() {
  const selected = useOnboardingDraft((s) => s.classDimension);
  const setClass = useOnboardingDraft((s) => s.setClass);
  const accent = selected ? CLASSES[selected].color : colors.accent;

  return (
    <OnboardingStep
      step={2}
      title="Choose your class"
      subtitle="Your class earns +25% XP on its own quests. Every class in your party still grows."
      footer={
        <Button
          title="Continue"
          color={accent}
          disabled={!selected}
          onPress={() => router.push('/onboarding/quests')}
        />
      }>
      <ClassGrid selected={selected} onSelect={setClass} />
    </OnboardingStep>
  );
}
