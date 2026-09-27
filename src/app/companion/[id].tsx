import { useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { CHARACTER_ART } from '@/art/sprites';
import { PixelSprite } from '@/components/pixel-sprite';
import { CLASSES } from '@/game';
import { COMPANIONS, isCharacterId } from '@/story/companions';
import { colors, fonts, radius, spacing } from '@/theme';

export default function CompanionSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (!isCharacterId(id)) return null;
  const companion = COMPANIONS[id];
  const info = CLASSES[companion.dimension];
  const art = CHARACTER_ART[id];

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <View style={[styles.portrait, art && styles.portraitSprite, { borderColor: info.color }]}>
          {art ? (
            <PixelSprite sheet={art.idle} scale={2} />
          ) : (
            <SymbolView name={info.symbol} tintColor={info.color} size={36} />
          )}
        </View>
        <View style={styles.titles}>
          <Text style={styles.name}>{companion.name}</Text>
          {companion.fullName && <Text style={styles.fullName}>{companion.fullName}</Text>}
          <Text style={[styles.className, { color: info.color }]}>
            {info.className} · {info.dimensionLabel} Path
          </Text>
        </View>
      </View>
      <Text style={styles.bio}>{companion.bio}</Text>
      <Text style={[styles.quote, { borderColor: info.color }]}>“{companion.quote}”</Text>
      <View style={[styles.growth, { borderColor: info.color }]}>
        <SymbolView name="arrow.up.circle.fill" tintColor={info.color} size={18} />
        <Text style={styles.growthText}>{info.growth}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.card, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  portrait: {
    width: 88,
    height: 112,
    borderWidth: 2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  /** Sprites stand on the bottom edge rather than float in the middle. */
  portraitSprite: { justifyContent: 'flex-end', paddingBottom: spacing.sm },
  titles: { flex: 1, gap: 2 },
  name: { color: colors.text, fontSize: 36, fontFamily: fonts.bold },
  fullName: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  className: { fontSize: 20, fontFamily: fonts.bold },
  bio: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 23 },
  quote: {
    color: colors.textMuted,
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 21,
    fontStyle: 'italic',
    borderLeftWidth: 3,
    paddingLeft: spacing.md,
  },
  growth: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
    backgroundColor: colors.cardRaised,
    borderLeftWidth: 3,
    borderRadius: radius.sm,
    padding: spacing.md,
  },
  growthText: { flex: 1, color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
});
