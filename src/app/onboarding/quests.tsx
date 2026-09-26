import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OnboardingStep } from '@/components/onboarding-step';
import { CLASSES, DIMENSIONS, type Dimension } from '@/game';
import { useGameStore } from '@/store';
import {
  DEFAULT_PLAYER_NAME,
  starterQuestsFrom,
  useOnboardingDraft,
  type StarterKey,
} from '@/store/onboarding';
import { colors, radius, spacing } from '@/theme';

export default function StarterQuestsScreen() {
  const { name, classDimension, selected, toggleStarter, reset } = useOnboardingDraft();
  const startGame = useGameStore((s) => s.startGame);
  const [expanded, setExpanded] = useState<Dimension | null>(null);
  const accent = classDimension ? CLASSES[classDimension].color : colors.grid;

  const start = () => {
    if (!classDimension) return;
    startGame({
      name: name.trim() || DEFAULT_PLAYER_NAME,
      classDimension,
      quests: starterQuestsFrom(selected),
    });
    reset();
  };

  return (
    <OnboardingStep
      step={3}
      title="Choose your starting quests"
      subtitle="One quest per class to begin. Tap a class to see more."
      footer={<Button title="Start" color={accent} disabled={!classDimension} onPress={start} />}>
      {DIMENSIONS.map((d) => {
        const info = CLASSES[d];
        const isOpen = expanded === d;
        const habits = isOpen ? info.starterHabits : info.starterHabits.slice(0, 1);
        return (
          <View key={d} style={styles.row}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              onPress={() => setExpanded(isOpen ? null : d)}
              style={styles.rowHeader}>
              <SymbolView name={info.symbol} tintColor={info.color} size={20} />
              <Text style={styles.rowTitle}>
                {info.className} <Text style={styles.rowClass}>· {info.dimensionLabel} habits</Text>
              </Text>
              <SymbolView
                name={isOpen ? 'chevron.up' : 'chevron.down'}
                tintColor={colors.textMuted}
                size={14}
              />
            </Pressable>
            {habits.map((title, i) => {
              const key: StarterKey = `${d}:${i}`;
              const checked = selected.includes(key);
              return (
                <Pressable
                  key={key}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked }}
                  onPress={() => toggleStarter(key)}
                  style={styles.habit}>
                  <View style={[styles.box, { borderColor: info.color }, checked && { backgroundColor: info.color }]}>
                    {checked && <SymbolView name="checkmark" tintColor={colors.background} size={12} weight="bold" />}
                  </View>
                  <Text style={styles.habitTitle}>{title}</Text>
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </OnboardingStep>
  );
}

const styles = StyleSheet.create({
  row: { backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  rowTitle: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  rowClass: { color: colors.textMuted, fontWeight: '500' },
  habit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingLeft: spacing.xs },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitTitle: { color: colors.text, fontSize: 15 },
});
