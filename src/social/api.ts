import * as AppleAuthentication from 'expo-apple-authentication';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Share } from 'react-native';

import { supabase } from './client';
import { socialEnabled } from './config';
import { useSocial, type CharacterStat, type Profile } from './store';
import { extractFriendCode, usernameProblem } from './username';

const PROFILE_COLUMNS =
  'id, username, founder_number, friend_code, leader, party, level, days_shown_up, streak, created_at';

type ProfileRow = {
  id: string;
  username: string;
  founder_number: number | null;
  friend_code: string;
  leader: string | null;
  party: string[] | null;
  level: number;
  days_shown_up: number | null;
  streak: number | null;
  created_at: string;
};

const toProfile = (r: ProfileRow): Profile => ({
  id: r.id,
  username: r.username,
  founderNumber: r.founder_number,
  friendCode: r.friend_code,
  leader: r.leader,
  party: r.party ?? [],
  level: r.level,
  daysShownUp: r.days_shown_up,
  streak: r.streak,
  createdAt: r.created_at,
});

/** A friendly message for anything that went wrong talking to the server. */
export class SocialError extends Error {}
const fail = (message: string): never => {
  throw new SocialError(message);
};
const OFFLINE = "Couldn't reach the server. Check your connection and try again.";

let started = false;

/** Restores a saved session on launch. Safe to call more than once. */
export async function startSocial() {
  if (!socialEnabled || started) return;
  started = true;
  const sb = supabase();
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') useSocial.setState({ status: 'signedOut', profile: null, friends: [] });
  });
  try {
    const { data } = await sb.auth.getSession();
    await loadAccount(data.session?.user.id ?? null);
  } catch {
    // Offline at launch: stay signed out of social for now; the game is unaffected.
    useSocial.setState({ status: 'signedOut' });
  }
}

/** After sign-in (or on launch), load the profile and decide what the player needs next. */
async function loadAccount(userId: string | null) {
  if (!userId) return useSocial.setState({ status: 'signedOut', profile: null });
  const { data, error } = await supabase().from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
  if (error) fail(OFFLINE);
  if (!data) return useSocial.setState({ status: 'needsUsername', profile: null });
  const profile = toProfile(data as ProfileRow);
  // Sharing starts on; it's only off if they turned it off (numbers uploaded as null after syncing).
  const synced = profile.leader !== null;
  useSocial.setState({ status: 'ready', profile, shareConsistency: !synced || profile.daysShownUp !== null });
  await Promise.allSettled([refreshFriends(), refreshStats()]);
  const pending = useSocial.getState().pendingFriendCode;
  if (pending) {
    useSocial.setState({ pendingFriendCode: null });
    await addFriend(pending).catch(() => {});
  }
}

/** Sign in with Apple. Only an identifier is requested: no name, no email. */
export async function signInWithApple(): Promise<'ok' | 'canceled'> {
  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return 'canceled';
    if (__DEV__) console.warn('Sign in with Apple failed', e);
    return fail("Sign in with Apple didn't work. Please try again.");
  }
  if (!credential.identityToken) fail("Sign in with Apple didn't work. Please try again.");
  const { data, error } = await supabase().auth.signInWithIdToken({
    provider: 'apple',
    token: credential.identityToken!,
  });
  if (error || !data.user) fail(OFFLINE);
  await loadAccount(data.user!.id);
  return 'ok';
}

/** Reads `key=value` pairs from a URL's fragment and query (tokens come back in either). */
function urlParams(url: string): Record<string, string> {
  const params: Record<string, string> = {};
  const parts = [url.split('#')[1], url.split('?')[1]?.split('#')[0]];
  for (const part of parts) {
    for (const pair of (part ?? '').split('&')) {
      const [key, value] = pair.split('=');
      if (key) params[decodeURIComponent(key)] = decodeURIComponent((value ?? '').replace(/\+/g, ' '));
    }
  }
  return params;
}

/**
 * Sign in with Google: Google's own page opens inside the app, then hands the
 * session back through the app's link (eightpaths://auth-callback, or Expo
 * Go's address while developing). Google shares an email with Supabase Auth;
 * it never goes into the profile friends can see.
 */
