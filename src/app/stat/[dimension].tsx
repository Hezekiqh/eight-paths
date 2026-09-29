import { useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { NoteBox } from '@/components/note-box';
import { formatRate } from '@/components/progress-strip';
import { XpBar } from '@/components/xp-bar';
import { DIMENSIONS, type Dimension } from '@/game';
import { useDimensionStats, useToday } from '@/store/hooks';
import { colors, fonts, radius, spacing } from '@/theme';

function isDimension(value: unknown): value is Dimension {
  return typeof value === 'string' && (DIMENSIONS as readonly string[]).includes(value);
}

/**
 * One corner of the radar, explained as what it really is: a part of the
 * player's own life they're training, like Intelligence or Strength. Shows
 * their level, streak and consistency for it, what trains it, and why small
 * daily effort matters more than big bursts.
 */
export default function StatSheet() {
  const { dimension } = useLocalSearchParams<{ dimension: string }>();
  const today = useToday();
  const stats = useDimensionStats(today);
  if (!isDimension(dimension)) return null;
  const s = stats.find((x) => x.dimension === dimension)!;
  const { info, progress, streak, consistency } = s;

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={[styles.emblem, { borderColor: info.color }]}>
          <SymbolView name={info.symbol} tintColor={info.color} size={30} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.stat, { color: info.color }]}>{info.stat.toUpperCase()}</Text>
          <Text style={styles.sub}>
            {info.dimensionLabel} Path · trained by your {info.className}
          </Text>
        </View>
      </View>

      <Text style={styles.meaning}>{info.statMeaning}</Text>

      <View style={styles.numbers}>
        <View style={styles.levelRow}>
          <Text style={styles.level}>
            {info.stat} Lv {progress.level}
          </Text>
          <Text style={styles.xp}>
            {progress.xpIntoLevel} / {progress.xpForNext} XP
          </Text>
        </View>
        <XpBar fill={progress.xpIntoLevel / progress.xpForNext} color={info.color} height={8} />
        <View style={styles.facts}>
          <Text style={styles.fact}>
            <Text style={[styles.factBig, { color: info.color }]}>{streak.current}</Text> day streak
          </Text>
          <Text style={styles.fact}>
            <Text style={[styles.factBig, { color: info.color }]}>{formatRate(consistency)}</Text> consistent, last 30
            days
          </Text>
        </View>
      </View>

      <NoteBox symbol="arrow.up.circle.fill" color={info.color}>
        {info.growth}
      </NoteBox>
      <Text style={styles.consistency}>
        Consistency beats intensity. A small {info.dimensionLabel.toLowerCase()} habit most days raises your {info.stat}{' '}
        more than one big effort. Missed days dim it on your chart; nothing you&apos;ve built is ever lost.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.card, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emblem: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  stat: { fontFamily: fonts.bold, fontSize: 34, letterSpacing: 1 },
  sub: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  meaning: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  numbers: { gap: spacing.sm },
  levelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  level: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  xp: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, fontVariant: ['tabular-nums'] },
  facts: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  fact: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  factBig: { fontFamily: fonts.bold, fontSize: 20 },
  consistency: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
