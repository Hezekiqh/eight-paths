import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { CHARACTER_ART } from '@/art/sprites';
import { Button } from '@/components/button';
import { ModalHeader, close } from '@/components/modal-header';
import { PixelSprite } from '@/components/pixel-sprite';
import { SettingsRow } from '@/components/settings-row';
import { haptics } from '@/haptics';
import {
  SocialError,
  addFriend,
  checkUsername,
  claimUsername,
  deleteAccount,
  refreshFriends,
  signInWithApple,
  shareFriendCode,
  signInWithGoogle,
  signOut,
  startSocial,
} from '@/social/api';
import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { FOUNDER_COUNT } from '@/social/config';
import { useSocial, type Profile } from '@/social/store';
import { USERNAME_RULES, extractFriendCode, founderLabel } from '@/social/username';
import { isCharacterId } from '@/story/companions';
import { useClassInfo } from '@/store/hooks';
import { colors, fonts, spacing, theme, windowStyle } from '@/theme';

const message = (e: unknown) => (e instanceof SocialError ? e.message : 'Something went wrong. Please try again.');

/** A party leader's sprite, or nothing for an id this version doesn't know. */
function Leader({ id, scale }: { id: string | null; scale: number }) {
  if (!id || !isCharacterId(id) || !CHARACTER_ART[id]) return null;
  return <PixelSprite sheet={CHARACTER_ART[id].idle} scale={scale} animate={false} />;
}

/** "Second 100 · #037", for founders. */
function FounderBadge({ number, color }: { number: number | null; color: string }) {
  if (number === null) return null;
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={[styles.badgeText, { color }]}>SECOND 100 · {founderLabel(number)}</Text>
    </View>
  );
}

