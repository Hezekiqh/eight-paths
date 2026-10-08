import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CHARACTER_ART } from '@/art/sprites';
import { Button } from '@/components/button';
import { NicheRankings } from '@/components/niche-rankings';
import { PixelSprite } from '@/components/pixel-sprite';
import { PlayerSearch } from '@/components/player-search';
import { Screen } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { TradeInbox } from '@/components/trade-inbox';
import {
  fetchBoardPlayers,
  fetchLeaderboard,
  refreshFriends,
  refreshOffers,
  shareFriendCode,
  type LeaderRow,
} from '@/social/api';
import { useTradeNotices } from '@/social/notices';
import { pullTrades } from '@/social/sync';
import { RIVALS, collectionValue, type Holdings, type RankedPlayer } from '@/social/rankings';
import { useSocial } from '@/social/store';
import { founderLabel } from '@/social/username';
import { isCharacterId } from '@/story/companions';
import { useGameStore } from '@/store';
import { useClassInfo } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import { useTourTarget } from '@/tutorial/tour';

type Scope = 'friends' | 'all';
const SCOPES = [
  { value: 'friends', label: 'Friends' },
  { value: 'all', label: 'Everyone' },
] as const;

/** Gold, silver and bronze for the top three. */
const MEDALS = ['#E8A317', '#A8A9AD', '#C7783A'];

function Leader({ id, scale }: { id: string | null; scale: number }) {
  if (!id || !isCharacterId(id) || !CHARACTER_ART[id]) return null;
  return <PixelSprite sheet={CHARACTER_ART[id].idle} scale={scale} animate={false} />;
}

/**
 * The Second 100 at a glance: your card and friend code, open trade offers,
 * and the collection leaderboard. A collection is worth more the rarer its heroes are among all
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
  const incoming = useSocial((s) =>
    s.offers
      .filter((o) => o.toId === s.profile?.id)
      .map((o) => o.id)
      .join(','),
  );
  const markOffersSeen = useTradeNotices((s) => s.markOffersSeen);
  const stats = useSocial((s) => s.stats);
  const owned = useGameStore((s) => s.owned);
  const [boardPlayers, setBoardPlayers] = useState<RankedPlayer[] | null>(null);

  // Offers on screen count as seen: the tab's dot goes out.
  useFocusEffect(
    useCallback(() => {
      if (incoming) markOffersSeen(incoming.split(','));
    }, [incoming, markOffersSeen]),
  );

  // Refresh whenever the tab comes into view, since values shift as players wake heroes.
  useFocusEffect(
    useCallback(() => {
      if (status !== 'ready') return;
      let live = true;
      // Friends, offers and finished trades may have come in since the app last looked.
      Promise.all([refreshFriends(), refreshOffers(), pullTrades()]).catch(() => {});
      fetchLeaderboard(scope)
        .then((r) => live && setBoard({ key, rows: r, failed: false }))
        .catch(() => live && setBoard({ key, rows: null, failed: true }));
      fetchBoardPlayers()
        .then((p) => live && setBoardPlayers(p as RankedPlayer[]))
        .catch(() => live && setBoardPlayers([]));
      return () => {
        live = false;
      };
    }, [status, scope, key]),
  );

  // The niche rankings: everyone the server knows, you as this phone has you, and the rivals.
  const ranked = useMemo(() => {
    if (!boardPlayers || !profile) return null;
    const me: RankedPlayer = {
      userId: profile.id,
      username: profile.username,
      founderNumber: profile.founderNumber,
      leader: profile.leader,
      level: profile.level,
      holdings: (owned ?? boardPlayers.find((p) => p.userId === profile.id)?.holdings ?? {}) as Holdings,
    };
    return [me, ...boardPlayers.filter((p) => p.userId !== profile.id), ...RIVALS];
  }, [boardPlayers, profile, owned]);

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
  // Everyone's board includes the rivals, valued the way the server values a collection.
  const rows =
    current?.rows && scope === 'all'
      ? [
          ...current.rows,
          ...RIVALS.map(
            (r): LeaderRow => ({
              userId: r.userId,
              username: r.username,
              founderNumber: null,
              leader: r.leader,
              level: r.level,
              heroes: Object.keys(r.holdings).length,
              value: collectionValue(r.holdings, stats),
            }),
          ),
        ]
          .sort((a, b) => b.value - a.value || b.heroes - a.heroes)
          .slice(0, 100)
      : (current?.rows ?? null);
  const failed = current?.failed ?? false;

  return (
    <Screen title="Social">
      <View ref={tourRef} collapsable={false}>
        <PlayerSearch color={color} />
      </View>

      <TradeInbox color={color} />

      <View style={[styles.topCard, { borderColor: color, shadowColor: color }]}>
        <Text style={styles.topTitle}>Top Collections</Text>
        <Text style={styles.hint}>
          Rarer heroes are worth more: the fewer players who have woken them, the higher the value.
        </Text>
        <Segmented options={SCOPES} value={scope} onChange={setScope} color={color} />

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
                <View style={[styles.rankBox, i < 3 && { backgroundColor: MEDALS[i] }]}>
                  <Text style={[styles.rank, i < 3 && styles.medalText]}>{i + 1}</Text>
                </View>
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
              Find friends by name above, or share your code below: each friend who joins with it wakes a guaranteed 5★
              hero for you.
            </Text>
          )}
        </View>
      )}
      </View>

      <NicheRankings players={ranked} meId={profile.id} color={color} />

      {/* Inviting a friend: at the bottom, with what it's worth. */}
      <View style={[styles.card, { marginTop: spacing.lg }]}>
        <Text style={styles.heading}>Share with a friend</Text>
        <Text style={styles.body}>Each friend who joins with your code wakes a guaranteed 5★ hero for you.</Text>
        <Button
          title={`Share your code · ${profile.friendCode}`}
          onPress={() => shareFriendCode(profile.friendCode)}
          color={color}
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
  topCard: {
    ...windowStyle,
    borderWidth: 3,
    shadowOpacity: 0.9,
    shadowRadius: 0,
    shadowOffset: { width: 4, height: 4 },
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  topTitle: { color: colors.text, fontFamily: fonts.bold, fontSize: 28 },
  rankBox: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  medalText: { color: colors.background, fontSize: 18 },
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
  rank: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 22, textAlign: 'center' },
  sprite: { width: 34, height: 48, alignItems: 'center', justifyContent: 'flex-end' },
  rowName: { color: colors.text, fontFamily: fonts.bold, fontSize: 19 },
  rowValue: { fontFamily: fonts.bold, fontSize: 24, fontVariant: ['tabular-nums'] },
});
