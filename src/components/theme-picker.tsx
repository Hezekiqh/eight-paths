import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { PixelIcon } from '@/components/pixel-icon';
import { haptics } from '@/haptics';
import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { THEME_ID, THEMES, colors, fonts, radius, setTheme, spacing, type ThemeId } from '@/theme';
import { DEFAULT_THEME } from '@/theme/palettes';

/** A tiny window drawn in the theme's own colours: background, frame, text and class dots. */
function Swatch({ id }: { id: ThemeId }) {
  const t = THEMES[id];
  const c = t.colors;
  return (
    <View style={[styles.swatch, { backgroundColor: c.background }]}>
      <View style={[styles.swatchWindow, { backgroundColor: c.card, borderColor: c.frame }]}>
        <View style={[styles.swatchLine, { backgroundColor: c.text, width: 26 }]} />
        <View style={[styles.swatchLine, { backgroundColor: c.textMuted, width: 18 }]} />
        <View style={styles.swatchDots}>
          {Object.values(t.classColors)
            .slice(0, 4)
            .map((color) => (
              <View key={color} style={[styles.swatchDot, { backgroundColor: color }]} />
            ))}
        </View>
      </View>
      <View style={[styles.swatchButton, { backgroundColor: c.accent }]} />
    </View>
  );
}

/**
 * Every theme. Free players have the default (and keep whichever theme they
 * already had); Premium unlocks the rest. Picking one saves it and restarts
 * the app so every screen redraws in the new colours.
 */
export function ThemePicker() {
  const [applying, setApplying] = useState<ThemeId | null>(null);
  const premium = usePremium((s) => s.premium);
  const locked = (id: ThemeId) => premiumEnabled && !premium && id !== DEFAULT_THEME && id !== THEME_ID;

  const choose = (id: ThemeId) => {
    if (id === THEME_ID || applying) return;
    if (locked(id)) return router.push('/paywall');
    haptics.success();
    setApplying(id);
    setTheme(id).catch(() => setApplying(null));
  };

  return (
    <View style={styles.list}>
      {(Object.keys(THEMES) as ThemeId[]).map((id) => {
        const t = THEMES[id];
        const current = id === THEME_ID;
        return (
          <Pressable
            key={id}
            accessibilityRole="radio"
            accessibilityState={{ selected: current }}
            accessibilityLabel={`${t.name} theme. ${t.description}${locked(id) ? ' Premium.' : ''}`}
            onPress={() => choose(id)}
            style={({ pressed }) => [
              styles.row,
              current && { borderColor: colors.accent },
              pressed && { backgroundColor: colors.cardRaised },
            ]}>
            <Swatch id={id} />
            <View style={styles.body}>
              <Text style={[styles.name, current && { color: colors.accent }]}>{t.name}</Text>
              <Text style={styles.description}>{t.description}</Text>
            </View>
            {applying === id ? (
              <ActivityIndicator color={colors.accent} />
            ) : current ? (
              <PixelIcon name="heart" color={colors.accent} size={24} />
            ) : locked(id) ? (
              <PixelIcon name="star" color={colors.textFaint} size={24} />
            ) : null}
          </Pressable>
        );
      })}
      <Text style={styles.note}>
        {premiumEnabled && !premium
          ? 'Starred themes come with Premium. Changing theme restarts the app for a moment.'
          : 'Changing theme restarts the app for a moment.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  swatch: { width: 72, height: 52, padding: 6, borderRadius: radius.md, justifyContent: 'space-between' },
  swatchWindow: { flex: 1, borderWidth: 2, padding: 3, gap: 2 },
  swatchLine: { height: 3 },
  swatchDots: { flexDirection: 'row', gap: 3, marginTop: 1 },
  swatchDot: { width: 5, height: 5 },
  swatchButton: { height: 5, width: 24, alignSelf: 'flex-end', marginTop: 3 },
  body: { flex: 1, gap: 2 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  description: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  note: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, marginTop: spacing.xs },
});
