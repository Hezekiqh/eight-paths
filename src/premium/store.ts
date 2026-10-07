import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Tier } from '@/game';
import type { GateOffer } from '@/world/gate-guards';

type PremiumState = {
  /** Whether this player has Premium. For now only the dev toggle sets it; later, the App Store. */
  premium: boolean;
  /** The paywall has been shown (after the tour, sign-up or from Settings), so it isn't pushed again. */
  offerSeen: boolean;
  /** The Premium sheets shown at the World's level gates, and on which day (gate-guards.ts shouldOfferPremium). */
  gateOffers: GateOffer[];
};

/** Kept apart from the game save: Premium belongs to the Apple ID, not to a backup. */
export const usePremium = create<PremiumState>()(
  persist((): PremiumState => ({ premium: false, offerSeen: false, gateOffers: [] }), {
    name: 'eight-paths-premium',
    storage: createJSONStorage(() => AsyncStorage),
  }),
);

/** The player's tier right now, for the game rules. */
export const currentTier = (): Tier => (usePremium.getState().premium ? 'premium' : 'free');
