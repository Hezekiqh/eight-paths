import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { CHARACTER_ART } from '@/art/sprites';
import { Button } from '@/components/button';
import { PixelSprite } from '@/components/pixel-sprite';
import { SocialError, acceptTrade, declineTrade, fetchTradeHistory, type PastTrade } from '@/social/api';
import { useSocial } from '@/social/store';
import { pullTrades } from '@/social/sync';
import { OFFER_DAYS, countCopies, covers, describeSide, giveable, type TradeOffer } from '@/social/trade';
import { useGameStore } from '@/store';
import { isCharacterId, type CharacterId } from '@/story/companions';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import { worldHero } from '@/world/hero';
import { useWorldStore } from '@/world/store';

const message = (e: unknown) => (e instanceof SocialError ? e.message : 'Something went wrong. Please try again.');

const DAY_MS = 24 * 60 * 60 * 1000;

/** "closes in 2 days", from when the offer was sent. */
function closesIn(createdAt: string): string {
  const days = Math.max(1, Math.ceil((Date.parse(createdAt) + OFFER_DAYS * DAY_MS - Date.now()) / DAY_MS));
  return `closes in ${days} day${days === 1 ? '' : 's'}`;
}

/** A row of the heroes on one side, one sprite per hero with its copy count. */
function Heroes({ list }: { list: string[] }) {
  return (
    <View style={styles.heroes}>
      {Object.entries(countCopies(list)).map(([id, n]) => {
        const art = isCharacterId(id) ? CHARACTER_ART[id] : undefined;
        return (
          <View key={id} style={styles.hero}>
            {art && <PixelSprite sheet={art.idle} scale={1} animate={false} />}
            {n! > 1 && <Text style={styles.count}>×{n}</Text>}
          </View>
        );
      })}
    </View>
  );
}

/**
 * Open trade offers on the Social tab: ones friends sent (accept, counter or
 * decline) and ones this player sent (waiting, or take back).
 */
export function TradeInbox({ color }: { color: string }) {
  const offers = useSocial((s) => s.offers);
  const me = useSocial((s) => s.profile?.id);
  if (!me || offers.length === 0) return null;
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.section}>TRADES</Text>
      {offers.map((o) => (
        <OfferCard key={o.id} offer={o} incoming={o.toId === me} color={color} />
      ))}
    </View>
  );
}

function OfferCard({ offer, incoming, color }: { offer: TradeOffer; incoming: boolean; color: string }) {
  const other = useSocial((s) => s.friends.find((f) => f.id === (incoming ? offer.fromId : offer.toId)));
  const [busy, setBusy] = useState(false);
  const name = other?.username ?? 'A former friend';
  // From this player's side: what they'd give and get.
  const give = incoming ? offer.get : offer.give;
  const get = incoming ? offer.give : offer.get;

  const run = (work: () => Promise<void>, done?: () => void) => {
    setBusy(true);
    work()
      .then(done)
      .catch((e) => Alert.alert('That didn’t work', message(e)))
      .finally(() => setBusy(false));
  };

  const accept = () => {
    // Only the phone knows which copies are still waiting to hatch or walking the Other World.
    const { owned, drops, party, player } = useGameStore.getState();
    const walking = worldHero(useWorldStore.getState().hero, party, player?.classDimension ?? 'physical', owned);
    if (!covers(giveable(countCopies(give), { owned, drops }, walking as CharacterId), give)) {
      Alert.alert(
        'Not yet',
        'Some of the heroes they want are still waiting to hatch, or walking the Other World. Hatch them, or pick someone else to walk, then try again.',
      );
      return;
    }
    Alert.alert(`Trade with ${name}?`, `You give: ${describeSide(give)}\nYou get: ${describeSide(get)}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Trade',
        onPress: () =>
          // The trade's moment plays once the moves come in (see pullTrades).
          run(async () => {
            await acceptTrade(offer.id);
            await pullTrades().catch(() => {});
          }),
      },
    ]);
  };

  const decline = () =>
    Alert.alert(incoming ? `Decline ${name}'s offer?` : 'Take back your offer?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: incoming ? 'Decline' : 'Take back',
        style: 'destructive',
        onPress: () => run(() => declineTrade(offer.id)),
      },
    ]);

  const counter = () =>
    router.push({ pathname: '/social/trade/[id]', params: { id: offer.fromId, answering: offer.id } });

  return (
    <View style={[styles.card, incoming && { borderColor: color }]}>
      <Text style={styles.title}>
        {incoming ? `${name} offers a trade` : `Offered to ${name}`}
        <Text style={styles.meta}> · {closesIn(offer.createdAt)}</Text>
      </Text>
      <View style={styles.sides}>
        <View style={styles.side}>
          <Text style={styles.label}>YOU GET</Text>
          <Heroes list={get} />
          <Text style={styles.names}>{describeSide(get)}</Text>
        </View>
        <View style={styles.side}>
          <Text style={styles.label}>YOU GIVE</Text>
          <Heroes list={give} />
          <Text style={styles.names}>{describeSide(give)}</Text>
        </View>
      </View>
      {incoming ? (
        <View style={styles.actions}>
          <View style={{ flex: 1 }}>
            <Button title="Accept" onPress={accept} color={color} disabled={busy || !other} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Counter" onPress={counter} color={color} variant="ghost" disabled={busy || !other} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Decline" onPress={decline} color={colors.danger} variant="ghost" disabled={busy} />
          </View>
        </View>
      ) : (
        <Button title="Take back" onPress={decline} color={colors.danger} variant="ghost" disabled={busy} />
      )}
    </View>
  );
}

/** The player's recent finished trades, newest first. Hidden until there's one. */
export function TradeHistory() {
  const [trades, setTrades] = useState<PastTrade[] | null>(null);
  useEffect(() => {
    fetchTradeHistory()
      .then(setTrades)
      .catch(() => setTrades(null));
  }, []);
  if (!trades || trades.length === 0) return null;
  return (
    <View style={{ gap: spacing.md }}>
      <Text style={styles.section}>RECENT TRADES</Text>
      <View style={styles.history}>
        {trades.map((t, i) => (
          <View key={t.id} style={[styles.past, i === trades.length - 1 && { borderBottomWidth: 0 }]}>
            <Text style={styles.title}>
              {t.partner}
              <Text style={styles.meta}>
                {' · '}
                {new Date(t.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </Text>
            </Text>
            <Text style={styles.names}>Gave {describeSide(t.gave)}</Text>
            <Text style={styles.names}>Got {describeSide(t.got)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  history: { ...windowStyle },
  past: { padding: spacing.md, gap: 2, borderBottomWidth: 1, borderBottomColor: colors.border },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1.5, marginTop: spacing.lg },
  card: { ...windowStyle, padding: spacing.md, gap: spacing.md },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  meta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  sides: { flexDirection: 'row', gap: spacing.md },
  side: { flex: 1, gap: spacing.xs },
  label: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 13, letterSpacing: 1 },
  heroes: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, minHeight: 48, alignItems: 'flex-end' },
  hero: { alignItems: 'center' },
  count: { color: colors.text, fontFamily: fonts.bold, fontSize: 12 },
  names: { color: colors.text, fontFamily: fonts.regular, fontSize: 14, lineHeight: 19 },
  actions: { flexDirection: 'row', gap: spacing.sm },
});
