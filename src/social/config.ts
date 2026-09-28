/**
 * Social features switch on only when the app is built with the Supabase
 * project's URL and publishable key (EXPO_PUBLIC_SUPABASE_URL and
 * EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY, in .env.local or the EAS build env).
 * Without them the app is exactly as before: offline, no accounts.
 */
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '';
export const socialEnabled = SUPABASE_URL !== '' && SUPABASE_KEY !== '';

/** How many founder numbers there are: the Second 100. */
export const FOUNDER_COUNT = 100;
