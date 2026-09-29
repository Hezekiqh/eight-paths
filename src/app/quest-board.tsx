import { router, useFocusEffect } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { haptics } from '@/haptics';
import { GoalRow } from '@/components/goal-row';
import { ObjectiveRow } from '@/components/objective-row';
import { ThemePicker } from '@/components/theme-picker';
import { BOOST_MULTIPLIER, CLASSES, isObjectiveDone } from '@/game';
import { useGameStore } from '@/store';
import { useGoals, useObjectives, useToday } from '@/store/hooks';
import type { ObjectiveView } from '@/store/selectors';
import { colors, fonts, spacing, windowStyle } from '@/theme';

type Category = 'daily' | 'weekly' | 'personal' | 'themes';

const CATEGORIES: { key: Category; label: string; symbol: SymbolViewProps['name']; blurb: string }[] = [
  { key: 'daily', label: 'Daily', symbol: 'sun.max.fill', blurb: 'New objectives every morning.' },
  { key: 'weekly', label: 'Weekly', symbol: 'calendar', blurb: 'Runs Monday to Sunday.' },
  { key: 'personal', label: 'Personal', symbol: 'pencil.and.scribble', blurb: 'Goals you set yourself.' },
  { key: 'themes', label: 'Themes', symbol: 'paintpalette.fill', blurb: 'Make the game your own.' },
];

/**
 * The quest board in the Archive: daily and weekly objectives, personal goals
 * and themes. Opened from the World, so it stays sideways like the game.
 */
export default function QuestBoardScreen() {
  useFocusEffect(
    useCallback(() => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }, []),
  );
  const today = useToday();
  const objectives = useObjectives(today);
  const goals = useGoals();
  const claimObjective = useGameStore((s) => s.claimObjective);
  const toggleGoal = useGameStore((s) => s.toggleGoal);
  const [category, setCategory] = useState<Category>('daily');

  const claim = (o: ObjectiveView) => {
    const reward = claimObjective(o.id, today);
    if (!reward) return;
    if (reward.big) haptics.celebrate();
    else haptics.success();
    Alert.alert(reward.title, reward.detail);
  };

  const waiting = (key: Category) =>
    key === 'personal' || key === 'themes' ? 0 : objectives[key].filter((o) => isObjectiveDone(o) && !o.claimed).length;
  const current = CATEGORIES.find((c) => c.key === category)!;
  const open = goals.filter((g) => !g.completedAt);
  const finished = goals.filter((g) => g.completedAt);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.menu} contentContainerStyle={styles.menuContent} accessibilityRole="tablist">
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
                if (!selected) haptics.select();
                setCategory(c.key);
              }}
              style={[styles.menuItem, selected && styles.menuItemSelected]}>
              <View style={styles.cursorSlot}>
                {selected && <SymbolView name="heart.fill" tintColor={colors.accent} size={10} />}
              </View>
              <SymbolView
                name={c.symbol}
                tintColor={selected ? colors.accent : colors.textMuted}
                size={selected ? 24 : 20}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                style={[styles.menuLabel, selected && styles.menuLabelSelected]}>
                {c.label.toUpperCase()}
              </Text>
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
      </ScrollView>

      <ScrollView style={styles.panel} contentContainerStyle={styles.panelContent}>
        <View style={styles.panelHeader}>
          <View>
            <Text style={styles.panelTitle}>{category === 'themes' ? 'Themes' : `${current.label} objectives`}</Text>
            <Text style={styles.blurb}>{current.blurb}</Text>
          </View>
          <View style={styles.headerActions}>
            {category === 'personal' && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="New goal"
                onPress={() => {
                  haptics.tap();
                  router.push('/goal-editor');
                }}
                style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}>
                <SymbolView name="plus" tintColor={colors.background} size={18} weight="bold" />
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close the quest board"
              onPress={() => {
                haptics.select();
                router.back();
              }}
              hitSlop={8}
              style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}>
              <SymbolView name="xmark" tintColor={colors.accent} size={20} weight="bold" />
            </Pressable>
          </View>
        </View>

        {category === 'themes' ? (
          <ThemePicker />
        ) : category === 'personal' ? (
          goals.length === 0 ? (
            <Text style={styles.empty}>
              Write down something you&apos;re working toward: run a 5K, pay off a card, call home more. Pick a Path and
              finishing it earns XP there.
            </Text>
          ) : (
            <View style={styles.list}>
              {[...open, ...finished].map((g) => (
                <GoalRow
                  key={g.id}
                  goal={g}
                  today={today}
                  onToggle={() => {
                    if (g.completedAt) haptics.select();
                    else haptics.success();
                    toggleGoal(g.id, today);
                  }}
                />
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
  menu: { width: 210, flexGrow: 0 },
  menuContent: { paddingVertical: spacing.lg, paddingLeft: spacing.md, gap: spacing.xs },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  close: { ...windowStyle, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingRight: spacing.sm,
  },
  menuItemSelected: { backgroundColor: colors.card, borderColor: colors.accent, borderWidth: 2 },
  cursorSlot: { width: 16, alignItems: 'flex-end' },
  menuLabel: { flex: 1, color: colors.textMuted, fontFamily: fonts.bold, fontSize: 20, letterSpacing: 1.2 },
  menuLabelSelected: { color: colors.accent, fontSize: 24 },
  menuCount: {
    color: colors.background,
    backgroundColor: colors.accent,
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
  add: {
    ...windowStyle,
    backgroundColor: colors.accent,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { gap: spacing.sm },
  empty: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
});
