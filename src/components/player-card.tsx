import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { XpBar } from '@/components/xp-bar';
import { MAX_HP } from '@/game/regulator';
import { haptics } from '@/haptics';
import { useStanding } from '@/social/use-standing';
import { useHp, useRegulatorActive } from '@/regulator/hooks';
import { useClassInfo, useOverallProgress, usePlayer } from '@/store/hooks';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

/** Green and amber for the Regulator's steady days and potions. */
export const HP_COLORS = { high: '#3FA34D', mid: '#D9A400', low: '#D2453A' } as const;
/** The HP bar is always red, whatever it reads. */
export const HP_COLOR = HP_COLORS.low;

/** The labelled Dopamine Baseline bar: "HP", the bar, and the numbers under it. */
export function HpBar({ hp, height = 12 }: { hp: number; height?: number }) {
  return (
    <View style={styles.barRow} accessible accessibilityLabel={`Dopamine Baseline: ${hp} of ${MAX_HP}`}>
      <Text style={[styles.tag, styles.hpTag]}>HP</Text>
      <View style={styles.flex}>
        <XpBar fill={hp / MAX_HP} color={HP_COLOR} height={height} />
      </View>
    </View>
  );
}

/**
 * The player at the top of Today: name, Collection Ranking (CR, once signed in), level and XP.
 * With the Dopamine Regulator on, a Dopamine Baseline (HP) bar sits above XP,
 * drawn and labelled the same way ("52 / 100 HP" under it); otherwise just XP.
 */
export function PlayerCard({ today }: { today: string }) {
  const player = usePlayer();
  const classInfo = useClassInfo();
  const overall = useOverallProgress();
  const active = useRegulatorActive();
  const { hp } = useHp(today);
  const standing = useStanding();

  if (!player || !classInfo) return null;
  const color = classInfo.color;
  const toNext = overall.xpForNext - overall.xpIntoLevel;

  return (
    <View style={[styles.card, { borderColor: color }]}>
      <View style={styles.top}>
        <View style={[styles.emblem, { borderColor: color }]}>
          <SymbolView name={classInfo.symbol} tintColor={color} size={22} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {player.name}
        </Text>
        {standing && (
          <Text
            style={[styles.rank, { color }]}
            accessibilityLabel={`Collection Ranking ${standing.rank ? standing.rank : 'over 100'}`}>
            CR {standing.rank ? `#${standing.rank}` : '100+'}
          </Text>
        )}
        <Text style={styles.level}>Lv {overall.level}</Text>
      </View>

      {active && (
        <Pressable
          accessibilityRole="button"
          accessibilityHint="Opens the Dopamine Regulator"
          onPress={() => {
            haptics.tap();
            router.push('/regulator');
          }}
          accessibilityLabel={`Dopamine Baseline: ${hp} of ${MAX_HP}`}
          style={styles.barBlock}>
          <XpBar fill={hp / MAX_HP} color={HP_COLOR} height={10} />
          <Text style={styles.barText}>
            {hp} / {MAX_HP} HP
          </Text>
        </Pressable>
      )}

      <View
        style={styles.barBlock}
        accessible
        accessibilityLabel={`${overall.xpIntoLevel} of ${overall.xpForNext} XP, ${toNext} to level ${overall.level + 1}`}>
        <XpBar fill={overall.xpIntoLevel / overall.xpForNext} color={color} height={10} />
        <Text style={styles.barText}>
          {overall.xpIntoLevel} / {overall.xpForNext} XP
        </Text>
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
  rank: { fontSize: 18, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  level: { color: colors.text, fontSize: 24, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tag: { width: 24, fontFamily: fonts.bold, fontSize: 17, letterSpacing: 0.5 },
  hpTag: { color: '#D9A400' },
  // HP and XP alike: the bar, and its numbers under it on the left.
  barBlock: { gap: 2 },
  barText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, fontVariant: ['tabular-nums'] },
});
