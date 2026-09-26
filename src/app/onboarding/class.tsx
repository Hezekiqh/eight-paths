import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { ClassLore } from '@/components/class-lore';
import { OnboardingStep } from '@/components/onboarding-step';
import { CLASSES, DIMENSIONS } from '@/game';
import { useOnboardingDraft } from '@/store/onboarding';
import { colors, radius, spacing } from '@/theme';

export default function ClassScreen() {
  const selected = useOnboardingDraft((s) => s.classDimension);
  const setClass = useOnboardingDraft((s) => s.setClass);
  const accent = selected ? CLASSES[selected].color : colors.grid;

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
      <View style={styles.grid}>
        {DIMENSIONS.map((d) => {
          const info = CLASSES[d];
          const isSelected = selected === d;
          return (
            <Pressable
              key={d}
              accessibilityRole="radio"
              accessibilityState={{ selected: isSelected }}
              onPress={() => setClass(d)}
              style={[styles.card, isSelected && { borderColor: info.color, backgroundColor: colors.cardRaised }]}>
              <SymbolView name={info.symbol} tintColor={info.color} size={30} />
              <Text style={[styles.className, isSelected && { color: info.color }]}>{info.className}</Text>
              <Text style={styles.dimension}>{info.epithet}</Text>
            </Pressable>
          );
        })}
      </View>
      {selected && (
        <View style={[styles.lore, { borderColor: CLASSES[selected].color }]}>
          <ClassLore info={CLASSES[selected]} compact />
        </View>
      )}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.md },
  card: {
    width: '48%',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.lg,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  className: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: spacing.xs },
  dimension: { color: colors.textMuted, fontSize: 12, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: spacing.sm },
  lore: {
    marginTop: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
  },
});
