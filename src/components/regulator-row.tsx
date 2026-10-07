import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PixelIcon } from '@/components/pixel-icon';
import { HpBar } from '@/components/player-card';
import { haptics } from '@/haptics';
import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { useHp, useRegulatorActive } from '@/regulator/hooks';
import { useRegulator } from '@/regulator/store';
import { FRAME, colors, fonts, spacing } from '@/theme';
import { showDialog } from '@/components/dialog';

/** The Regulator's purple: set apart from every other setting. */
export const REGULATOR_COLOR = '#8B5CF6';

/** Told to a player without Premium, in place of opening it. */
export const REGULATOR_PITCH =
  'Short videos, sugar and vaping lift your dopamine far above your Dopamine Baseline, the steady level that makes ordinary things feel good. Afterwards, your baseline settles a little lower while it recovers.\n\nThe Regulator helps you keep it steady. Your baseline shows as a DB bar: a ten-second check-in each morning notes what spiked it, and every habit you keep lifts it back up. Everything stays on your phone.';

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

/** The entry in Settings: framed and coloured to stand out from the other settings. */
export function RegulatorRow({ today }: { today: string }) {
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
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={styles.row}>
        <View style={styles.icon}>
          <PixelIcon name="potion" color={colors.background} size={24} />
        </View>
        <View style={styles.text}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Dopamine Regulator</Text>
            {!premium && <Text style={styles.badge}>PREMIUM</Text>}
          </View>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        <PixelIcon name="chevron-right" color={REGULATOR_COLOR} size={24} />
      </View>
      {active && <HpBar hp={hp} height={8} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderWidth: FRAME,
    borderColor: REGULATOR_COLOR,
    borderRadius: 3,
    shadowColor: REGULATOR_COLOR,
    shadowOpacity: 0.9,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    padding: spacing.md,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  pressed: { transform: [{ translateX: 3 }, { translateY: 3 }], shadowOffset: { width: 1, height: 1 } },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  icon: {
    width: 36,
    height: 36,
    backgroundColor: REGULATOR_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontSize: 22, fontFamily: fonts.bold },
  badge: {
    color: colors.background,
    backgroundColor: REGULATOR_COLOR,
    fontFamily: fonts.bold,
    fontSize: 12,
    letterSpacing: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  subtitle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
});
