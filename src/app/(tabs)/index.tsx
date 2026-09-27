import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Alert, Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { CharacterPortrait } from '@/components/character-portrait';
import { CollectionGrid } from '@/components/collection-grid';
import { formatRate } from '@/components/progress-strip';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { XpBar } from '@/components/xp-bar';
import { MAX_REST_TOKENS, formatTime, parseTime } from '@/game';
import { ensureReminderPermission } from '@/notifications';
import { useGameStore } from '@/store';
import {
  useClassInfo,
  useCollection,
  useDimensionStats,
  useOverallProgress,
  usePlayer,
  useToday,
} from '@/store/hooks';
import type { CollectionEntry, DimensionStats } from '@/store/selectors';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

function ClassProgressRow({ stats, member }: { stats: DimensionStats; member: CollectionEntry }) {
  const { info, streak, consistency, opacity } = stats;
  const { companion, progress } = member;
  const detail = [
    consistency.rate === null ? 'Nothing due in 30 days' : `${formatRate(consistency)} consistent · 30 days`,
    streak.best > 0 && `best ${streak.best}`,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={`About ${companion.name}`}
      onPress={() => router.push(`/companion/${companion.id}`)}
      style={({ pressed }) => [styles.classRow, pressed && { backgroundColor: colors.cardRaised }]}>
      <View style={[styles.classRowInner, { opacity }]}>
        <View style={styles.portrait}>
          <CharacterPortrait companion={companion} />
        </View>
        <View style={styles.classBody}>
          <View style={styles.classTop}>
            <View style={styles.names}>
              <Text style={styles.companionName} numberOfLines={1}>
                {companion.name}
              </Text>
              <Text style={[styles.classTag, { color: info.color }]}>
                {info.className} <Text style={styles.pathLevel}>· Path Lv {stats.progress.level}</Text>
              </Text>
            </View>
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
  const collection = useCollection();
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

      <Text style={styles.section}>YOUR PARTY</Text>
      <View style={styles.list}>
        {stats.map((s) => (
          <ClassProgressRow key={s.dimension} stats={s} member={collection.party[s.dimension]} />
        ))}
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.section}>YOUR COLLECTION</Text>
        <Text style={styles.sectionCount}>
          {collection.unlockedCount} / {collection.entries.length}
        </Text>
      </View>
      <CollectionGrid entries={collection.entries} />

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
  classRow: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  classRowInner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  portrait: { width: 32, alignItems: 'center' },
  classBody: { flex: 1, gap: 6 },
  classTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  names: { flexShrink: 1 },
  companionName: { color: colors.text, fontSize: 21, fontFamily: fonts.bold },
  classTag: { fontSize: 16, fontFamily: fonts.bold, marginTop: -2 },
  pathLevel: { color: colors.textMuted },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionCount: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  classDetail: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  classLevel: { color: colors.textMuted, fontSize: 18, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 34, justifyContent: 'flex-end' },
  streakText: { color: colors.textFaint, fontSize: 18, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 52 },
  disclaimer: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13, lineHeight: 17, textAlign: 'center', marginTop: spacing.sm },
});
