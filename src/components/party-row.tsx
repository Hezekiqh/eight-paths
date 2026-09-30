import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CharacterPortrait } from '@/components/character-portrait';
import { XpBar } from '@/components/xp-bar';
import { CLASSES, DIMENSIONS } from '@/game';
import { haptics } from '@/haptics';
import { useCollection } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/**
 * The whole party on one line above the quests: each member's sprite, level
 * and progress to the next. Tapping one opens their character sheet.
 */
export function PartyRow() {
  const { party } = useCollection();
  return (
    <View style={styles.row}>
      {DIMENSIONS.map((d) => {
        const { companion, progress } = party[d];
        const info = CLASSES[d];
        return (
          <Pressable
            key={d}
            accessibilityRole="button"
            accessibilityLabel={`${companion.name}, ${info.className}, level ${progress.level}`}
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
});
