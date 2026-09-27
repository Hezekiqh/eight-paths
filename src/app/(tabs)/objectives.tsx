import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GoalRow } from '@/components/goal-row';
import { ObjectiveRow } from '@/components/objective-row';
import { BOOST_MULTIPLIER, CLASSES, isObjectiveDone } from '@/game';
import { useGameStore } from '@/store';
import { useGoals, useObjectives, useToday } from '@/store/hooks';
import type { ObjectiveView } from '@/store/selectors';
import { colors, fonts, spacing, windowStyle } from '@/theme';

type Category = 'daily' | 'weekly' | 'personal';

const CATEGORIES: { key: Category; label: string; symbol: SymbolViewProps['name']; blurb: string }[] = [
  { key: 'daily', label: 'Daily', symbol: 'sun.max.fill', blurb: 'New objectives every morning.' },
  { key: 'weekly', label: 'Weekly', symbol: 'calendar', blurb: 'Runs Monday to Sunday.' },
  { key: 'personal', label: 'Personal', symbol: 'pencil.and.scribble', blurb: 'Goals you set yourself.' },
];

/** Turns the phone sideways while this tab is open, like a handheld console. */
function useLandscape() {
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
      return () => {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
      };
    }, []),
  );
}

export default function ObjectivesScreen() {
  useLandscape();
  const today = useToday();
  const objectives = useObjectives(today);
  const goals = useGoals();
  const claimObjective = useGameStore((s) => s.claimObjective);
  const toggleGoal = useGameStore((s) => s.toggleGoal);
  const [category, setCategory] = useState<Category>('daily');

  const claim = (o: ObjectiveView) => {
    const reward = claimObjective(o.id, today);
    if (!reward) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(reward.title, reward.detail);
  };

  const waiting = (key: Category) =>
    key === 'personal' ? 0 : objectives[key].filter((o) => isObjectiveDone(o) && !o.claimed).length;
  const current = CATEGORIES.find((c) => c.key === category)!;
  const open = goals.filter((g) => !g.completedAt);
  const finished = goals.filter((g) => g.completedAt);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.menu} accessibilityRole="tablist">
        {CATEGORIES.map((c) => {
          const selected = c.key === category;
          const count = waiting(c.key);
          return (
            <Pressable
              key={c.key}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              accessibilityLabel={count ? `${c.label}, ${count} to claim` : c.label}
              onPress={() => {
                if (!selected) Haptics.selectionAsync();
                setCategory(c.key);
              }}
              style={[styles.menuItem, selected && styles.menuItemSelected]}>
              <View style={styles.cursorSlot}>
                {selected && <SymbolView name="heart.fill" tintColor={colors.gold} size={10} />}
              </View>
              <SymbolView name={c.symbol} tintColor={selected ? colors.gold : colors.textMuted} size={selected ? 24 : 20} />
              <Text style={[styles.menuLabel, selected && styles.menuLabelSelected]}>{c.label.toUpperCase()}</Text>
              {count > 0 && <Text style={styles.menuCount}>{count}</Text>}
            </Pressable>
          );
        })}
        {objectives.boosted.length > 0 && (
          <View style={styles.boosts}>
            {objectives.boosted.map((d) => (
              <Text key={d} style={[styles.boost, { color: CLASSES[d].color }]}>
                {BOOST_MULTIPLIER}× {CLASSES[d].className} today
              </Text>
            ))}
          </View>
        )}
      </View>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>{current.label} objectives</Text>
            <Text style={styles.blurb}>{current.blurb}</Text>
          </View>
          {category === 'personal' && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="New goal"
              onPress={() => router.push('/goal-editor')}
              style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}>
              <SymbolView name="plus" tintColor={colors.background} size={18} weight="bold" />
            </Pressable>
          )}
        </View>

        {category === 'personal' ? (
          goals.length === 0 ? (
            <Text style={styles.empty}>
              Write down something you&apos;re working toward: run a 5K, pay off a card, call home more. Pick a
              Path and finishing it earns XP there.
            </Text>
          ) : (
            <View style={styles.list}>
              {[...open, ...finished].map((g) => (
                <GoalRow key={g.id} goal={g} today={today} onToggle={() => toggleGoal(g.id, today)} />
              ))}
            </View>
          )
        ) : (
          <View style={styles.list}>
            {objectives[category].map((o) => (
              <ObjectiveRow key={o.id} objective={o} onClaim={() => claim(o)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, flexDirection: 'row', backgroundColor: colors.background },
  menu: { width: 210, paddingVertical: spacing.lg, paddingLeft: spacing.md, gap: spacing.xs },
  menuItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md, paddingRight: spacing.sm },
  menuItemSelected: { backgroundColor: colors.card, borderColor: colors.gold, borderWidth: 2 },
  cursorSlot: { width: 16, alignItems: 'flex-end' },
  menuLabel: { flex: 1, color: colors.textMuted, fontFamily: fonts.bold, fontSize: 20, letterSpacing: 1.2 },
  menuLabelSelected: { color: colors.gold, fontSize: 24 },
  menuCount: {
    color: colors.background,
    backgroundColor: colors.gold,
    fontFamily: fonts.bold,
    fontSize: 16,
    paddingHorizontal: 6,
    overflow: 'hidden',
  },
  boosts: { marginTop: spacing.md, paddingLeft: spacing.xl, gap: 2 },
  boost: { fontFamily: fonts.bold, fontSize: 16 },
  panel: { flex: 1 },
  panelContent: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  panelHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  panelTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 30 },
  blurb: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  add: { ...windowStyle, backgroundColor: colors.gold, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  list: { gap: spacing.sm },
  empty: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
});
