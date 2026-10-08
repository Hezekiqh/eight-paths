import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CharacterPortrait } from '@/components/character-portrait';
import { XpBar } from '@/components/xp-bar';
import { BOOST_MULTIPLIER, CLASSES, DIMENSIONS } from '@/game';
import { haptics } from '@/haptics';
import { useGameStore } from '@/store';
import { useCollection } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/**
 * The whole party on one line above the quests: each member's sprite, level
 * and progress to the next, with "×2 · 3" under anyone whose class has a
 * multiplier drop waiting (3 = habits left). Tapping one opens their character sheet.
 */
export function PartyRow() {
  const { party } = useCollection();
  const boosts = useGameStore((s) => s.boosts);
  return (
    <View style={styles.row}>
      {DIMENSIONS.map((d) => {
        const { companion, progress } = party[d];
        const info = CLASSES[d];
        const left = boosts.find((b) => b.dimension === d)?.left ?? 0;
        return (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={`${companion.name}, ${info.className}, level ${progress.level}${
              left > 0 ? `, double XP on the next ${left} ${info.className} ${left === 1 ? 'quest' : 'quests'}` : ''
            }`}
            accessibilityHint={`About ${companion.name}`}
            onPress={() => {
              haptics.tap();
              router.push(`/companion/${companion.id}`);
            }}
            style={({ pressed }) => [styles.member, pressed && { opacity: 0.6 }]}>
            <View style={styles.sprite}>
              <CharacterPortrait companion={companion} scale={0.75} />
            </View>
            <Text style={styles.level}>{progress.level}</Text>
            <View style={styles.bar}>
              <XpBar fill={progress.xpIntoLevel / progress.xpForNext} color={info.color} height={4} />
            </View>
            {left > 0 && (
              <View style={[styles.boost, { backgroundColor: info.color }]}>
                <Text style={styles.boostText} numberOfLines={1} adjustsFontSizeToFit>
                  ×{BOOST_MULTIPLIER}·{left}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    ...windowStyle,
    flexDirection: 'row',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  member: { flex: 1, alignItems: 'center', gap: 2 },
  sprite: { height: 36, justifyContent: 'flex-end' },
  level: { color: colors.textMuted, fontSize: 13, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  bar: { alignSelf: 'stretch', paddingHorizontal: 4 },
  boost: { paddingHorizontal: 3, marginTop: 1, borderRadius: 2 },
  boostText: { color: colors.background, fontFamily: fonts.bold, fontSize: 11, fontVariant: ['tabular-nums'] },
});
