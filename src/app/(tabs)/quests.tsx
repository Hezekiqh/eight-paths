import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Swipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { ClassHeader } from '@/components/class-header';
import { Screen } from '@/components/screen';
import { useGameStore } from '@/store';
import { useAllQuestGroups, useClassInfo, useToday } from '@/store/hooks';
import type { QuestView } from '@/store/selectors';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';

function QuestRow({ view }: { view: QuestView }) {
  const archiveQuest = useGameStore((s) => s.archiveQuest);
  const { quest, info, streak, schedule } = view;

  return (
    <Swipeable
      friction={2}
      rightThreshold={40}
      overshootRight={false}
      containerStyle={styles.swipe}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Archive ${quest.title}`}
          onPress={() => archiveQuest(quest.id)}
          style={styles.archive}>
          <SymbolView name="archivebox.fill" tintColor={colors.text} size={20} />
          <Text style={styles.archiveText}>Archive</Text>
        </Pressable>
      )}>
      <Pressable
        accessibilityRole="button"
        accessibilityHint="Edit quest"
        onPress={() => router.push({ pathname: '/quest-editor', params: { id: quest.id } })}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: colors.cardRaised }]}>
        <View style={styles.body}>
          <Text style={styles.title}>{quest.title}</Text>
          <Text style={styles.meta}>{schedule}</Text>
        </View>
        <View style={styles.streak}>
          <SymbolView name="flame.fill" tintColor={streak > 0 ? info.color : colors.textFaint} size={16} />
          <Text style={[styles.streakText, streak > 0 && { color: colors.text }]}>{streak}</Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}

export default function QuestsScreen() {
  const today = useToday();
  const groups = useAllQuestGroups(today);
  const classInfo = useClassInfo();
  const accent = classInfo?.color ?? colors.grid;

  return (
    <Screen
      action={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add quest"
          onPress={() => router.push('/quest-editor')}
          hitSlop={12}
          style={[styles.add, { backgroundColor: accent }]}>
          <SymbolView name="plus" tintColor={colors.background} size={18} weight="bold" />
        </Pressable>
      }>
      {groups.length === 0 ? (
        <Text style={styles.empty}>No active quests. Tap + to add one.</Text>
      ) : (
        <>
          <Text style={styles.tip}>* Tap a quest to edit it, or swipe left to archive.</Text>
          {groups.map((group) => (
            <View key={group.dimension} style={styles.group}>
              <ClassHeader info={group.info} />
              {group.quests.map((view) => (
                <QuestRow key={view.quest.id} view={view} />
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  add: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  tip: { color: colors.textFaint, fontFamily: fonts.regular, fontSize: 13 },
  empty: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15 },
  group: { gap: spacing.sm, marginBottom: spacing.sm },
  swipe: { borderRadius: radius.lg, backgroundColor: '#7A2E38' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    ...windowStyle,
    padding: spacing.lg,
  },
  body: { flex: 1, gap: 2 },
  title: { color: colors.text, fontSize: 22, fontFamily: fonts.semibold },
  meta: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  streakText: { color: colors.textFaint, fontSize: 20, fontFamily: fonts.bold, fontVariant: ['tabular-nums'] },
  archive: { width: 96, alignItems: 'center', justifyContent: 'center', gap: 4 },
  archiveText: { color: colors.text, fontSize: 17, fontFamily: fonts.bold },
});
