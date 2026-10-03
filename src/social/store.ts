import { create } from 'zustand';

import { socialEnabled } from './config';
import type { TradeOffer } from './trade';

/** A player's public profile, as friends and the server see it. Never habits. */
export type Profile = {
  id: string;
  username: string;
  /** Their place in the Second 100, or null after the first hundred. */
  founderNumber: number | null;
  friendCode: string;
  leader: string | null;
  party: string[];
  level: number;
  /** Null when the player has turned consistency sharing off. */
  daysShownUp: number | null;
  streak: number | null;
  createdAt: string;
};

/** How many players have woken a character, and who did it first. */
export type CharacterStat = { wokenBy: number; players: number; firstUsername: string | null };

export type SocialStatus = 'off' | 'loading' | 'signedOut' | 'needsUsername' | 'ready';

type SocialState = {
  status: SocialStatus;
  profile: Profile | null;
  friends: Profile[];
  stats: Record<string, CharacterStat>;
  /** Share days shown up and streak with friends (numbers only). */
  shareConsistency: boolean;
  /** A friend code from a link, waiting until the player has an account. */
  pendingFriendCode: string | null;
  /** Open trade offers this player sent or received, newest first. */
  offers: TradeOffer[];
  /** Bumped by Start over (resetGameData), so sync forgets what it already sent. */
  resets: number;
};

/** Social state for this launch. The session itself lives in Supabase's storage. */
export const useSocial = create<SocialState>(() => ({
  status: socialEnabled ? 'loading' : 'off',
  profile: null,
  friends: [],
  stats: {},
  shareConsistency: true,
  pendingFriendCode: null,
  offers: [],
  resets: 0,
}));
