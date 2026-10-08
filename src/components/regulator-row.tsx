import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PixelIcon } from '@/components/pixel-icon';
import { HpBar } from '@/components/player-card';
import { haptics } from '@/haptics';
import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { useHp, useRegulatorActive } from '@/regulator/hooks';
import { useRegulator } from '@/regulator/store';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import { showDialog } from '@/components/dialog';

/** The Regulator's purple: set apart from every other setting. */
export const REGULATOR_COLOR = '#8B5CF6';

/** Told to a player without Premium, in place of opening it. */
export const REGULATOR_PITCH =
  'Short videos, sugar and vaping lift your dopamine far above your Dopamine Baseline, the steady level that makes ordinary things feel good. Afterwards, your baseline settles a little lower while it recovers.\n\nYour Dopamine Baseline is basically your real-life health or energy bar, so it shows as an HP bar. The Regulator helps you keep it steady: a ten-second check-in each morning notes what spiked it, and every habit you keep lifts it back up. Everything stays on your phone.';

/** Opens the Regulator over the current screen (`from` names it on the Back button), or tells a free player about it. */
export function openRegulator(from?: 'settings') {
  haptics.tap();
  if (!usePremium.getState().premium) {
    showDialog(
      'Dopamine Regulator · Premium',
      REGULATOR_PITCH,
      premiumEnabled
        ? [
            { text: 'Not now', style: 'cancel' },
            { text: 'See Premium', onPress: () => router.push('/paywall') },
          ]
        : [{ text: 'OK' }],
    );
    return;
  }
  router.push({ pathname: '/regulator', params: from ? { from } : {} });
}

/** The entry in Settings, framed like the other settings lists, with the HP bar once it's on. */
export function RegulatorRow({ today, color }: { today: string; color: string }) {
  const premium = usePremium((s) => s.premium);
  const enabled = useRegulator((s) => s.enabled);
  const active = useRegulatorActive();
  const { hp } = useHp(today);

  const subtitle = !premium
    ? 'Premium · for seasoned players'
    : active
      ? 'On · tap for your check-in, calendar and settings'
      : enabled
        ? 'Almost there · finish setting it up'
        : 'Off · see what super stimuli cost you';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Dopamine Regulator. ${subtitle}`}
      onPress={() => openRegulator('settings')}
      style={({ pressed }) => [styles.card, pressed && { backgroundColor: colors.cardRaised }]}>
      <View style={styles.row}>
        <PixelIcon name="potion" color={color} size={24} />
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Dopamine Regulator</Text>
            {!premium && <Text style={[styles.badge, { color, borderColor: color }]}>PREMIUM</Text>}
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <PixelIcon name="chevron-right" color={colors.textFaint} size={24} />
      </View>
      {active && <HpBar hp={hp} height={8} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...windowStyle,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 56,
    gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: 21, fontFamily: fonts.semibold },
  badge: {
    borderWidth: 1,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1,
    paddingHorizontal: 4,
  },
  subtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});
