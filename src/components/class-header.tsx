import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CharacterPortrait } from '@/components/character-portrait';
import { XpBar } from '@/components/xp-bar';
import type { ClassInfo } from '@/game';
import { haptics } from '@/haptics';
import { useCollection } from '@/store/hooks';
import { colors, fonts, spacing } from '@/theme';

/**
 * Section header for a class: the party member on that Path, their name and
 * level above the class name. Tapping it opens their character sheet.
 */
export function ClassHeader({ info, compact = false }: { info: ClassInfo; compact?: boolean }) {
  const { companion, progress } = useCollection().party[info.dimension];
  // Under the party row the portraits are already on show, so a group only needs its name.
  if (compact) {
    return (
      <View style={styles.compact}>
        <Text style={[styles.title, { color: info.color }]}>{info.className.toUpperCase()}</Text>
        <Text style={styles.compactName} numberOfLines={1}>
          {companion.name}
        </Text>
      </View>
    );
  }
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${companion.name}, ${info.className}, level ${progress.level}`}
      accessibilityHint={`About ${companion.name}`}
      onPress={() => {
        haptics.tap();
        router.push(`/companion/${companion.id}`);
      }}
      style={({ pressed }) => [styles.header, pressed && { opacity: 0.6 }]}>
      <CharacterPortrait companion={companion} />
      <View style={styles.names}>
        <View style={styles.nameRow}>
          <Text style={styles.name} numberOfLines={1}>
            {companion.name}
          </Text>
          <Text style={styles.level}>Lv {progress.level}</Text>
        </View>
        <Text style={[styles.title, { color: info.color }]}>{info.className.toUpperCase()}</Text>
        <View style={styles.xpRow}>
          <View style={styles.bar}>
            <XpBar fill={progress.xpIntoLevel / progress.xpForNext} color={info.color} height={6} />
          </View>
          <Text style={styles.xp}>
            {progress.xpIntoLevel}/{progress.xpForNext}
          </Text>
        </View>
      </View>
      <SymbolView name="info.circle" tintColor={colors.textFaint} size={14} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  names: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm },
  name: { flexShrink: 1, color: colors.text, fontSize: 20, fontFamily: fonts.bold },
  level: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  title: { fontSize: 15, fontFamily: fonts.bold, letterSpacing: 1.2 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  bar: { flex: 1 },
  compact: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginTop: spacing.sm },
  compactName: { flexShrink: 1, color: colors.textMuted, fontSize: 14, fontFamily: fonts.regular },
  xp: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12, fontVariant: ['tabular-nums'] },
});
