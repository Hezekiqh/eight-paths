import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CHARACTER_ART } from '@/art/sprites';
import { Button } from '@/components/button';
import { PixelSprite } from '@/components/pixel-sprite';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { SettingsRow } from '@/components/settings-row';
import { fetchLeaderboard, shareFriendCode, type LeaderRow } from '@/social/api';
import { useSocial } from '@/social/store';
import { founderLabel } from '@/social/username';
import { isCharacterId } from '@/story/companions';
import { useClassInfo } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import { useTourTarget } from '@/tutorial/tour';

type Scope = 'friends' | 'all';
const SCOPES = [
  { value: 'friends', label: 'Friends' },
  { value: 'all', label: 'Everyone' },
] as const;

function Leader({ id, scale }: { id: string | null; scale: number }) {
  if (!id || !isCharacterId(id) || !CHARACTER_ART[id]) return null;
  return <PixelSprite sheet={CHARACTER_ART[id].idle} scale={scale} animate={false} />;
}

/**
 * The Second 100 at a glance: your card and friend code, and the collection
 * leaderboard. A collection is worth more the rarer its heroes are among all
 * players. Signed out, it invites the player to join.
 */
export default function SocialTab() {
  const status = useSocial((s) => s.status);
  const profile = useSocial((s) => s.profile);
  const friends = useSocial((s) => s.friends);
  const color = useClassInfo()?.color ?? colors.accent;
  const [scope, setScope] = useState<Scope>('friends');
  // The Keeper's tour points at the way in: the join card, or your friend code once you're in.
  const tourRef = useTourTarget('social');
  // Results are tagged with who and which board they're for, so a stale list never shows.
  const [board, setBoard] = useState<{ key: string; rows: LeaderRow[] | null; failed: boolean } | null>(null);
  const key = `${profile?.id ?? ''}:${scope}`;

  // Refresh whenever the tab comes into view, since values shift as players wake heroes.
  useFocusEffect(
    useCallback(() => {
      if (status !== 'ready') return;
      let live = true;
      fetchLeaderboard(scope)
        .then((r) => live && setBoard({ key, rows: r, failed: false }))
        .catch(() => live && setBoard({ key, rows: null, failed: true }));
      return () => {
        live = false;
      };
    }, [status, scope, key]),
  );

  if (status === 'off') {
    return (
      <Screen title="Social">
        <Text style={styles.body}>Friends aren&apos;t available in this version.</Text>
      </Screen>
    );
  }

  if (status === 'loading') {
    return (
      <Screen title="Social">
        <ActivityIndicator color={color} />
      </Screen>
    );
  }

  if (status !== 'ready' || !profile) {
    return (
      <Screen title="Social">
        <View ref={tourRef} collapsable={false} style={[styles.card, { borderColor: color }]}>
          <Text style={styles.heading}>Join the Second 100</Text>
          <Text style={styles.body}>
            The first 100 players get a founder number, forever. Add friends, compare collections and see who holds the
            rarest heroes. Your habits never leave your phone.
          </Text>
          <Button title="Join" onPress={() => router.push('/social')} color={color} />
        </View>
      </Screen>
    );
  }

  const friendIds = new Set(friends.map((f) => f.id));
  const current = board?.key === key ? board : null;
  const rows = current?.rows ?? null;
  const failed = current?.failed ?? false;

  return (
    <Screen title="Social">
      <View ref={tourRef} collapsable={false}>
        <Button
          title={`Share your code · ${profile.friendCode}`}
          onPress={() => shareFriendCode(profile.friendCode)}
          color={color}
        />
      </View>

      <View style={styles.boardHead}>
        <Text style={styles.section}>TOP COLLECTIONS</Text>
      </View>
      <Segmented options={SCOPES} value={scope} onChange={setScope} color={color} />
      <Text style={styles.hint}>
        Rarer heroes are worth more: the fewer players who have woken them, the higher the value.
      </Text>

      {rows === null && !failed && <ActivityIndicator color={color} style={{ marginTop: spacing.lg }} />}
      {failed && <Text style={styles.body}>Couldn&apos;t load the leaderboard. Check your connection.</Text>}
      {rows && (
        <View style={styles.list}>
          {rows.map((r, i) => {
            const isMe = r.userId === profile.id;
            const canOpen = friendIds.has(r.userId);
            return (
              <Pressable
                key={r.userId}
                disabled={!canOpen}
                accessibilityRole={canOpen ? 'button' : undefined}
                accessibilityLabel={`${i + 1}. ${r.username}, ${r.value} points, ${r.heroes} heroes`}
                onPress={() => router.push({ pathname: '/social/friend/[id]', params: { id: r.userId } })}
                style={[
                  styles.row,
                  isMe && { backgroundColor: colors.cardRaised },
                  i === rows.length - 1 && styles.last,
                ]}>
                <Text style={[styles.rank, i < 3 && { color }]}>{i + 1}</Text>
                <View style={styles.sprite}>
                  <Leader id={r.leader} scale={1} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {r.username}
                    {isMe ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.meta}>
                    Lv {r.level} · {r.heroes} heroes
                    {r.founderNumber !== null ? ` · ${founderLabel(r.founderNumber)}` : ''}
                  </Text>
                </View>
                <Text style={[styles.rowValue, { color }]}>{r.value.toLocaleString()}</Text>
              </Pressable>
            );
          })}
          {rows.length <= 1 && scope === 'friends' && (
            <Text style={[styles.body, { padding: spacing.md }]}>
              Share your code to see friends here. Each friend who joins with it wakes a hero for you.
            </Text>
          )}
        </View>
      )}

      <View style={[styles.list, { marginTop: spacing.lg }]}>
        <SettingsRow
          icon="users"
          iconColor={color}
          title="Friends and account"
          subtitle={`${friends.length} friend${friends.length === 1 ? '' : 's'} · add by code, sign out`}
          onPress={() => router.push('/social')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { ...windowStyle, borderWidth: 3, padding: spacing.lg, gap: spacing.md },
  cardTop: { flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  heading: { color: colors.text, fontFamily: fonts.bold, fontSize: 26 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 28 },
  meta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  value: { fontFamily: fonts.bold, fontSize: 26, marginTop: 2 },
  valueLabel: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  boardHead: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.lg },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1.5 },
  list: { ...windowStyle },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  last: { borderBottomWidth: 0 },
  rank: { width: 28, color: colors.textMuted, fontFamily: fonts.bold, fontSize: 22, textAlign: 'center' },
  sprite: { width: 34, height: 48, alignItems: 'center', justifyContent: 'flex-end' },
  rowName: { color: colors.text, fontFamily: fonts.bold, fontSize: 19 },
  rowValue: { fontFamily: fonts.bold, fontSize: 22, fontVariant: ['tabular-nums'] },
});
