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

/** Shown until the App Store supplies the localized prices. */
export const PREMIUM_PRICE = '$2.99';
export const FOUNDER_PRICE = '$0.99';

export const TERMS_URL = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
export const PRIVACY_URL = 'https://hezekiqh.github.io/eight-paths/privacy.html';

export type Perk = { title: string; free: string; premium: string };

/** What the paywall lists, free next to Premium. */
export const PERKS: Perk[] = [
  { title: 'XP per habit', free: '10 XP, up to 30 a Path a day', premium: '20 XP, up to 60 a Path a day' },
  { title: 'Habits', free: 'Up to 10', premium: 'Unlimited' },
  { title: '1★ odds', free: 'Standard', premium: 'About twice as likely' },
  { title: 'Redo a drop', free: '—', premium: 'Once per drop' },
  { title: 'Time in the Other World', free: '15 min a day', premium: 'Unlimited' },
  { title: 'Themes', free: 'The default', premium: 'Every theme' },
  { title: 'Badge', free: '—', premium: 'Coming soon: a Premium badge, gold for founders' },
];
