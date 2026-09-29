import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import { Alert, Linking, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { CollectionGrid } from '@/components/collection-grid';
import { LevelUp } from '@/components/level-up';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { fetchMyValue, shareFriendCode } from '@/social/api';
import { founderLabel } from '@/social/username';
import { socialEnabled } from '@/social/config';
import { useSocial } from '@/social/store';
import { XpBar } from '@/components/xp-bar';
import { MAX_REST_TOKENS, formatTime, parseTime } from '@/game';
import { ensureReminderPermission } from '@/notifications';
import { useGameStore } from '@/store';
import { useClassInfo, useCollection, useLearnedReminderTime, useOverallProgress, usePlayer } from '@/store/hooks';
import { haptics } from '@/haptics';
import { ROSTER, rarityLabel, type CharacterId } from '@/story/companions';
import { colors, fonts, radius, spacing, windowStyle, theme } from '@/theme';
import { useTour } from '@/tutorial/tour';

/** "7:25 PM", in the phone's own clock style. */
function clock(time: string): string {
  const { hour, minute } = parseTime(time);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function openSupport() {
  Alert.alert(
    '988 Suicide & Crisis Lifeline',
    'Free, confidential support, 24/7, in the US. If you are in immediate danger, call 911.',
    [
      { text: 'Call 988', onPress: () => Linking.openURL('tel:988') },
      { text: 'Text 988', onPress: () => Linking.openURL('sms:988') },
      { text: 'Cancel', style: 'cancel' },
    ],
  );
}

export default function CharacterScreen() {
  const player = usePlayer();
  const classInfo = useClassInfo();
  const overall = useOverallProgress();
  const collection = useCollection();
  const setNotificationTime = useGameStore((s) => s.setNotificationTime);
  const setSmartReminders = useGameStore((s) => s.setSmartReminders);
  const learnedTime = useLearnedReminderTime();
  const setHapticsEnabled = useGameStore((s) => s.setHapticsEnabled);
  const exportSave = useGameStore((s) => s.exportSave);
  const replayTour = useTour((s) => s.replay);
  const profile = useSocial((s) => s.profile);
  const premium = usePremium((s) => s.premium);
  const [value, setValue] = useState<number | null>(null);
  const [demoLevelUp, setDemoLevelUp] = useState<{ characterId: CharacterId; level: number } | null>(null);
  const closeDemo = useCallback(() => setDemoLevelUp(null), []);

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

  const shareBackup = () => {
    Share.share({ title: 'Eight Paths backup', message: exportSave() }).catch(() =>
      Alert.alert('Backup failed', 'The share sheet could not open. Please try again.'),
    );
  };

  if (!player || !classInfo) return null;

  const { hour, minute } = parseTime(player.notificationTime);
  const reminder = new Date();
  reminder.setHours(hour, minute, 0, 0);

  return (
    <Screen>
      {demoLevelUp && <LevelUp {...demoLevelUp} onDone={closeDemo} />}
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

      <Text style={styles.section}>SETTINGS</Text>
      <View style={styles.list}>
        {premiumEnabled && (
          <>
            <SettingsRow
              icon="star"
              iconColor={classInfo.color}
              title="Eight Paths Premium"
              subtitle={premium ? 'Active · thank you' : 'Support the game and lore by upgrading to Premium'}
              onPress={() => router.push('/paywall')}
            />
            <View style={styles.divider} />
          </>
        )}
        {profile && (
          <>
            <SettingsRow
              icon="share"
              iconColor={classInfo.color}
              title="Share friend code"
              subtitle={`${profile.friendCode} · friends who join with it wake a hero for you`}
              onPress={() => shareFriendCode(profile.friendCode)}
            />
            <View style={styles.divider} />
          </>
        )}
        <SettingsRow
          icon="bell"
          iconColor={classInfo.color}
          title="At my usual time"
          subtitle={
            learnedTime
              ? `The Keeper calls around ${clock(learnedTime)}, half an hour before you usually start`
              : `Learning when you play. Until then, the Keeper calls at ${clock(player.notificationTime)}.`
          }
          accessory={
            <Switch
              value={player.smartReminders}
              onValueChange={(on) => {
                setSmartReminders(on);
                ensureReminderPermission();
              }}
              trackColor={{ true: classInfo.color }}
            />
          }
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="bell"
          iconColor={classInfo.color}
          title={player.smartReminders ? 'Set time' : 'Reminder time'}
          subtitle={
            player.smartReminders
              ? 'Picking a time turns off "at my usual time"'
              : "One call a day, skipped once you've played"
          }
          accessory={
            <DateTimePicker
              value={reminder}
              mode="time"
              display="compact"
              themeVariant={theme.dark ? 'dark' : 'light'}
              accentColor={classInfo.color}
              minuteInterval={5}
              onValueChange={(_, date) => {
                setNotificationTime(formatTime(date.getHours(), date.getMinutes()));
                ensureReminderPermission();
              }}
            />
          }
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="vibrate"
          iconColor={classInfo.color}
          title="Vibration"
          subtitle="Taps, typing and level-ups"
          accessory={
            <Switch
              value={player.hapticsEnabled}
              onValueChange={(on) => {
                setHapticsEnabled(on);
                if (on) haptics.success();
              }}
              trackColor={{ true: classInfo.color }}
            />
          }
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="repeat"
          iconColor={classInfo.color}
          title="Change class"
          subtitle={`Currently ${classInfo.className}`}
          onPress={() => router.push('/change-class')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="map"
          iconColor={classInfo.color}
          title="Replay the tour"
          subtitle="Let the Keeper show you around again"
          onPress={() => {
            replayTour();
            router.navigate('/');
          }}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="upload"
          iconColor={classInfo.color}
          title="Back up progress"
          subtitle="Save a copy to Notes, Files or email. Your progress only lives on this phone."
          onPress={shareBackup}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="download"
          iconColor={classInfo.color}
          title="Restore from backup"
          subtitle="Replace this phone's progress with a backup"
          onPress={() => router.push('/backup')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="heart"
          iconColor={colors.danger}
          title="Get support"
          subtitle="Call or text 988 · Suicide & Crisis Lifeline (US)"
          onPress={openSupport}
        />
        {/* Development builds only: never ships to the App Store. */}
        {__DEV__ && (
          <>
            <View style={styles.divider} />
            <SettingsRow
              icon="star"
              iconColor={classInfo.color}
              title="Test level-up (dev)"
              subtitle="Plays the level-up for a random party member. Doesn't change your save."
              onPress={() => {
                const members = collection.entries.filter((e) => e.inParty);
                const pick = members[Math.floor(Math.random() * members.length)];
                setDemoLevelUp({ characterId: pick.companion.id, level: pick.progress.level + 1 });
              }}
            />
            <View style={styles.divider} />
            <SettingsRow
              icon="zap"
              iconColor={classInfo.color}
              title="Test character reveal (dev)"
              subtitle="Pick a rarity to see its hatch (1★ is the fanciest). Doesn't change your save."
              onPress={() => {
                const play = (r: number) => {
                  const pool = ROSTER.filter((c) => c.rarity === r);
                  const pick = pool[Math.floor(Math.random() * pool.length)];
                  router.push({ pathname: '/reveal/[id]', params: { id: pick.id, preview: '1' } });
                };
                Alert.alert('Test a hatch', 'Which rarity?', [
                  ...([1, 2, 3, 4, 5] as const).map((r) => ({ text: rarityLabel(r), onPress: () => play(r) })),
                  { text: 'Cancel', style: 'cancel' as const },
                ]);
              }}
            />
          </>
        )}
      </View>
      <Text style={styles.disclaimer}>
        Eight Paths is a habit game. It is not a medical, clinical or mental health service.
      </Text>
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
  disclaimer: {
    color: colors.textFaint,
    fontFamily: fonts.regular,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
});
