import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { close } from '@/components/modal-header';
import { Segmented } from '@/components/segmented';
import { CLASSES, DIMENSIONS, type Tier } from '@/game';
import { usePremium } from '@/premium/store';
import { dropOdds } from '@/store/draws';
import { useClassInfo } from '@/store/hooks';
import { RARITY_TIERS, type Rarity } from '@/story/companions';
import { colors, fonts, spacing, windowStyle } from '@/theme';

const STARS: Rarity[] = [1, 2, 3, 4, 5];

const percent = (p: number) => (p === 0 ? '—' : p < 0.01 ? '<1%' : `${Math.round(p * 100)}%`);

/** The real chance of each star on every Path, free and Premium (App Store guideline 3.1.1). */
export default function DropOdds() {
  const color = useClassInfo()?.color ?? colors.accent;
  const [tier, setTier] = useState<Tier>(usePremium.getState().premium ? 'premium' : 'free');
  return (
    <SafeAreaView style={styles.screen} edges={['bottom']}>
      <View style={styles.bar}>
        <Text style={styles.title}>Drop odds</Text>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={12}>
          <Text style={[styles.done, { color }]}>Done</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.body}>
          Every few levels a Path draws one of its characters at random. These are the chances of each star on each
          Path.
        </Text>
        <Segmented
          options={[
            { value: 'free', label: 'Free' },
            { value: 'premium', label: 'Premium' },
          ]}
          value={tier}
          onChange={setTier}
          color={color}
        />
        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.path, styles.head]}>PATH</Text>
            {STARS.map((r) => (
              <Text key={r} style={[styles.cell, styles.head, { color: RARITY_TIERS[r].color }]}>
                {r}★
              </Text>
            ))}
          </View>
          {DIMENSIONS.map((d) => {
            const odds = dropOdds(d, tier);
            return (
              <View key={d} style={[styles.row, styles.rowLine]}>
                <Text style={[styles.path, { color: CLASSES[d].color }]}>{CLASSES[d].className}</Text>
                {STARS.map((r) => (
                  <Text key={r} style={styles.cell}>
                    {percent(odds[r])}
                  </Text>
                ))}
              </View>
            );
          })}
        </View>
        <Text style={styles.fine}>
          1★ is the rarest. Premium doubles the weight of each 1★ character. A Premium redo draws again from the same
          Path at Premium odds, leaving out the character being redone.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  done: { fontFamily: fonts.bold, fontSize: 22 },
  content: { padding: spacing.xl, gap: spacing.lg },
  body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  table: { ...windowStyle, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  path: { flex: 1.6, fontFamily: fonts.bold, fontSize: 17 },
  cell: {
    flex: 1,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'right',
    fontVariant: ['tabular-nums'],
  },
  head: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16 },
  fine: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16 },
});
