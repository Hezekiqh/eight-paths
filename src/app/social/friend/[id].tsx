import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { CHARACTER_ART } from '@/art/sprites';
import { Button } from '@/components/button';
import { PixelSprite } from '@/components/pixel-sprite';
import { SettingsRow } from '@/components/settings-row';
import { SocialError, blockPlayer, fetchCollection, removeFriend, reportPlayer } from '@/social/api';
import { useSocial } from '@/social/store';
import { founderLabel } from '@/social/username';
import { ROSTER, isCharacterId } from '@/story/companions';
import { useClassInfo } from '@/store/hooks';
import { colors, fonts, spacing, windowStyle } from '@/theme';

const COLUMNS = 5;
const REPORT_REASONS = ['Offensive username', 'Harassment', 'Something else'];

const message = (e: unknown) => (e instanceof SocialError ? e.message : 'Something went wrong. Please try again.');

/** A friend's profile, the heroes they hold, and a way to trade. Never their habits. */
export default function FriendScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const friend = useSocial((s) => s.friends.find((f) => f.id === id));
  const color = useClassInfo()?.color ?? colors.accent;
  const [woken, setWoken] = useState<Set<string> | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!id) return;
    fetchCollection(id)
      .then((ids) => setWoken(new Set(ids)))
      .catch(() => setWoken(new Set()));
  }, [id]);

  if (!friend) {
    return (
      <View style={styles.screen}>
        <Text style={[styles.body, { padding: spacing.xl }]}>This player is no longer on your friends list.</Text>
      </View>
    );
  }

  const act = (title: string, text: string, label: string, run: () => Promise<void>) =>
    Alert.alert(title, text, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        style: 'destructive',
        onPress: () =>
          run()
            .then(() => router.back())
            .catch((e) => Alert.alert('That didn’t work', message(e))),
      },
    ]);

  const report = () =>
    Alert.alert(`Report ${friend.username}?`, 'Reports are reviewed by the developer.', [
      ...REPORT_REASONS.map((reason) => ({
        text: reason,
        onPress: () =>
          reportPlayer(friend.id, reason)
            .then(() => Alert.alert('Thanks', 'Your report was sent.'))
            .catch((e) => Alert.alert('Not sent', message(e))),
      })),
      { text: 'Cancel', style: 'cancel' as const },
    ]);

  const cell = width ? (width - spacing.sm * (COLUMNS - 1)) / COLUMNS : 0;
  const leader = friend.leader && isCharacterId(friend.leader) ? CHARACTER_ART[friend.leader] : undefined;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <SafeAreaView edges={['top']} />
      <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
        <Text style={[styles.back, { color }]}>‹ Friends</Text>
      </Pressable>
      <View style={[styles.card, { borderColor: color }]}>
        {leader && <PixelSprite sheet={leader.idle} scale={2} />}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.name}>{friend.username}</Text>
          <Text style={styles.body}>
            Lv {friend.level}
            {friend.daysShownUp !== null ? ` · ${friend.daysShownUp} days shown up` : ''}
            {friend.streak !== null ? ` · ${friend.streak}-day streak` : ''}
          </Text>
          {friend.founderNumber !== null && (
            <Text style={[styles.badge, { color, borderColor: color }]}>
              SECOND 100 · {founderLabel(friend.founderNumber)}
            </Text>
          )}
        </View>
      </View>

      <Button
        title="Trade heroes"
        onPress={() => router.push({ pathname: '/social/trade/[id]', params: { id: friend.id } })}
        color={color}
      />

      <Text style={styles.section}>
        HEROES · {woken ? `${[...woken].filter(isCharacterId).length} / ${ROSTER.length}` : '…'}
      </Text>
      {woken === null ? (
        <ActivityIndicator color={color} />
      ) : (
        <View style={styles.grid} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          {cell > 0 &&
            ROSTER.map((c) => {
              const art = CHARACTER_ART[c.id];
              const has = woken.has(c.id);
              return (
                <View
                  key={c.id}
                  style={[styles.cell, { width: cell, height: cell * 1.25 }]}
                  accessibilityLabel={has ? c.name : 'Not yet woken'}>
                  {art && (
                    <PixelSprite
                      sheet={art.idle}
                      scale={(cell * 0.8) / art.idle.height}
                      tint={has ? undefined : colors.border}
                      animate={false}
                    />
                  )}
                </View>
              );
            })}
        </View>
      )}

      <View style={[styles.list, { marginTop: spacing.lg }]}>
        <SettingsRow
          icon="user-x"
          iconColor={color}
          title="Remove friend"
          onPress={() =>
            act(`Remove ${friend.username}?`, 'You can add each other again later.', 'Remove', () =>
              removeFriend(friend.id),
            )
          }
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="flag"
          iconColor={colors.danger}
          title="Block"
          subtitle="They can't add you again"
          onPress={() =>
            act(`Block ${friend.username}?`, 'They’re removed from your friends and can’t add you.', 'Block', () =>
              blockPlayer(friend.id),
            )
          }
        />
        <View style={styles.divider} />
        <SettingsRow icon="flag" iconColor={colors.danger} title="Report" onPress={report} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md, paddingBottom: spacing.xxl },
  back: { fontFamily: fonts.bold, fontSize: 18 },
  card: {
    ...windowStyle,
    borderWidth: 3,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.lg,
    alignItems: 'center',
  },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 28 },
  body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 2,
    paddingHorizontal: spacing.sm,
    fontFamily: fonts.bold,
    fontSize: 15,
    letterSpacing: 1,
  },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1.5, marginTop: spacing.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { alignItems: 'center', justifyContent: 'flex-end' },
  list: { ...windowStyle },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: spacing.xxl },
});
