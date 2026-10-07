/**
 * Eight Paths Premium: support the game and lore. More of everything, never access. The habit tracker stays
 * free (GAME.md). The rules behind each perk are outlined in PREMIUM.md.
 */

import { purchasesEnabled } from './purchases';

/**
 * Premium shows once RevenueCat is configured (a release build with its key). In
 * development without the key, buying just flips a local flag for previewing.
 */
export const premiumEnabled = purchasesEnabled || __DEV__;

/**
 * Shown until the App Store supplies the localized prices (and in development, where it never does).
 * The real prices are set in App Store Connect; keep these matching them.
 */
export const FALLBACK_PRICES = { regular: 3.99, yearly: 24.99, founder: 0.99 } as const;

export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://hezekiqh.github.io/eight-paths/privacy.html';

/** The creator's own words at the top of the paywall, before the perks. */
export const CREATOR_NOTE =
  "Seasons 2 through 8 are in production. Next, I'd like to give Eight Paths music made by real musicians, not AI. " +
  "If you're enjoying the journey, please support the game's development by subscribing to Premium. " +
  'Your habits, levels and heroes stay free, always.';
export const CREATOR_SIGNATURE = '— Hez';

export type Perk = { title: string; free: string; premium: string };

/** What the paywall lists, free next to Premium. */
export const PERKS: Perk[] = [
  { title: 'Level barriers', free: "Reach each place's level first", premium: 'None: go anywhere, at any level' },
  { title: '5★ odds', free: 'Standard', premium: 'About twice as likely' },
  { title: 'Redo a drop', free: '—', premium: 'Once per drop' },
  { title: 'Special moves', free: 'One a day', premium: 'Three a day' },
  { title: 'XP per habit', free: '10 XP, up to 30 a Path a day', premium: '20 XP, up to 60 a Path a day' },
  { title: 'Habits', free: 'Up to 10', premium: 'Unlimited' },
  { title: 'Themes', free: 'The default', premium: 'Every theme' },
  { title: 'Dopamine Regulator', free: '—', premium: 'Included' },
];
