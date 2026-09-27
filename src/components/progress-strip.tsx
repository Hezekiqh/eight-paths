import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Consistency } from '@/game';
import type { ProgressSummary } from '@/store/selectors';
import { colors, radius, spacing } from '@/theme';

export function formatRate(c: Consistency): string {
  return c.rate === null ? '—' : `${Math.round(c.rate * 100)}%`;
}

/** "▲ 12 pts vs last week", or null when either window has nothing due. */
export function describeChange(current: Consistency, previous: Consistency, period: string): string | null {
  if (current.rate === null || previous.rate === null) return null;
  const points = Math.round((current.rate - previous.rate) * 100);
  if (points === 0) return `Same as last ${period}`;
  return `${points > 0 ? '▲' : '▼'} ${Math.abs(points)} pts vs last ${period}`;
}

type Props = { summary: ProgressSummary; color: string };

/** The mirror: consistency this week, days shown up, and the showing-up streak. */
export function ProgressStrip({ summary, color }: Props) {
  const { week, daysShownUp, showUp } = summary;
  const change = describeChange(week.current, week.previous, 'week');
  const improving = week.current.rate !== null && week.previous.rate !== null && week.current.rate >= week.previous.rate;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Open your journey"
      onPress={() => router.navigate('/journey')}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.cardRaised }]}>
      <View style={styles.main}>
        <Text style={styles.label}>CONSISTENCY · 7 DAYS</Text>
        <Text style={[styles.big, { color }]}>{formatRate(week.current)}</Text>
        <Text style={[styles.change, improving && { color: colors.text }]}>
          {change ?? (week.current.due === 0 ? 'Nothing due yet' : `${week.current.done} of ${week.current.due} done`)}
        </Text>
      </View>
      <View style={styles.side}>
        <View style={styles.stat}>
          <SymbolView name="sun.max.fill" tintColor={color} size={16} />
          <Text style={styles.statValue}>{daysShownUp}</Text>
          <Text style={styles.statLabel}>{daysShownUp === 1 ? 'day shown up' : 'days shown up'}</Text>
        </View>
        <View style={styles.stat}>
          <SymbolView name="flame.fill" tintColor={showUp.current > 0 ? color : colors.textFaint} size={16} />
          <Text style={styles.statValue}>{showUp.current}</Text>
          <Text style={styles.statLabel}>day streak · best {showUp.best}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
    marginBottom: spacing.md,
  },
  main: { flex: 1, gap: 2 },
  label: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  big: { fontSize: 34, fontWeight: '800', fontVariant: ['tabular-nums'] },
  change: { color: colors.textMuted, fontSize: 13 },
  side: { gap: spacing.sm },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValue: { color: colors.text, fontSize: 16, fontWeight: '800', fontVariant: ['tabular-nums'] },
  statLabel: { color: colors.textMuted, fontSize: 12 },
});
