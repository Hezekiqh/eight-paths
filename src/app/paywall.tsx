import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { close } from '@/components/modal-header';
import { haptics } from '@/haptics';
import { CREATOR_NOTE, CREATOR_SIGNATURE, FALLBACK_PRICES, PERKS, PRIVACY_URL, TERMS_URL } from '@/premium/config';
import { buy, loadProducts, purchasesEnabled, restore, type Offer, type ProductKind } from '@/premium/purchases';
import { usePremium } from '@/premium/store';
import { useSocial } from '@/social/store';
import { founderLabel } from '@/social/username';
import { useClassInfo } from '@/store/hooks';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

const dollars = (n: number) => `$${n.toFixed(2)}`;
const PERIOD: Record<ProductKind, 'month' | 'year'> = { regular: 'month', yearly: 'year', founder: 'month' };

/**
 * Eight Paths Premium. Founders (the Second 100) are offered the founder price;
 * everyone else chooses yearly (picked by default) or monthly. Shown once after
 * the Keeper's tour or sign-up, whichever comes first, and from Settings.
 */
export default function Paywall() {
  const color = useClassInfo()?.color ?? colors.accent;
  const founderNumber = useSocial((s) => s.profile?.founderNumber ?? null);
  const premium = usePremium((s) => s.premium);
  const founder = founderNumber !== null;
  const [chosen, setChosen] = useState<ProductKind>('yearly');
  const kind: ProductKind = founder ? 'founder' : chosen;
  const [offers, setOffers] = useState<Partial<Record<ProductKind, Offer>> | null>(purchasesEnabled ? null : {});
  const [busy, setBusy] = useState(false);
  const offer = offers?.[kind];

  // The App Store's localized prices when they have loaded; ours until then.
  const amount = (k: ProductKind) => offers?.[k]?.product.price ?? FALLBACK_PRICES[k];
  const price = (k: ProductKind) => offers?.[k]?.product.priceString ?? dollars(FALLBACK_PRICES[k]);
  const yearlyPerMonth = offers?.yearly?.product.pricePerMonthString ?? dollars(FALLBACK_PRICES.yearly / 12);
  const saving = Math.round((1 - amount('yearly') / (amount('regular') * 12)) * 100);
  const period = PERIOD[kind];
  const trial = offer?.freeTrial ?? null;
  // With RevenueCat on, the button waits for a real product to sell.
  const canBuy = purchasesEnabled ? offer !== undefined : true;

  useEffect(() => {
    usePremium.setState({ offerSeen: true });
    if (purchasesEnabled) loadProducts().then(setOffers);
  }, []);

  const subscribe = async () => {
    if (!purchasesEnabled) {
      // Development without a RevenueCat key: preview Premium locally.
      usePremium.setState({ premium: true });
      haptics.celebrate();
      return close();
    }
    if (!offer) return;
    setBusy(true);
    const result = await buy(offer.product);
    setBusy(false);
    if (result === 'bought') {
      haptics.celebrate();
      close();
    } else if (result === 'failed') {
      Alert.alert('Purchase failed', "The App Store couldn't complete it. You haven't been charged.");
    }
  };

  const restorePurchases = async () => {
    if (!purchasesEnabled) return Alert.alert('Restore purchases', 'Purchases are off in this build.');
    setBusy(true);
    try {
      const restored = await restore();
      Alert.alert(
        restored ? 'Premium restored' : 'Nothing to restore',
        restored ? 'Welcome back.' : "This Apple ID doesn't have Premium.",
      );
    } catch {
      Alert.alert('Restore failed', "Couldn't reach the App Store. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const plan = (k: 'yearly' | 'regular', label: string, sub: string, badge?: string) => {
    const selected = chosen === k;
    return (
      <Pressable
        key={k}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        onPress={() => {
          haptics.select();
          setChosen(k);
        }}
        style={[styles.plan, selected && { borderColor: color, backgroundColor: colors.card }]}>
        <View style={[styles.radio, { borderColor: selected ? color : colors.border }]}>
          {selected && <View style={[styles.dot, { backgroundColor: color }]} />}
        </View>
        <View style={styles.flex}>
          <Text style={styles.planLabel}>{label}</Text>
          <Text style={styles.planSub}>{sub}</Text>
        </View>
        {badge && (
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={12}>
          <Text style={styles.later}>Maybe later</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, { color }]}>EIGHT PATHS PREMIUM</Text>
        <Text style={styles.title}>Wake the legends faster</Text>

        <View style={[styles.letter, { borderColor: color }]}>
          <Text style={[styles.letterHead, { color }]}>A NOTE FROM THE CREATOR</Text>
          <Text style={styles.letterBody}>{CREATOR_NOTE}</Text>
          <Text style={styles.signature}>{CREATOR_SIGNATURE}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.row}>
            <Text style={[styles.cell, styles.head]} />
            <Text style={[styles.cell, styles.head]}>FREE</Text>
            <Text style={[styles.cell, styles.head, { color }]}>PREMIUM</Text>
          </View>
          {PERKS.map((perk) => (
            <View key={perk.title} style={[styles.row, styles.rowLine]}>
              <Text style={[styles.cell, styles.perk]}>{perk.title}</Text>
              <Text style={[styles.cell, styles.free]}>{perk.free}</Text>
              <Text style={[styles.cell, styles.premium]}>{perk.premium}</Text>
            </View>
          ))}
        </View>

        {premium ? (
          <>
            <Text style={[styles.have, { color }]}>You have Premium. Thank you.</Text>
            {__DEV__ && !purchasesEnabled && (
              <Button
                title="Dev: turn Premium off"
                variant="ghost"
                color={color}
                onPress={() => usePremium.setState({ premium: false })}
              />
            )}
          </>
        ) : (
          <>
            {founder ? (
              <View style={[styles.founder, { borderColor: color }]}>
                <Text style={[styles.founderLabel, { color }]}>SECOND 100 · {founderLabel(founderNumber)}</Text>
                <Text style={styles.founderPrice}>{price('founder')} / month</Text>
                <Text style={styles.body}>
                  Only the first 100 players get this price, and it&apos;s yours for as long as you stay subscribed. If
                  you cancel, it&apos;s gone for good.
                </Text>
              </View>
            ) : (
              <View accessibilityRole="radiogroup" style={styles.plans}>
                {plan(
                  'yearly',
                  `Yearly · ${price('yearly')}`,
                  `Just ${yearlyPerMonth} a month`,
                  saving > 0 ? `SAVE ${saving}%` : undefined,
                )}
                {plan('regular', `Monthly · ${price('regular')}`, 'Cancel anytime')}
              </View>
            )}

            {busy || offers === null ? (
              <ActivityIndicator color={color} />
            ) : canBuy ? (
              <Button
                title={trial ? `Start ${trial} free` : `Subscribe · ${price(kind)} / ${period}`}
                onPress={subscribe}
                color={color}
              />
            ) : (
              <Text style={styles.fine}>Couldn&apos;t reach the App Store. Close this and try again in a moment.</Text>
            )}
          </>
        )}

        <Text style={styles.fine}>
          {trial ? `${trial} free, then ` : ''}
          {price(kind)} a {period}, billed to your Apple ID. Renews every {period} until you cancel, at least 24 hours
          before the period ends, in your App Store settings.
        </Text>
        <View style={styles.links}>
          <Pressable accessibilityRole="button" onPress={restorePurchases} hitSlop={8}>
            <Text style={styles.link}>Restore purchases</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => router.push('/drop-odds')} hitSlop={8}>
            <Text style={styles.link}>Drop odds</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(TERMS_URL)} hitSlop={8}>
            <Text style={styles.link}>Terms of Use</Text>
          </Pressable>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}>
            <Text style={styles.link}>Privacy</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: { flexDirection: 'row', justifyContent: 'flex-end', padding: spacing.lg },
  later: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 17 },
  content: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.lg },
  kicker: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: 1 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 38, lineHeight: 40 },
  body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  founder: { ...windowStyle, padding: spacing.lg, gap: spacing.sm },
  founderLabel: { fontFamily: fonts.bold, fontSize: 18, letterSpacing: 1 },
  founderPrice: { color: colors.text, fontFamily: fonts.bold, fontSize: 34 },
  letter: { ...windowStyle, padding: spacing.lg, gap: spacing.sm, borderLeftWidth: 6 },
  letterHead: { fontFamily: fonts.bold, fontSize: 17, letterSpacing: 1 },
  letterBody: { color: colors.text, fontFamily: fonts.ancient, fontSize: 17, lineHeight: 24 },
  signature: { color: colors.textMuted, fontFamily: fonts.ancientItalic, fontSize: 17, textAlign: 'right' },
  table: { ...windowStyle, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  plans: { gap: spacing.md },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderWidth: 3,
    borderColor: colors.border,
    borderRadius: radius.lg,
  },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5 },
  flex: { flex: 1 },
  planLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  planSub: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { color: colors.background, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1 },
  row: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.sm },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  cell: { flex: 1, fontFamily: fonts.regular, fontSize: 13, lineHeight: 17 },
  head: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16 },
  perk: { color: colors.text, fontWeight: '600' },
  free: { color: colors.textMuted },
  premium: { color: colors.text },
  have: { fontFamily: fonts.bold, fontSize: 24, textAlign: 'center' },
  fine: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, textAlign: 'center' },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    columnGap: spacing.lg,
    rowGap: spacing.sm,
  },
  link: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, textDecorationLine: 'underline' },
});
