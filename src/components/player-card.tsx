import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { XpBar } from '@/components/xp-bar';
import { MAX_HP, hpTone } from '@/game/regulator';
import { haptics } from '@/haptics';
import { useHp, useRegulatorActive } from '@/regulator/hooks';
import { useClassInfo, useOverallProgress, usePlayer } from '@/store/hooks';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

/** Pokémon's battle colours for the HP bar. */
export const HP_COLORS = { high: '#3FA34D', mid: '#D9A400', low: '#D2453A' } as const;

/** The labelled HP bar: "HP", the bar, and the numbers under it. */
export function HpBar({ hp, height = 12 }: { hp: number; height?: number }) {
  return (
    <View style={styles.barRow} accessible accessibilityLabel={`Health Points: ${hp} of ${MAX_HP}`}>
      <Text style={[styles.tag, styles.hpTag]}>HP</Text>
      <View style={styles.flex}>
        <XpBar fill={hp / MAX_HP} color={HP_COLORS[hpTone(hp)]} height={height} />
      </View>
    </View>
  );
}

/**
 * The player at the top of Stats: name, level, and the XP to the next one.
 * With the Dopamine Regulator on, Health Points sit on top of XP, like a
 * Pokémon's battle box (the HP bar a little wider); otherwise just XP.
 * `compact` keeps only the bars and level, for the top of Today.
 */
export function PlayerCard({ today, compact = false }: { today: string; compact?: boolean }) {
  const player = usePlayer();
  const classInfo = useClassInfo();
  const overall = useOverallProgress();
  const active = useRegulatorActive();
  const { hp } = useHp(today);

  if (!player || !classInfo) return null;
  const color = classInfo.color;
  const toNext = overall.xpForNext - overall.xpIntoLevel;

  return (
    <View style={[styles.card, { borderColor: color }]}>
      {!compact && (
        <View style={styles.top}>
          <View style={[styles.emblem, { borderColor: color }]}>
            <SymbolView name={classInfo.symbol} tintColor={color} size={22} />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={styles.level}>Lv {overall.level}</Text>
        </View>
      )}

      {active && (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the Dopamine Regulator"
          onPress={() => {
            haptics.tap();
            router.navigate('/journey/dopamine-regulator');
          }}
          style={styles.hpBlock}>
          <HpBar hp={hp} />
          <Text style={styles.hpNumbers}>
            {hp} / {MAX_HP} Health Points
          </Text>
        </Pressable>
      )}

      <View style={[styles.xpBlock, active && styles.xpNarrower]}>
        <View
          style={styles.barRow}
          accessible
          accessibilityLabel={`${overall.xpIntoLevel} of ${overall.xpForNext} XP, ${toNext} to level ${overall.level + 1}`}>
          <Text style={[styles.tag, { color }]}>XP</Text>
          <View style={styles.flex}>
            <XpBar fill={overall.xpIntoLevel / overall.xpForNext} color={color} height={active ? 8 : 10} />
          </View>
        </View>
        <View style={styles.xpNumbers}>
          <Text style={styles.xpText}>
            {overall.xpIntoLevel} / {overall.xpForNext} XP
          </Text>
          <Text style={styles.xpText}>
            {compact ? `Lv ${overall.level} · ` : ''}
            {toNext} to Lv {overall.level + 1}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { ...windowStyle, padding: spacing.lg, gap: spacing.sm },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  emblem: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  name: { flex: 1, color: colors.text, fontSize: 26, fontFamily: fonts.bold },
  level: { color: colors.text, fontSize: 24, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: { width: 24, fontFamily: fonts.bold, fontSize: 17, letterSpacing: 0.5 },
  hpTag: { color: '#D9A400' },
  hpBlock: { gap: 2, marginTop: spacing.xs },
  hpNumbers: {
    color: colors.text,
    fontFamily: fonts.bold,
    fontSize: 16,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  xpBlock: { gap: 2 },
  // The HP bar runs a little wider than XP, beneath it.
  xpNarrower: { marginRight: spacing.xl },
  xpNumbers: { flexDirection: 'row', justifyContent: 'space-between', paddingLeft: 24 + spacing.sm },
  xpText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, fontVariant: ['tabular-nums'] },
});
