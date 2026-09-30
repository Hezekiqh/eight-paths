import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { Alert, Linking, Share, StyleSheet, Switch, Text, View } from 'react-native';

import { playSound, useAudioSettings } from '@/audio';
import { Segmented } from '@/components/segmented';
import { KeeperStatusRows } from '@/components/keeper-status';
import { SettingsRow } from '@/components/settings-row';
import { ThemePicker } from '@/components/theme-picker';
import { HINTS, SCHEMES } from '@/components/world/pause-menu';
import { formatTime, parseTime } from '@/game';
import { haptics } from '@/haptics';
import { ensureReminderPermission } from '@/notifications';
import { premiumEnabled } from '@/premium/config';
import { usePremium } from '@/premium/store';
import { shareFriendCode } from '@/social/api';
import { useSocial } from '@/social/store';
import { useGameStore } from '@/store';
import { useClassInfo, useLearnedReminderTime, usePlayer } from '@/store/hooks';
import { colors, fonts, spacing, theme, windowStyle } from '@/theme';
import { useTour } from '@/tutorial/tour';
import { useWorldStore } from '@/world/store';

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

/**
 * Every setting in one place, on the World menu's Settings tab: how the game
 * plays, how it looks, when the Keeper calls, and everything else.
 */
export function SettingsPanel() {
  const player = usePlayer();
  const classInfo = useClassInfo();
  const setNotificationTime = useGameStore((s) => s.setNotificationTime);
  const setSmartReminders = useGameStore((s) => s.setSmartReminders);
  const setHapticsEnabled = useGameStore((s) => s.setHapticsEnabled);
  const { music, sounds, setMusic, setSounds } = useAudioSettings();
  const exportSave = useGameStore((s) => s.exportSave);
  const learnedTime = useLearnedReminderTime();
  const replayTour = useTour((s) => s.replay);
  const controls = useWorldStore((s) => s.controls);
  const setControls = useWorldStore((s) => s.setControls);
  const profile = useSocial((s) => s.profile);
  const premium = usePremium((s) => s.premium);

  if (!player || !classInfo) return null;
  const color = classInfo.color;

  const { hour, minute } = parseTime(player.notificationTime);
  const reminder = new Date();
  reminder.setHours(hour, minute, 0, 0);

  const shareBackup = () => {
    Share.share({ title: 'Eight Paths backup', message: exportSave() }).catch(() =>
      Alert.alert('Backup failed', 'The share sheet could not open. Please try again.'),
    );
  };

  return (
    <View style={styles.panel}>

      <Text style={styles.section}>GAMEPLAY</Text>
      <View style={styles.list}>
        <View style={styles.controls}>
          <Text style={styles.label}>Controls in the World</Text>
          <Segmented options={SCHEMES} value={controls} onChange={setControls} color={color} />
          <Text style={styles.hint}>{HINTS[controls]}</Text>
        </View>
        <View style={styles.divider} />
        <SettingsRow
          icon="repeat"
          iconColor={color}
          title="Change class"
          subtitle={`Currently ${classInfo.className}`}
          onPress={() => router.push('/change-class')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="map"
          iconColor={color}
          title="Replay the tour"
          subtitle="Let the Keeper show you around again"
          onPress={() => {
            replayTour();
            router.navigate('/');
          }}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="vibrate"
          iconColor={color}
          title="Vibration"
          subtitle="Taps, typing and level-ups"
          accessory={
            <Switch
              value={player.hapticsEnabled}
              onValueChange={(on) => {
                setHapticsEnabled(on);
                if (on) haptics.success();
              }}
              trackColor={{ true: color }}
            />
          }
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="music"
          iconColor={color}
          title="Music"
          subtitle="Quiet pieces now and then, like a game. Plays alongside your own music."
          accessory={<Switch value={music} onValueChange={setMusic} trackColor={{ true: color }} />}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="volume-2"
          iconColor={color}
          title="Sounds"
          subtitle="Quests, level-ups and hatches. Quiet when your ringer is off."
          accessory={
            <Switch
              value={sounds}
              onValueChange={(on) => {
                setSounds(on);
                if (on) playSound('quest');
              }}
              trackColor={{ true: color }}
            />
          }
        />
      </View>

      <Text style={styles.section}>THEME</Text>
      <View style={[styles.list, styles.padded]}>
        <ThemePicker />
      </View>

      <Text style={styles.section}>THE KEEPER&apos;S CALLS</Text>
      <View style={styles.list}>
        <SettingsRow
          icon="bell"
          iconColor={color}
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
              trackColor={{ true: color }}
            />
          }
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="bell"
          iconColor={color}
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
              accentColor={color}
              minuteInterval={5}
              onValueChange={(_, date) => {
                setNotificationTime(formatTime(date.getHours(), date.getMinutes()));
                ensureReminderPermission();
              }}
            />
          }
        />
        <View style={styles.divider} />
        <KeeperStatusRows color={color} />
      </View>

      <Text style={styles.section}>OPTIONS</Text>
      <View style={styles.list}>
        {premiumEnabled && (
          <>
            <SettingsRow
              icon="star"
              iconColor={color}
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
              iconColor={color}
              title="Share friend code"
              subtitle={`${profile.friendCode} · friends who join with it wake a hero for you`}
              onPress={() => shareFriendCode(profile.friendCode)}
            />
            <View style={styles.divider} />
          </>
        )}
        <SettingsRow
          icon="upload"
          iconColor={color}
          title="Back up progress"
          subtitle="Save a copy to Notes, Files or email. Your progress only lives on this phone."
          onPress={shareBackup}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="download"
          iconColor={color}
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
      </View>
      <Text style={styles.disclaimer}>
        Eight Paths is a habit game. It is not a medical, clinical or mental health service.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { gap: spacing.sm },
  section: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.2, marginTop: spacing.md },
  list: { ...windowStyle, overflow: 'hidden' },
  padded: { padding: spacing.md },
  controls: { padding: spacing.md, gap: spacing.sm },
  label: { color: colors.text, fontFamily: fonts.bold, fontSize: 17 },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
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
