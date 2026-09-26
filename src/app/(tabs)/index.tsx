import * as Haptics from 'expo-haptics';
import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { QuestCard } from '@/components/quest-card';
import { Screen } from '@/components/screen';
import { WrapUpCard } from '@/components/wrap-up-card';
import { TUTORIAL_QUEST_ID, type Dimension, type XpGain } from '@/game';
import { XpBanner } from '@/components/xp-banner';
import { useGameStore } from '@/store';
import {
  useClassInfo,
  usePlayer,
  useSettleOnDayChange,
  useToday,
  useTodayQuestGroups,
  useTutorialQuest,
} from '@/store/hooks';
import { colors, spacing } from '@/theme';

type Banner = { key: string; dimension: Dimension; gain: XpGain };

export default function TodayScreen() {
  const today = useToday();
  useSettleOnDayChange(today);

  const player = usePlayer();
  const classInfo = useClassInfo();
  const tutorial = useTutorialQuest(today);
  const groups = useTodayQuestGroups(today);
  const toggleQuest = useGameStore((s) => s.toggleQuest);
  const completeTutorial = useGameStore((s) => s.completeTutorial);

  const [banner, setBanner] = useState<Banner | null>(null);
  const [wrapUpPending, setWrapUpPending] = useState(false);
  const [wrapUpVisible, setWrapUpVisible] = useState(false);

  const onToggle = (questId: string) => {
    const outcome = toggleQuest(questId, today);
    if (outcome.kind === 'completed') {
      Haptics.notificationAsync(
        outcome.gain.leveledUp
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Warning,
      );
      setBanner({ key: outcome.completionId, dimension: outcome.dimension, gain: outcome.gain });
      if (questId === TUTORIAL_QUEST_ID) {
        completeTutorial();
        setWrapUpPending(true);
      }
    } else if (outcome.kind === 'undone') {
      Haptics.selectionAsync();
      setBanner(null);
    }
  };

  const onBannerDone = () => {
    setBanner(null);
    if (wrapUpPending) {
      setWrapUpPending(false);
      setWrapUpVisible(true);
    }
  };

  if (!player || !classInfo) return null;

  return (
    <View style={styles.flex}>
      <Screen title={tutorial ? 'Quest Board' : 'Today'}>
        {tutorial ? (
          <View style={styles.tutorial}>
            <Text style={styles.greeting}>Welcome, {player.name}.</Text>
            <Text style={styles.hint}>Complete your first quest to earn XP as a {classInfo.className}.</Text>
            <QuestCard view={tutorial} pinned onPress={() => onToggle(tutorial.quest.id)} />
          </View>
        ) : groups.length === 0 ? (
          <Text style={styles.hint}>No quests scheduled today. Add some from the Quests tab.</Text>
        ) : (
          groups.map((group) => (
            <View key={group.dimension} style={styles.group}>
              <Pressable
                accessibilityRole="button"
                accessibilityHint={`About the ${group.info.className} class`}
                onPress={() => router.push(`/class/${group.dimension}`)}
                style={({ pressed }) => [styles.groupHeader, pressed && { opacity: 0.6 }]}>
                <SymbolView name={group.info.symbol} tintColor={group.info.color} size={16} />
                <Text style={[styles.groupTitle, { color: group.info.color }]}>
                  {group.info.className.toUpperCase()}
                </Text>
                <SymbolView name="info.circle" tintColor={colors.textFaint} size={14} />
              </Pressable>
              {group.quests.map((view) => (
                <QuestCard key={view.quest.id} view={view} onPress={() => onToggle(view.quest.id)} />
              ))}
            </View>
          ))
        )}
      </Screen>
      {banner && <XpBanner key={banner.key} dimension={banner.dimension} gain={banner.gain} onDone={onBannerDone} />}
      <WrapUpCard visible={wrapUpVisible} info={classInfo} onClose={() => setWrapUpVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  tutorial: { gap: spacing.md },
  greeting: { color: colors.text, fontSize: 20, fontWeight: '700' },
  hint: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  group: { gap: spacing.sm, marginBottom: spacing.sm },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  groupTitle: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2 },
});
