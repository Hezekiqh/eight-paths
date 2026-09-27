import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { XpBar } from '@/components/xp-bar';
import { CLASSES, isObjectiveDone } from '@/game';
import { describeReward } from '@/store/rewards';
import type { ObjectiveView } from '@/store/selectors';
import { colors, fonts, spacing, windowStyle } from '@/theme';

const REWARD_SYMBOL = { drop: 'shippingbox.fill', grace: 'moon.stars.fill', boost: 'bolt.fill' } as const;

/** One objective: progress, its reward, and a Claim button once it's done. */
export function ObjectiveRow({ objective, onClaim }: { objective: ObjectiveView; onClaim: () => void }) {
  const done = isObjectiveDone(objective);
  const color = objective.dimension ? CLASSES[objective.dimension].color : colors.accent;
  return (
    <View style={[styles.row, objective.claimed && styles.claimed]}>
      <View style={styles.body}>
        <View style={styles.top}>
          <Text style={styles.title}>{objective.title}</Text>
          <Text style={styles.count}>
            {objective.progress}/{objective.target}
          </Text>
        </View>
        <XpBar fill={objective.progress / objective.target} color={color} height={6} />
        <View style={styles.reward}>
          <SymbolView name={REWARD_SYMBOL[objective.reward.kind]} tintColor={colors.accent} size={14} />
          <Text style={styles.rewardText}>{describeReward(objective.reward)}</Text>
        </View>
      </View>
      {objective.claimed ? (
        <View style={styles.status}>
          <SymbolView name="checkmark.seal.fill" tintColor={colors.textMuted} size={22} />
          <Text style={styles.statusText}>Claimed</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: !done }}
          accessibilityLabel={`Claim ${describeReward(objective.reward)}`}
          disabled={!done}
          onPress={onClaim}
          style={({ pressed }) => [styles.claim, !done && styles.claimLocked, pressed && { opacity: 0.7 }]}>
          <Text style={[styles.claimText, !done && { color: colors.textFaint }]}>CLAIM</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { ...windowStyle, flexDirection: 'row', alignItems: 'center', gap: spacing.lg, padding: spacing.md },
  claimed: { opacity: 0.55 },
  body: { flex: 1, gap: 6 },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  title: { flex: 1, color: colors.text, fontFamily: fonts.bold, fontSize: 21 },
  count: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18, fontVariant: ['tabular-nums'] },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rewardText: { color: colors.accent, fontFamily: fonts.regular, fontSize: 13 },
  status: { width: 88, alignItems: 'center', gap: 2 },
  statusText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
  claim: {
    width: 88,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderWidth: 2,
    borderColor: colors.frame,
  },
  claimLocked: { backgroundColor: colors.cardRaised, borderColor: colors.border },
  claimText: { color: colors.background, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 1 },
});
