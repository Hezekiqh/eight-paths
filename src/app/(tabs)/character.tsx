import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { CollectionGrid } from '@/components/collection-grid';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { fetchMyValue } from '@/social/api';
import { founderLabel } from '@/social/username';
import { socialEnabled } from '@/social/config';
import { useSocial } from '@/social/store';
import { XpBar } from '@/components/xp-bar';
import { MAX_REST_TOKENS } from '@/game';
import { useClassInfo, useCollection, useOverallProgress, usePlayer } from '@/store/hooks';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

export default function CharacterScreen() {
  const player = usePlayer();
  const classInfo = useClassInfo();
  const overall = useOverallProgress();
  const collection = useCollection();
  const profile = useSocial((s) => s.profile);
  const [value, setValue] = useState<number | null>(null);

  // Collection value shifts as other players wake heroes, so refresh on every visit.
  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      let live = true;
      fetchMyValue()
        .then((v) => live && setValue(v))
        .catch(() => {});
      return () => {
        live = false;
      };
    }, [profile]),
  );

  if (!player || !classInfo) return null;

  return (
    <Screen>
      <View style={[styles.hero, { borderColor: classInfo.color }]}>
        <View style={styles.heroTop}>
          <View style={[styles.emblem, { borderColor: classInfo.color }]}>
            <SymbolView name={classInfo.symbol} tintColor={classInfo.color} size={30} />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.name}>{player.name}</Text>
            <Text style={[styles.heroClass, { color: classInfo.color }]}>
              {classInfo.className} · <Text style={styles.epithet}>{classInfo.epithet}</Text>
            </Text>
            {profile && (
              <Text style={styles.handle}>
                @{profile.username}
                {profile.founderNumber !== null ? ` · Second 100 ${founderLabel(profile.founderNumber)}` : ''}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.overallTop}>
          <Text style={styles.overallLevel}>Level {overall.level}</Text>
          <Text style={styles.overallXp}>
            {overall.xpIntoLevel} / {overall.xpForNext} XP
          </Text>
        </View>
        <XpBar fill={overall.xpIntoLevel / overall.xpForNext} color={classInfo.color} height={10} />
        <View style={styles.tokens}>
          <View style={styles.tokenIcons}>
            {Array.from({ length: MAX_REST_TOKENS }, (_, i) => (
              <SymbolView
                key={i}
                name={i < player.restTokens ? 'moon.stars.fill' : 'moon.stars'}
                tintColor={i < player.restTokens ? classInfo.color : colors.textFaint}
                size={20}
              />
            ))}
          </View>
          <Text style={styles.tokenText}>
            {player.restTokens} rest {player.restTokens === 1 ? 'token' : 'tokens'} · protects your streaks on a day off
          </Text>
        </View>
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>YOUR COLLECTION</Text>
        {profile && value !== null && (
          <Text style={[styles.sectionCount, { color: classInfo.color }]}>{value.toLocaleString()} value</Text>
        )}
        <Text style={styles.sectionCount}>
          {collection.unlockedCount} / {collection.entries.length}
        </Text>
      </View>
      <CollectionGrid entries={collection.entries} />

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
  emblem: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardRaised,
  },
  heroText: { flex: 1, gap: 2 },
  handle: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, marginTop: 2 },
  name: { color: colors.text, fontSize: 29, fontFamily: fonts.bold },
  heroClass: { fontSize: 20, fontFamily: fonts.bold },
  epithet: { color: colors.textMuted, fontStyle: 'italic', fontFamily: fonts.medium },
  overallTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  overallLevel: { color: colors.text, fontSize: 26, fontFamily: fonts.bold },
  overallXp: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, fontVariant: ['tabular-nums'] },
  tokens: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tokenIcons: { flexDirection: 'row', gap: spacing.xs },
  tokenText: { flex: 1, color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  section: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.2, marginTop: spacing.md },
  list: { ...windowStyle, overflow: 'hidden' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
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
