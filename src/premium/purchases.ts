import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import Purchases, { PURCHASES_ERROR_CODE, type CustomerInfo, type PurchasesStoreProduct } from 'react-native-purchases';

import { useSocial } from '@/social/store';

import { usePremium } from './store';

/**
 * RevenueCat's public iOS key (EXPO_PUBLIC_REVENUECAT_IOS_KEY, in .env.local
 * or the EAS build env). Without it purchases are off, and in development the
 * paywall's button just flips the local Premium flag. Expo Go can't reach the
 * App Store (RevenueCat rejects a real key there), so it counts as off too.
 */
const API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
const inExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
export const purchasesEnabled = API_KEY !== '' && !inExpoGo;

/** The RevenueCat entitlement both products grant. */
export const ENTITLEMENT = 'premium';

/** App Store Connect product ids, both in the "Eight Paths Premium" subscription group. */
export const PRODUCTS = { regular: 'premium_monthly', founder: 'premium_founder_monthly' } as const;
export type ProductKind = keyof typeof PRODUCTS;

const hasPremium = (info: CustomerInfo) => info.entitlements.active[ENTITLEMENT] !== undefined;
const record = (info: CustomerInfo) => usePremium.setState({ premium: hasPremium(info) });

let started = false;

async function start() {
  if (!purchasesEnabled || started) return;
  started = true;
  Purchases.configure({ apiKey: API_KEY });
  Purchases.addCustomerInfoUpdateListener(record);
  try {
    record(await Purchases.getCustomerInfo());
  } catch {
    // Offline: keep the last known answer until the listener hears otherwise.
  }
}

/**
 * Starts RevenueCat once, and ties purchases to the social account when there
 * is one, so the server can tell who has Premium.
 */
export function usePurchases() {
  const userId = useSocial((s) => s.profile?.id ?? null);
  useEffect(() => {
    start();
  }, []);
  useEffect(() => {
    if (!purchasesEnabled || !userId) return;
    Purchases.logIn(userId)
      .then(({ customerInfo }) => record(customerInfo))
      .catch(() => {});
  }, [userId]);
}

/** The App Store's localized products, or an empty list when they can't be loaded. */
export async function loadProducts(): Promise<Partial<Record<ProductKind, PurchasesStoreProduct>>> {
  if (!purchasesEnabled) return {};
  try {
    const products = await Purchases.getProducts(Object.values(PRODUCTS));
    const byId = (id: string) => products.find((p) => p.identifier === id);
    return { regular: byId(PRODUCTS.regular), founder: byId(PRODUCTS.founder) };
  } catch {
    return {};
  }
}

export type BuyResult = 'bought' | 'canceled' | 'failed';

export async function buy(product: PurchasesStoreProduct): Promise<BuyResult> {
  try {
    const { customerInfo } = await Purchases.purchaseStoreProduct(product);
    record(customerInfo);
    return hasPremium(customerInfo) ? 'bought' : 'failed';
  } catch (e) {
    return (e as { code?: string }).code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ? 'canceled' : 'failed';
  }
}

/** Restores Premium bought on this Apple ID. True if it's active afterwards. */
export async function restore(): Promise<boolean> {
  const info = await Purchases.restorePurchases();
  record(info);
  return hasPremium(info);
}
