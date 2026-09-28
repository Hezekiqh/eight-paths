import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Linking, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { CollectionGrid } from '@/components/collection-grid';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { shareFriendCode } from '@/social/api';
import { socialEnabled } from '@/social/config';
import { useSocial } from '@/social/store';
import { XpBar } from '@/components/xp-bar';
import { MAX_REST_TOKENS, formatTime, parseTime } from '@/game';
import { ensureReminderPermission } from '@/notifications';
import { useGameStore } from '@/store';
import { useClassInfo, useCollection, useOverallProgress, usePlayer } from '@/store/hooks';
import { haptics } from '@/haptics';
import { ROSTER } from '@/story/companions';
import { colors, fonts, radius, spacing, windowStyle, theme } from '@/theme';

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
  const setHapticsEnabled = useGameStore((s) => s.setHapticsEnabled);
  const exportSave = useGameStore((s) => s.exportSave);
  const profile = useSocial((s) => s.profile);

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
          title="Evening reminder"
          subtitle="One gentle nudge, skipped on days you've already played"
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
              icon="zap"
              iconColor={classInfo.color}
              title="Test character reveal (dev)"
              subtitle="Plays the reveal for a random character. Doesn't change your save."
              onPress={() => {
                const pick = ROSTER[Math.floor(Math.random() * ROSTER.length)];
                router.push({ pathname: '/reveal/[id]', params: { id: pick.id, preview: '1' } });
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
