import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useEffect } from 'react';
import Purchases, {
  INTRO_ELIGIBILITY_STATUS,
  PURCHASES_ERROR_CODE,
  type CustomerInfo,
  type IntroEligibility,
  type PurchasesStoreProduct,
} from 'react-native-purchases';

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

/** App Store Connect product ids, all in the "Eight Paths Premium" subscription group. */
export const PRODUCTS = {
  regular: 'premium_monthly',
  yearly: 'premium_yearly',
  founder: 'premium_founder_monthly',
} as const;
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

/** A product as the paywall offers it: its free trial, if this Apple ID can still take one (e.g. "7 days"). */
export type Offer = { product: PurchasesStoreProduct; freeTrial: string | null };

const UNITS: Record<string, string> = { DAY: 'day', WEEK: 'week', MONTH: 'month', YEAR: 'year' };

/** "7 days" for a free introductory offer, or null when it isn't free or isn't a known length. */
function trialLength(product: PurchasesStoreProduct): string | null {
  const intro = product.introPrice;
  const unit = intro && UNITS[intro.periodUnit];
  if (!intro || intro.price !== 0 || !unit) return null;
  const n = intro.periodNumberOfUnits * (intro.cycles || 1);
  return `${n} ${unit}${n === 1 ? '' : 's'}`;
}

/** The App Store's localized products, or an empty list when they can't be loaded. */
export async function loadProducts(): Promise<Partial<Record<ProductKind, Offer>>> {
  if (!purchasesEnabled) return {};
  try {
    const ids = Object.values(PRODUCTS);
    const products = await Purchases.getProducts(ids);
    // A trial is only offered to an Apple ID that hasn't had one in this group yet.
    const eligibility: Record<string, IntroEligibility> = await Purchases.checkTrialOrIntroductoryPriceEligibility(
      ids,
    ).catch(() => ({}));
    const offers: Partial<Record<ProductKind, Offer>> = {};
    for (const kind of Object.keys(PRODUCTS) as ProductKind[]) {
      const product = products.find((p) => p.identifier === PRODUCTS[kind]);
      if (!product) continue;
      const eligible =
        eligibility[product.identifier]?.status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE;
      offers[kind] = { product, freeTrial: eligible ? trialLength(product) : null };
    }
    return offers;
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