/** Before an account: what joining means, and Sign in with Apple. */
function Join() {
  const [busy, setBusy] = useState(false);
  const signIn = (provider: () => Promise<'ok' | 'canceled'>) => async () => {
    setBusy(true);
    try {
      await provider();
    } catch (e) {
      Alert.alert('Sign in failed', message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.block}>
      <Text style={styles.heading}>Join the Second 100</Text>
      <Text style={styles.body}>
        The first {FOUNDER_COUNT} players to join get a founder number, forever. Add friends and see each other&apos;s
        heroes, and see how rare each character is.
      </Text>
      <Text style={styles.body}>
        Your habits never leave your phone. Only your username, level, party and collection are shared.
      </Text>
      {busy ? (
        <ActivityIndicator color={colors.accent} />
      ) : (
        <>
          {/* Apple's black "Sign in with Apple" style, drawn here so it also works in Expo Go. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in with Apple"
            onPress={signIn(signInWithApple)}
            style={({ pressed }) => [styles.apple, theme.dark && styles.appleLight, pressed && { opacity: 0.8 }]}>
            <Text style={[styles.appleText, theme.dark && styles.appleTextLight]}>{'\uF8FF'} Sign in with Apple</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with Google"
            onPress={signIn(signInWithGoogle)}
            style={({ pressed }) => [styles.google, pressed && { opacity: 0.8 }]}>
            <Text style={styles.googleG}>G</Text>
            <Text style={styles.googleText}>Continue with Google</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

/** Right after sign-in: choose a username. */
function ChooseUsername({ color }: { color: string }) {
  const [name, setName] = useState('');
  // A friend's code (from their link, or typed): they get a hero for bringing you.
  const [invite, setInvite] = useState(useSocial.getState().pendingFriendCode ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const claim = async () => {
    setBusy(true);
    setError(null);
    try {
      const problem = await checkUsername(name);
      if (problem) return setError(problem);
      await claimUsername(name, invite);
      haptics.celebrate();
      // Once, right after sign-up: the founder offer (or the regular one).
      const { premium, offerSeen } = usePremium.getState();
      if (premiumEnabled && !premium && !offerSeen) router.push('/paywall');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <View style={styles.block}>
      <Text style={styles.heading}>Choose your name</Text>
      <Text style={styles.body}>Friends will see it, and so will anyone you&apos;re first to wake a hero before.</Text>
      <TextInput
        value={name}
        onChangeText={(t) => {
          setName(t);
          setError(null);
        }}
        placeholder="username"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="none"
        autoCorrect={false}
        maxLength={16}
        returnKeyType="done"
        onSubmitEditing={claim}
        style={styles.input}
      />
      <Text style={[styles.hint, error && styles.error]}>{error ?? USERNAME_RULES}</Text>
      <Text style={styles.label}>FRIEND&apos;S CODE (OPTIONAL)</Text>
      <TextInput
        value={invite}
        onChangeText={(t) => setInvite(t.length > 14 ? (extractFriendCode(t) ?? t) : t)}
        placeholder="8P-XXXX-XXXX"
        placeholderTextColor={colors.textFaint}
        autoCapitalize="characters"
        autoCorrect={false}
        style={styles.input}
      />
      <Text style={styles.hint}>Joining with a friend&apos;s code wakes a hero for them.</Text>
      <Button title={busy ? 'Checking…' : 'Claim name'} onPress={claim} color={color} disabled={busy || !name.trim()} />
    </View>
  );
}

function FriendRow({ friend }: { friend: Profile }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/social/friend/[id]', params: { id: friend.id } })}
      style={({ pressed }) => [styles.friend, pressed && { opacity: 0.7 }]}>
      <View style={styles.friendSprite}>
        <Leader id={friend.leader} scale={1} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.friendName}>{friend.username}</Text>
        <Text style={styles.friendMeta}>
          Lv {friend.level}
          {friend.streak !== null ? ` · ${friend.streak}-day streak` : ''}
          {friend.founderNumber !== null ? ` · ${founderLabel(friend.founderNumber)}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

/** Signed in: your card, your code, adding friends, the list and account settings. */
function Account({ profile, color }: { profile: Profile; color: string }) {
  const friends = useSocial((s) => s.friends);
  const share = useSocial((s) => s.shareConsistency);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    refreshFriends().catch(() => {});
  }, []);

  const add = async () => {
    setBusy(true);
    setError(null);
    try {
      await addFriend(code);
      setCode('');
      haptics.success();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };

  const shareCode = () => shareFriendCode(profile.friendCode);

  const confirmDelete = () =>
    Alert.alert(
      'Delete your account?',
      "Your username, founder number, friends and shared collection are deleted from the server. Your game on this phone stays. This can't be undone, and your founder number won't come back.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if ((await deleteAccount()) === 'deleted') Alert.alert('Account deleted');
            } catch (e) {
              Alert.alert('Not deleted', message(e));
            }
          },
        },
      ],
    );

  return (
    <>
      <View style={[styles.card, { borderColor: color }]}>
        <View style={styles.cardTop}>
          <Leader id={profile.leader} scale={2} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.name}>{profile.username}</Text>
            <Text style={styles.friendMeta}>Lv {profile.level}</Text>
            <FounderBadge number={profile.founderNumber} color={color} />
          </View>
        </View>
        <Text style={styles.label}>YOUR FRIEND CODE</Text>
        <Text style={[styles.code, { color }]} selectable>
          {profile.friendCode}
        </Text>
        <Button title="Share your code" onPress={shareCode} color={color} />
      </View>

      <Text style={styles.section}>ADD A FRIEND</Text>
      <View style={styles.addRow}>
        <TextInput
          value={code}
          onChangeText={(t) => {
            // A pasted share message or link becomes just the code.
            setCode(t.length > 14 ? (extractFriendCode(t) ?? t) : t);
            setError(null);
          }}
          placeholder="8P-XXXX-XXXX"
          placeholderTextColor={colors.textFaint}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={add}
          style={[styles.input, { flex: 1 }]}
        />
        <Button title="Add" onPress={add} color={color} disabled={busy || !extractFriendCode(code)} />
      </View>
      {error && <Text style={[styles.hint, styles.error]}>{error}</Text>}

      <Text style={styles.section}>FRIENDS · {friends.length}</Text>
      {friends.length === 0 ? (
        <Text style={styles.body}>No friends yet. Share your code, or add theirs above.</Text>
      ) : (
        <View style={styles.list}>
          {friends.map((f) => (
            <FriendRow key={f.id} friend={f} />
          ))}
        </View>
      )}

      <Text style={styles.section}>ACCOUNT</Text>
      <View style={styles.list}>
        <SettingsRow
          icon="users"
          iconColor={color}
          title="Share days shown up and streak"
          subtitle="Numbers only. Friends never see your habits."
          accessory={
            <Switch
              value={share}
              onValueChange={(on) => useSocial.setState({ shareConsistency: on })}
              trackColor={{ true: color }}
            />
          }
        />
        <View style={styles.divider} />
        <SettingsRow icon="logout" iconColor={color} title="Sign out" onPress={() => signOut().catch(() => {})} />
        <View style={styles.divider} />
        <SettingsRow
          icon="trash"
          iconColor={colors.danger}
          title="Delete account"
          subtitle="Removes everything the server holds about you"
          onPress={confirmDelete}
        />
      </View>
    </>
  );
}

/** Friends and the Second 100. Hidden entirely unless the app is built with Supabase. */
export default function SocialScreen() {
  const status = useSocial((s) => s.status);
  const profile = useSocial((s) => s.profile);
  const pending = useSocial((s) => s.pendingFriendCode);
  const color = useClassInfo()?.color ?? colors.accent;

  // Opened straight from a link, the tabs (which normally start social) may not be mounted yet.
  useEffect(() => {
    startSocial();
  }, []);

  // A friend's link opened while already signed in: add them now.
  useEffect(() => {
    if (status !== 'ready' || !pending) return;
    useSocial.setState({ pendingFriendCode: null });
    addFriend(pending)
      .then(() => haptics.success())
      .catch((e) => Alert.alert("Couldn't add friend", message(e)));
  }, [status, pending]);

  return (
    <KeyboardAvoidingView behavior="padding" style={styles.screen}>
      <SafeAreaView edges={['top']} />
      <ModalHeader title="Friends" actionLabel="Done" onAction={close} color={color} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {status === 'loading' && <ActivityIndicator color={color} />}
        {status === 'signedOut' && <Join />}
        {status === 'needsUsername' && <ChooseUsername color={color} />}
        {status === 'ready' && profile && <Account profile={profile} color={color} />}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  block: { gap: spacing.md },
  heading: { color: colors.text, fontFamily: fonts.bold, fontSize: 28 },
  body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  apple: { height: 50, borderRadius: 6, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  appleLight: { backgroundColor: '#FFFFFF' },
  appleText: { color: '#FFFFFF', fontSize: 19, fontWeight: '600' },
  appleTextLight: { color: '#000000' },
  google: {
    height: 50,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#747775',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleG: { color: '#4285F4', fontSize: 20, fontWeight: '700' },
  googleText: { color: '#1F1F1F', fontSize: 19, fontWeight: '500' },
  input: { ...windowStyle, color: colors.text, fontFamily: fonts.regular, fontSize: 18, padding: spacing.md },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  error: { color: colors.danger },
  card: { ...windowStyle, borderWidth: 3, padding: spacing.lg, gap: spacing.sm },
  cardTop: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center', marginBottom: spacing.sm },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 28 },
  badge: { alignSelf: 'flex-start', borderWidth: 2, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bold, fontSize: 15, letterSpacing: 1 },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  code: { fontFamily: fonts.bold, fontSize: 32, letterSpacing: 2 },
  section: {
    color: colors.textMuted,
    fontFamily: fonts.bold,
    fontSize: 16,
    letterSpacing: 1.5,
    marginTop: spacing.lg,
  },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  list: { ...windowStyle },
  friend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  friendSprite: { width: 36, height: 48, alignItems: 'center', justifyContent: 'flex-end' },
  friendName: { color: colors.text, fontFamily: fonts.bold, fontSize: 20 },
  friendMeta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.xxl },
});
