import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { formatRate } from '@/components/progress-strip';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { XpBar } from '@/components/xp-bar';
import { MAX_REST_TOKENS, formatTime, parseTime } from '@/game';
import { ensureReminderPermission } from '@/notifications';
import { useGameStore } from '@/store';
import {
  useClassInfo,
  useDimensionStats,
  useOverallProgress,
  usePlayer,
  useToday,
} from '@/store/hooks';
import type { DimensionStats } from '@/store/selectors';
import { colors, radius, spacing } from '@/theme';

function ClassProgressRow({ stats }: { stats: DimensionStats }) {
  const { info, progress, streak, consistency, opacity } = stats;
  const detail = [
    consistency.rate === null ? 'Nothing due in 30 days' : `${formatRate(consistency)} consistent · 30 days`,
    streak.best > 0 && `best ${streak.best}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={`About the ${info.className} class`}
      onPress={() => router.push(`/class/${info.dimension}`)}
      style={({ pressed }) => [styles.classRow, pressed && { backgroundColor: colors.cardRaised }]}>
      <View style={[styles.classRowInner, { opacity }]}>
        <SymbolView name={info.symbol} tintColor={info.color} size={22} />
        <View style={styles.classBody}>
          <View style={styles.classTop}>
            <Text style={styles.className}>{info.className}</Text>
            <Text style={styles.classLevel}>Lv {progress.level}</Text>
          </View>
          <XpBar fill={progress.xpIntoLevel / progress.xpForNext} color={info.color} height={6} />
          <Text style={styles.classDetail}>{detail}</Text>
        </View>
        <View style={styles.streak}>
          <SymbolView name="flame.fill" tintColor={streak.current > 0 ? info.color : colors.textFaint} size={14} />
          <Text style={[styles.streakText, streak.current > 0 && { color: colors.text }]}>{streak.current}</Text>
        </View>
      </View>
    </Pressable>
  );
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
  const today = useToday();
  const player = usePlayer();
  const classInfo = useClassInfo();
  const overall = useOverallProgress();
  const stats = useDimensionStats(today);
  const setNotificationTime = useGameStore((s) => s.setNotificationTime);
  const exportSave = useGameStore((s) => s.exportSave);

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
    <Screen title="Character">
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

      <Text style={styles.section}>YOUR PARTY</Text>
      <View style={styles.list}>
        {stats.map((s) => (
          <ClassProgressRow key={s.dimension} stats={s} />
        ))}
      </View>

      <Text style={styles.section}>SETTINGS</Text>
      <View style={styles.list}>
        <SettingsRow
          icon="bell.fill"
          iconColor={classInfo.color}
          title="Evening reminder"
          subtitle="One gentle nudge, skipped on days you've already played"
          accessory={
            <DateTimePicker
              value={reminder}
              mode="time"
              display="compact"
              themeVariant="dark"
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
          icon="arrow.triangle.2.circlepath"
          iconColor={classInfo.color}
          title="Change class"
          subtitle={`Currently ${classInfo.className}`}
          onPress={() => router.push('/change-class')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="square.and.arrow.up"
          iconColor={classInfo.color}
          title="Back up progress"
          subtitle="Save a copy to Notes, Files or email. Your progress only lives on this phone."
          onPress={shareBackup}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="arrow.down.doc"
          iconColor={classInfo.color}
          title="Restore from backup"
          subtitle="Replace this phone's progress with a backup"
          onPress={() => router.push('/backup')}
        />
        <View style={styles.divider} />
        <SettingsRow
          icon="heart.fill"
          iconColor="#FF6B81"
          title="Get support"
          subtitle="Call or text 988 · Suicide & Crisis Lifeline (US)"
          onPress={openSupport}
        />
      </View>
      <Text style={styles.disclaimer}>
        Eight Paths is a habit game. It is not a medical, clinical or mental health service.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
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
  name: { color: colors.text, fontSize: 22, fontWeight: '800' },
  heroClass: { fontSize: 15, fontWeight: '700' },
  epithet: { color: colors.textMuted, fontStyle: 'italic', fontWeight: '500' },
  overallTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  overallLevel: { color: colors.text, fontSize: 20, fontWeight: '800' },
  overallXp: { color: colors.textMuted, fontSize: 13, fontVariant: ['tabular-nums'] },
  tokens: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  tokenIcons: { flexDirection: 'row', gap: spacing.xs },
  tokenText: { flex: 1, color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  section: { color: colors.textMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1.2, marginTop: spacing.md },
  list: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  classRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  classRowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  classBody: { flex: 1, gap: 6 },
  classTop: { flexDirection: 'row', justifyContent: 'space-between' },
  className: { color: colors.text, fontSize: 16, fontWeight: '700' },
  classDetail: { color: colors.textMuted, fontSize: 12 },
  classLevel: { color: colors.textMuted, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 34, justifyContent: 'flex-end' },
  streakText: { color: colors.textFaint, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 52 },
  disclaimer: { color: colors.textFaint, fontSize: 12, lineHeight: 17, textAlign: 'center', marginTop: spacing.sm },
});
