import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { PurchasesStoreProduct } from 'react-native-purchases';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { close } from '@/components/modal-header';
import { haptics } from '@/haptics';
import { FOUNDER_PRICE, PERKS, PREMIUM_PRICE, PRIVACY_URL, TERMS_URL } from '@/premium/config';
import { buy, loadProducts, purchasesEnabled, restore, type ProductKind } from '@/premium/purchases';
import { usePremium } from '@/premium/store';
import { useSocial } from '@/social/store';
import { founderLabel } from '@/social/username';
import { useClassInfo } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/**
 * Eight Paths Premium. Founders (the Second 100) are offered the founder price;
 * everyone else the regular one. Shown once after sign-up, and from Settings.
 */
export default function Paywall() {
  const color = useClassInfo()?.color ?? colors.accent;
  const founderNumber = useSocial((s) => s.profile?.founderNumber ?? null);
  const premium = usePremium((s) => s.premium);
  const founder = founderNumber !== null;
  const kind: ProductKind = founder ? 'founder' : 'regular';
  const [products, setProducts] = useState<Partial<Record<ProductKind, PurchasesStoreProduct>> | null>(
    purchasesEnabled ? null : {},
  );
  const [busy, setBusy] = useState(false);
  const product = products?.[kind];
  // The App Store's localized price when it has loaded; ours until then.
  const price = product?.priceString ?? (founder ? FOUNDER_PRICE : PREMIUM_PRICE);
  // With RevenueCat on, the button waits for a real product to sell.
  const canBuy = purchasesEnabled ? product !== undefined : true;

  useEffect(() => {
    usePremium.setState({ offerSeen: true });
    if (purchasesEnabled) loadProducts().then(setProducts);
  }, []);

  const subscribe = async () => {
    if (!purchasesEnabled) {
      // Development without a RevenueCat key: preview Premium locally.
      usePremium.setState({ premium: true });
      haptics.celebrate();
      return close();
    }
    if (!product) return;
    setBusy(true);
    const result = await buy(product);
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

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <View style={styles.bar}>
        <Pressable accessibilityRole="button" onPress={close} hitSlop={12}>
          <Text style={styles.later}>Maybe later</Text>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, { color }]}>EIGHT PATHS PREMIUM</Text>
        <Text style={styles.title}>Upgrade to Premium</Text>
        <Text style={styles.body}>
          Support the game and lore by upgrading to Premium. Your habits, levels and heroes stay free, always.
        </Text>

        {founder && (
          <View style={[styles.founder, { borderColor: color }]}>
            <Text style={[styles.founderLabel, { color }]}>SECOND 100 · {founderLabel(founderNumber)}</Text>
            <Text style={styles.founderPrice}>{price} / month</Text>
            <Text style={styles.body}>
              Only the first 100 players get this price, and it&apos;s yours for as long as you stay subscribed. If you
              cancel, it&apos;s gone for good.
            </Text>
          </View>
        )}

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
        ) : busy || products === null ? (
          <ActivityIndicator color={color} />
        ) : canBuy ? (
          <Button title={`Subscribe · ${price} / month`} onPress={subscribe} color={color} />
        ) : (
          <Text style={styles.fine}>Couldn&apos;t reach the App Store. Close this and try again in a moment.</Text>
        )}

        <Text style={styles.fine}>
          {price} a month, billed to your Apple ID. Renews monthly until you cancel, at least 24 hours before the period
          ends, in your App Store settings.
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
  table: { ...windowStyle, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
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
