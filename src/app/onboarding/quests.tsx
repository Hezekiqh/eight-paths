import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { OnboardingStep } from '@/components/onboarding-step';
import { CLASSES, DIMENSIONS, type Dimension } from '@/game';
import { useGameStore } from '@/store';
import {
  DEFAULT_PLAYER_NAME,
  STARTER_QUEST_TIP_ABOVE,
  starterQuestsFrom,
  useOnboardingDraft,
  type StarterKey,
} from '@/store/onboarding';
import { colors, fonts, spacing, windowStyle } from '@/theme';

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
      subtitle="Start small. We've picked three quick ones. You can add more anytime, and a few you actually do beat a long list you don't."
      footer={
        <View style={styles.footer}>
          <Text style={[styles.count, selected.length > STARTER_QUEST_TIP_ABOVE && { color: accent }]}>
            {selected.length > STARTER_QUEST_TIP_ABOVE
              ? `${selected.length} quests. Most people who stick with it start with 3 to 5.`
              : `${selected.length} ${selected.length === 1 ? 'quest' : 'quests'} selected`}
          </Text>
          <Button
            title="Start"
            color={accent}
            disabled={!classDimension || selected.length === 0}
            onPress={start}
          />
        </View>
      }>
      {DIMENSIONS.map((d) => {
        const info = CLASSES[d];
        const isOpen = expanded === d;
        // Collapsed rows show the first quest plus anything already picked.
        const habits = info.starterHabits
          .map((title, i) => ({ title, i }))
          .filter(({ i }) => isOpen || i === 0 || selected.includes(`${d}:${i}`));
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
            {habits.map(({ title, i }) => {
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
  row: { ...windowStyle, padding: spacing.md, gap: spacing.xs },
  rowHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xs },
  rowTitle: { flex: 1, color: colors.text, fontSize: 21, fontFamily: fonts.bold },
  rowClass: { color: colors.textMuted, fontFamily: fonts.medium },
  habit: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingLeft: spacing.xs },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitTitle: { color: colors.text, fontFamily: fonts.regular, fontSize: 15 },
  footer: { gap: spacing.sm },
  count: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
});
