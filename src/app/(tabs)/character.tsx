import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { CollectionGrid } from '@/components/collection-grid';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { fetchMyStanding } from '@/social/api';
import { socialEnabled } from '@/social/config';
import { useSocial } from '@/social/store';
import { XpBar } from '@/components/xp-bar';
import { MAX_REST_TOKENS } from '@/game';
import { useClassInfo, useCollection, useOverallProgress, usePlayer } from '@/store/hooks';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';
import { useTourScroller, useTourTarget } from '@/tutorial/tour';

export default function CharacterScreen() {
  const player = usePlayer();
  const classInfo = useClassInfo();
  const overall = useOverallProgress();
  const collection = useCollection();
  const profile = useSocial((s) => s.profile);
  const [standing, setStanding] = useState<{ rank: number | null; value: number | null } | null>(null);
  const scroller = useTourScroller();
  const collectionRef = useTourTarget('collection', scroller);

  // Collection value and rank shift as other players wake heroes, so refresh on every visit.
  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      let live = true;
      fetchMyStanding()
        .then((v) => live && setStanding(v))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [profile]),
  );

  if (!player || !classInfo) return null;

  return (
    <Screen scrollRef={scroller.ref} onScroll={scroller.onScroll}>
      <View style={[styles.hero, { borderColor: classInfo.color }]}>
        {profile && standing && (
          <View
            style={styles.rank}
            accessible
            accessibilityLabel={standing.rank ? `Collection rank ${standing.rank}` : 'Collection rank outside the top 100'}>
            <Text style={[styles.rankNumber, { color: classInfo.color }]}>
              {standing.rank ? `#${standing.rank}` : '100+'}
            </Text>
            <Text style={styles.rankLabel}>RANK</Text>
          </View>
        )}
        <View style={[styles.heroTop, profile && standing && styles.heroTopRanked]}>
          <View style={[styles.emblem, { borderColor: classInfo.color }]}>
            <SymbolView name={classInfo.symbol} tintColor={classInfo.color} size={30} />
          </View>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          <Text style={styles.level}>Lv {overall.level}</Text>
        </View>
        <XpBar fill={overall.xpIntoLevel / overall.xpForNext} color={classInfo.color} height={10} />
        <View
          style={styles.tokens}
          accessible
          accessibilityLabel={`${player.restTokens} of ${MAX_REST_TOKENS} rest days`}>
          {Array.from({ length: MAX_REST_TOKENS }, (_, i) => (
            <SymbolView
              key={i}
              name={i < player.restTokens ? 'moon.stars.fill' : 'moon.stars'}
              tintColor={i < player.restTokens ? classInfo.color : colors.textFaint}
              size={20}
            />
          ))}
          <Text style={styles.tokenText}>
            {player.restTokens} rest {player.restTokens === 1 ? 'day' : 'days'}
          </Text>
        </View>
      </View>

      <View style={styles.collection}>
        {/* The Keeper's tour points at the collection's heading and its first rows. */}
        <View ref={collectionRef} collapsable={false} style={styles.tourCollection} pointerEvents="none" />
        <View style={styles.sectionRow}>
          <Text style={styles.section}>YOUR COLLECTION</Text>
          {profile && standing?.value != null && (
            <Text style={[styles.sectionCount, { color: classInfo.color }]}>{standing.value.toLocaleString()} value</Text>
          )}
          <Text style={styles.sectionCount}>
            {collection.unlockedCount} / {collection.entries.length}
          </Text>
        </View>
        <CollectionGrid entries={collection.entries} />
      </View>

      {socialEnabled && (
        <View style={[styles.list, { marginTop: spacing.lg }]}>
          <SettingsRow
            icon="users"
            iconColor={classInfo.color}
            title="Friends · The Second 100"
            subtitle="Share your heroes, never your habits"
            onPress={() => router.push('/social')}
          />
        </View>
      )}

      <View style={[styles.list, { marginTop: spacing.lg }]}>
        <SettingsRow
          icon="gamepad"
          iconColor={classInfo.color}
          title="Settings"
          subtitle="Themes, controls, reminders and more, in the Other World menu"
          onPress={() => router.navigate({ pathname: '/world', params: { tab: 'settings' } })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    ...windowStyle,
    padding: spacing.lg,
    gap: spacing.md,
  },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  // Room for the rank in the corner.
  heroTopRanked: { paddingRight: 56 },
  emblem: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  name: { flexShrink: 1, color: colors.text, fontSize: 29, fontFamily: fonts.bold },
  level: { color: colors.textMuted, fontSize: 22, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  rank: { position: 'absolute', top: spacing.md, right: spacing.md, alignItems: 'center', zIndex: 1 },
  rankNumber: { fontSize: 22, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  rankLabel: { color: colors.textFaint, fontSize: 11, fontFamily: fonts.bold, letterSpacing: 1.2 },
  tokens: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tokenText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, marginLeft: spacing.xs },
  section: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.2, marginTop: spacing.md },
  list: { ...windowStyle, overflow: 'hidden' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  // Same spacing as the Screen's own children.
  collection: { gap: spacing.md },
  tourCollection: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
  sectionCount: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 56 },
  moved: {
    color: colors.textFaint,
    fontFamily: fonts.regular,
    fontSize: 13,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  disclaimer: {
    color: colors.textFaint,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
