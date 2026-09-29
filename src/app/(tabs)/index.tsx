import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/haptics';
import { ClassHeader } from '@/components/class-header';
import { ProgressStrip } from '@/components/progress-strip';
import { QuestCard } from '@/components/quest-card';
import { RadarCard } from '@/components/radar/radar-card';
import { Screen } from '@/components/screen';
import { WrapUpCard } from '@/components/wrap-up-card';
import { TUTORIAL_QUEST_ID, type Dimension, type XpGain } from '@/game';
import { LevelUp } from '@/components/level-up';
import { XpBanner } from '@/components/xp-banner';
import { useGameStore, type Milestone } from '@/store';
import {
  useClassInfo,
  usePlayer,
  useProgressSummary,
  useToday,
  useTodayQuestGroups,
  useTutorialQuest,
} from '@/store/hooks';
import { colors, fonts, spacing } from '@/theme';
import type { CharacterId } from '@/story/companions';

type Banner = { key: string; dimension: Dimension; gain: XpGain; milestone: Milestone | null };

export default function TodayScreen() {
  const today = useToday();

  const player = usePlayer();
  const classInfo = useClassInfo();
  const tutorial = useTutorialQuest(today);
  const groups = useTodayQuestGroups(today);
  const summary = useProgressSummary(today);
  const toggleQuest = useGameStore((s) => s.toggleQuest);
  const completeTutorial = useGameStore((s) => s.completeTutorial);

  const [banner, setBanner] = useState<Banner | null>(null);
  const [levelUp, setLevelUp] = useState<{ characterId: CharacterId; level: number } | null>(null);
  const [wrapUpPending, setWrapUpPending] = useState(false);
  const [wrapUpVisible, setWrapUpVisible] = useState(false);

  const onToggle = (questId: string) => {
    const outcome = toggleQuest(questId, today);
    if (outcome.kind === 'completed') {
      // The big double thump is saved for every tenth overall level, so
      // near-daily level-ups keep feeling special; other level-ups buzz lightly.
      if (outcome.overallLevelUp !== null && outcome.overallLevelUp % 10 === 0) haptics.celebrate();
      else if (outcome.gain.leveledUp || outcome.characterLeveledUp || outcome.overallLevelUp) haptics.success();
      else haptics.nudge();
      setBanner({
        key: outcome.completionId,
        dimension: outcome.dimension,
        gain: outcome.gain,
        milestone: outcome.milestone,
      });
      if (outcome.characterLevelUp) setLevelUp(outcome.characterLevelUp);
      if (questId === TUTORIAL_QUEST_ID) {
        completeTutorial();
        setWrapUpPending(true);
      }
    } else if (outcome.kind === 'undone') {
      haptics.select();
      setBanner(null);
    }
  };

  const closeLevelUp = useCallback(() => setLevelUp(null), []);

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
      <Screen>
        {tutorial ? (
          <View style={styles.tutorial}>
            <Text style={styles.greeting}>Welcome, {player.name}.</Text>
            <Text style={styles.hint}>Complete your first quest to earn XP as a {classInfo.className}.</Text>
            <QuestCard view={tutorial} pinned onPress={() => onToggle(tutorial.quest.id)} />
          </View>
        ) : (
          <>
            <ProgressStrip summary={summary} color={classInfo.color} />
            <RadarCard today={today} classInfo={classInfo} />
          </>
        )}
        {!tutorial && groups.length === 0 && (
          <Text style={styles.hint}>No quests scheduled today. Add some from the Quests tab.</Text>
        )}
        {!tutorial &&
          groups.map((group) => (
            <View key={group.dimension} style={styles.group}>
              <ClassHeader info={group.info} />
              {group.quests.map((view) => (
                <QuestCard key={view.quest.id} view={view} onPress={() => onToggle(view.quest.id)} />
              ))}
            </View>
          ))}
      </Screen>
      {levelUp && <LevelUp {...levelUp} onDone={closeLevelUp} />}
      {banner && (
        <XpBanner
          key={banner.key}
          dimension={banner.dimension}
          gain={banner.gain}
          milestone={banner.milestone}
          onDone={onBannerDone}
        />
      )}
      <WrapUpCard visible={wrapUpVisible} info={classInfo} onClose={() => setWrapUpVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  tutorial: { gap: spacing.md },
  greeting: { color: colors.text, fontSize: 26, fontFamily: fonts.bold },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  group: { gap: spacing.sm, marginBottom: spacing.sm },
});