export async function signInWithGoogle(): Promise<'ok' | 'canceled'> {
  const redirectTo = Linking.createURL('auth-callback');
  const { data, error } = await supabase().auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true, queryParams: { prompt: 'select_account' } },
  });
  if (error || !data.url) fail(OFFLINE);
  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);
  if (result.type !== 'success') return 'canceled';
  const params = urlParams(result.url);
  if (params.error) fail("Google sign-in didn't work. Please try again.");
  let userId: string | undefined;
  if (params.code) {
    const { data: exchanged, error: e } = await supabase().auth.exchangeCodeForSession(params.code);
    if (e) fail("Google sign-in didn't work. Please try again.");
    userId = exchanged.user?.id;
  } else if (params.access_token && params.refresh_token) {
    const { data: session, error: e } = await supabase().auth.setSession({
      access_token: params.access_token,
      refresh_token: params.refresh_token,
    });
    if (e) fail("Google sign-in didn't work. Please try again.");
    userId = session.user?.id;
  }
  if (!userId) fail("Google sign-in didn't work. Please try again.");
  await loadAccount(userId!);
  return 'ok';
}

/** Why a username can't be used, or null if it's free. Checks the server too. */
export async function checkUsername(name: string): Promise<string | null> {
  const problem = usernameProblem(name);
  if (problem) return problem;
  const { data, error } = await supabase().rpc('username_available', { name: name.trim() });
  if (error) return OFFLINE;
  return data ? null : "That name is taken or isn't allowed.";
}

/** Creates the profile, which hands out a founder number if any are left. */
export async function claimUsername(name: string, inviteCode?: string) {
  const { data: auth } = await supabase().auth.getUser();
  if (!auth.user) fail('Please sign in again.');
  const { error } = await supabase().from('profiles').insert({ id: auth.user!.id, username: name.trim() });
  if (error) {
    if (error.code === '23505') fail('That name was just taken. Try another.');
    if (error.message.includes('username_not_allowed')) fail("That name isn't allowed.");
    fail(OFFLINE);
  }
  // Joining with a friend's code: they become friends, and the inviter earns a hero.
  const code = extractFriendCode(inviteCode ?? '') ?? useSocial.getState().pendingFriendCode;
  if (code) {
    useSocial.setState({ pendingFriendCode: null });
    // A mistyped code never blocks sign-up; it just earns no one a hero.
    await supabase().rpc('redeem_invite', { code });
  }
  await loadAccount(auth.user!.id);
}

/**
 * Heroes earned from friends who joined with this player's code since last
 * time. Returns those friends' usernames; the server marks them handed out.
 */
export async function collectInviteRewards(): Promise<string[]> {
  const { data, error } = await supabase().rpc('collect_invite_rewards');
  if (error) return [];
  return ((data ?? []) as { friend_name: string }[]).map((r) => r.friend_name);
}

/** The public snapshot of the player's game that friends see. */
export type Snapshot = {
  leader: string | null;
  party: string[];
  level: number;
  daysShownUp: number | null;
  streak: number | null;
  appVersion: string | null;
};

export async function uploadSnapshot(s: Snapshot) {
  const profile = useSocial.getState().profile;
  if (!profile) return;
  const { error } = await supabase()
    .from('profiles')
    .update({
      leader: s.leader,
      party: s.party,
      level: s.level,
      days_shown_up: s.daysShownUp,
      streak: s.streak,
      app_version: s.appVersion,
      last_seen_at: new Date().toISOString(),
    })
    .eq('id', profile.id);
  if (error) fail(OFFLINE);
  useSocial.setState({ profile: { ...profile, ...s } });
}

/** Which characters the server already knows this player has woken. */
export async function fetchCollection(userId: string): Promise<string[]> {
  const { data, error } = await supabase().from('collections').select('character_id').eq('user_id', userId);
  if (error) fail(OFFLINE);
  return (data ?? []).map((r) => r.character_id as string);
}

/** Adds newly woken characters. The server stamps the time, so "first awakened" can't be backdated. */
export async function uploadCollection(characterIds: string[]) {
  const profile = useSocial.getState().profile;
  if (!profile || characterIds.length === 0) return;
  const { error } = await supabase()
    .from('collections')
    .upsert(
      characterIds.map((id) => ({ user_id: profile.id, character_id: id })),
      { onConflict: 'user_id,character_id', ignoreDuplicates: true },
    );
  if (error) fail(OFFLINE);
}

export async function refreshFriends() {
  const profile = useSocial.getState().profile;
  if (!profile) return;
  const { data: links, error } = await supabase().from('friendships').select('friend_id').eq('user_id', profile.id);
  if (error) fail(OFFLINE);
  const ids = (links ?? []).map((l) => l.friend_id as string);
  if (ids.length === 0) return useSocial.setState({ friends: [] });
  const { data, error: e2 } = await supabase().from('profiles').select(PROFILE_COLUMNS).in('id', ids);
  if (e2) fail(OFFLINE);
  const friends = (data as ProfileRow[]).map(toProfile).sort((a, b) => a.username.localeCompare(b.username));
  useSocial.setState({ friends });
}

