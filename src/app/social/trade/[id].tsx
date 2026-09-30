import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CHARACTER_ART } from '@/art/sprites';
import { Button } from '@/components/button';
import { PixelSprite } from '@/components/pixel-sprite';
import { haptics } from '@/haptics';
import { SocialError, fetchTradeable, offerTrade } from '@/social/api';
import { useSocial } from '@/social/store';
import { MAX_SIDE, countCopies, describeSide, giveable, listCopies, type Copies } from '@/social/trade';
import { useGameStore } from '@/store';
import { useClassInfo } from '@/store/hooks';
import { COMPANIONS, RARITY_TIERS, ROSTER, type CharacterId } from '@/story/companions';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import { worldHero } from '@/world/hero';
import { useWorldStore } from '@/world/store';

const COLUMNS = 4;

const message = (e: unknown) => (e instanceof SocialError ? e.message : 'Something went wrong. Please try again.');

/** How many copies of each hero are picked on one side, and how to change it. */
type Side = { picked: Copies; setPicked: (next: Copies) => void };

/**
 * Builds a trade offer to a friend: pick up to 5 copies of your heroes and up
 * to 5 of theirs. With `answering`, it's a counter to the offer they sent,
 * starting from that offer turned around.
 */
export default function TradeScreen() {
  const { id, answering } = useLocalSearchParams<{ id: string; answering?: string }>();
  const friend = useSocial((s) => s.friends.find((f) => f.id === id));
  const me = useSocial((s) => s.profile);
  const countering = useSocial((s) => s.offers.find((o) => o.id === answering && o.fromId === id));
  const color = useClassInfo()?.color ?? colors.accent;

  const owned = useGameStore((s) => s.owned);
  const drops = useGameStore((s) => s.drops);
  const party = useGameStore((s) => s.party);
  const classDimension = useGameStore((s) => s.player?.classDimension ?? 'physical');
  const picked = useWorldStore((s) => s.hero);
  const walking = worldHero(picked, party, classDimension) as CharacterId;

  const [mine, setMine] = useState<Copies | null>(null);
  const [theirs, setTheirs] = useState<Copies | null>(null);
  const [failed, setFailed] = useState(false);
  // A counter starts from their offer turned around: you give what they asked for.
  const [give, setGive] = useState<Copies>(() => (countering ? countCopies(countering.get) : {}));
  const [get, setGet] = useState<Copies>(() => (countering ? countCopies(countering.give) : {}));
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!id || !me) return;
    Promise.all([fetchTradeable(me.id), fetchTradeable(id)])
      .then(([m, t]) => {
        setMine(m);
        setTheirs(t);
      })
      .catch(() => setFailed(true));
  }, [id, me]);

  if (!friend || !me) {
    return (
      <View style={styles.screen}>
        <Text style={[styles.body, { padding: spacing.xl }]}>This player is no longer on your friends list.</Text>
      </View>
    );
  }

  const myCopies = mine ? giveable(mine, { owned, drops }, walking) : null;
  const giveList = listCopies(give);
  const getList = listCopies(get);
  const ready = giveList.length > 0 && getList.length > 0;

  const send = () =>
    Alert.alert(
      `Offer ${friend.username} a trade?`,
      `You give: ${describeSide(giveList)}\nYou get: ${describeSide(getList)}\n\nThey have 3 days to answer.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send offer',
          onPress: () => {
            setSending(true);
            offerTrade(friend.id, giveList, getList, countering?.id)
              .then(() => {
                haptics.success();
                router.back();
              })
              .catch((e) => Alert.alert('Offer not sent', message(e)))
              .finally(() => setSending(false));
          },
        },
      ],
    );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SafeAreaView edges={['top']} />
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
        <Text style={[styles.back, { color }]}>‹ Back</Text>
      </Pressable>
      <Text style={styles.title}>{countering ? 'Counter offer' : 'Trade'}</Text>
      <Text style={styles.body}>
        with {friend.username}. Pick up to {MAX_SIDE} heroes on each side; tap again for another copy.
      </Text>

      <View style={[styles.summary, { borderColor: color }]}>
        <Text style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>You give </Text>
          {giveList.length ? describeSide(giveList) : '—'}
        </Text>
        <Text style={styles.summaryLine}>
          <Text style={styles.summaryLabel}>You get </Text>
          {getList.length ? describeSide(getList) : '—'}
        </Text>
      </View>

      {failed ? (
        <Text style={styles.body}>Couldn&apos;t load heroes to trade. Check your connection.</Text>
      ) : myCopies === null || theirs === null ? (
        <ActivityIndicator color={color} />
      ) : (
        <>
          <Picker
            title={`YOU GIVE · ${giveList.length}/${MAX_SIDE}`}
            available={myCopies}
            side={{ picked: give, setPicked: setGive }}
            color={color}
            empty="Nothing to trade yet. Heroes beyond the starting eight can be traded once they've hatched."
          />
          <Picker
            title={`YOU GET · ${getList.length}/${MAX_SIDE}`}
            available={theirs}
            side={{ picked: get, setPicked: setGet }}
            color={color}
            empty={`${friend.username} has nothing to trade yet.`}
          />
        </>
      )}

      <Text style={styles.hint}>
        The starting eight can&apos;t be traded. Heroes you get in a trade can be traded again after 7 days. Your hero
        walking the Other World keeps their last copy.
      </Text>
      <Button
        title={countering ? 'Send counter offer' : 'Send offer'}
        onPress={send}
        color={color}
        disabled={!ready || sending}
      />
    </ScrollView>
  );
}

/** A grid of heroes one side can trade; each tap adds a copy, until it wraps back to none. */
function Picker({
  title,
  available,
  side,
  color,
  empty,
}: {
  title: string;
  available: Copies;
  side: Side;
  color: string;
  empty: string;
}) {
  const [width, setWidth] = useState(0);
  const heroes = ROSTER.filter((c) => (available[c.id] ?? 0) > 0);
  const total = Object.values(side.picked).reduce((sum: number, n) => sum + (n ?? 0), 0);
  const cell = width ? (width - spacing.sm * (COLUMNS - 1)) / COLUMNS : 0;

  const tap = (id: CharacterId) => {
    const n = side.picked[id] ?? 0;
    const more = n < (available[id] ?? 0) && total < MAX_SIDE;
    const next = { ...side.picked };
    if (more) next[id] = n + 1;
    else delete next[id];
    haptics.select();
    side.setPicked(next);
  };

  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={styles.section}>{title}</Text>
      {heroes.length === 0 ? (
        <Text style={styles.body}>{empty}</Text>
      ) : (
        <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {cell > 0 &&
            heroes.map((c) => {
              const art = CHARACTER_ART[c.id];
              const n = side.picked[c.id] ?? 0;
              const has = available[c.id] ?? 0;
              return (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${c.name}, ${n} of ${has} picked`}
                  onPress={() => tap(c.id)}
                  style={[
                    styles.cell,
                    { width: cell, borderColor: n > 0 ? color : colors.border },
                    n > 0 && { backgroundColor: colors.cardRaised },
                  ]}>
                  <View style={{ height: cell * 0.85, justifyContent: 'flex-end' }}>
                    {art && <PixelSprite sheet={art.idle} scale={(cell * 0.7) / art.idle.height} animate={false} />}
                  </View>
                  <Text style={styles.cellName} numberOfLines={1}>
                    {COMPANIONS[c.id].name}
                  </Text>
                  <Text style={[styles.cellMeta, { color: RARITY_TIERS[c.rarity].color }]}>
                    {'★'.repeat(c.rarity)}
                  </Text>
                  <Text style={[styles.cellMeta, n > 0 && { color }]}>
                    {n > 0 ? `${n} of ${has}` : `×${has}`}
                  </Text>
                </Pressable>
              );
            })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  back: { fontFamily: fonts.bold, fontSize: 18 },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 28 },
  body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, marginTop: spacing.md },
  summary: { ...windowStyle, borderWidth: 3, padding: spacing.md, gap: spacing.xs },
  summaryLine: { color: colors.text, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  summaryLabel: { color: colors.textMuted, fontFamily: fonts.bold },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1.5, marginTop: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { ...windowStyle, borderWidth: 2, alignItems: 'center', paddingBottom: spacing.xs },
  cellName: { color: colors.text, fontFamily: fonts.bold, fontSize: 13 },
  cellMeta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 12 },
});