/** Adds a friend by their code (both become friends at once). Returns their id. */
export async function addFriend(code: string): Promise<string> {
  const clean = extractFriendCode(code);
  if (!clean) fail("That doesn't look like a friend code. Codes look like 8P-XXXX-XXXX.");
  const { data, error } = await supabase().rpc('add_friend', { code: clean });
  if (error) {
    if (error.message.includes('own_code')) fail("That's your own code.");
    if (error.message.includes('unknown_code')) fail('No one has that code. Check it and try again.');
    fail(OFFLINE);
  }
  await refreshFriends();
  return data as string;
}

export async function removeFriend(id: string) {
  const { error } = await supabase().rpc('remove_friend', { friend: id });
  if (error) fail(OFFLINE);
  await refreshFriends();
}

export async function blockPlayer(id: string) {
  const { error } = await supabase().rpc('block_player', { player: id });
  if (error) fail(OFFLINE);
  await refreshFriends();
}

export async function reportPlayer(id: string, reason: string) {
  const profile = useSocial.getState().profile;
  const { error } = await supabase().from('reports').insert({ reporter_id: profile?.id, reported_id: id, reason });
  if (error) fail(OFFLINE);
}

/** Rarity and first-awakened for every character, loaded once a launch. */
export async function refreshStats() {
  const { data, error } = await supabase().rpc('character_stats');
  if (error) fail(OFFLINE);
  const stats: Record<string, CharacterStat> = {};
  for (const r of (data ?? []) as {
    character_id: string;
    woken_by: number;
    players: number;
    first_username: string | null;
  }[]) {
    stats[r.character_id] = { wokenBy: r.woken_by, players: r.players, firstUsername: r.first_username };
  }
  useSocial.setState({ stats });
}

export async function signOut() {
  await supabase().auth.signOut();
  useSocial.setState({ status: 'signedOut', profile: null, friends: [] });
}

/**
 * Deletes the account and everything the server holds for it. For Apple
 * accounts, the player confirms with Sign in with Apple first, which gives a
 * fresh code the server uses to revoke the app's access to their Apple ID.
 */
export async function deleteAccount(): Promise<'deleted' | 'canceled'> {
  let authorizationCode: string | null = null;
  const { data: auth } = await supabase().auth.getUser();
  // Only Apple accounts have a token to revoke; Google accounts just delete.
  if (auth.user?.app_metadata?.provider === 'apple') {
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [] });
      authorizationCode = credential.authorizationCode;
    } catch (e) {
      if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return 'canceled';
    }
  }
  const { error } = await supabase().functions.invoke('delete-account', { body: { authorizationCode } });
  if (error) fail("Couldn't delete the account. Check your connection and try again.");
  await supabase()
    .auth.signOut({ scope: 'local' })
    .catch(() => {});
  useSocial.setState({ status: 'signedOut', profile: null, friends: [], stats: {} });
  return 'deleted';
}

/** Opens the share sheet with a friend code and its invite link. */
export function shareFriendCode(code: string) {
  return Share.share({
    message: `Walk the Eight Paths with me. Join with my friend code ${code} and we both wake a hero.\neightpaths://friend/${code}`,
  }).catch(() => {});
}

/** One row of the collection leaderboard. */
export type LeaderRow = {
  userId: string;
  username: string;
  founderNumber: number | null;
  leader: string | null;
  level: number;
  heroes: number;
  /** Collection value: rarer heroes are worth more. */
  value: number;
};

/** The top collections among friends (and the player), or among everyone. */
export async function fetchLeaderboard(scope: 'friends' | 'all'): Promise<LeaderRow[]> {
  const { data, error } = await supabase().rpc('leaderboard', { scope });
  if (error) fail(OFFLINE);
  return (
    (data ?? []) as {
      user_id: string;
      username: string;
      founder_number: number | null;
      leader: string | null;
      level: number;
      heroes: number;
      value: number;
    }[]
  ).map((r) => ({
    userId: r.user_id,
    username: r.username,
    founderNumber: r.founder_number,
    leader: r.leader,
    level: r.level,
    heroes: r.heroes,
    value: r.value,
  }));
}

/** The player's own collection value (their row of the friends leaderboard). */
export async function fetchMyValue(): Promise<number | null> {
  const me = useSocial.getState().profile;
  if (!me) return null;
  const rows = await fetchLeaderboard('friends');
  return rows.find((r) => r.userId === me.id)?.value ?? null;
}
