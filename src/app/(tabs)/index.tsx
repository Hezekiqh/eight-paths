import { router, useIsFocused } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { playSound } from '@/audio';
import { haptics } from '@/haptics';
import { ProgressStrip } from '@/components/progress-strip';
import { QuestCard } from '@/components/quest-card';
import { RadarCard } from '@/components/radar/radar-card';
import { Screen } from '@/components/screen';
import { SettingsRow } from '@/components/settings-row';
import { WrapUpCard } from '@/components/wrap-up-card';
import { TUTORIAL_QUEST_ID, type Dimension, type XpGain } from '@/game';
import { LevelUp } from '@/components/level-up';
import { PartyRow } from '@/components/party-row';
import { XpBanner } from '@/components/xp-banner';
import { useGameStore, type Milestone } from '@/store';
import { useSession } from '@/store/session';
import { useClassInfo, usePlayer, useProgressSummary, useToday, useTodayQuests, useTutorialQuest } from '@/store/hooks';
import { colors, fonts, radius, spacing, windowStyle } from '@/theme';
import type { CharacterId } from '@/story/companions';
import { useTour, useTourScroller, useTourTarget } from '@/tutorial/tour';

/** Lets Today appear before a quest marked done from a notification celebrates. */
const DONE_ACTION_DELAY_MS = 600;

type Banner = { key: string; dimension: Dimension; gain: XpGain; milestone: Milestone | null };

export default function TodayScreen() {
  const today = useToday();

  const player = usePlayer();
  const classInfo = useClassInfo();
  const tutorial = useTutorialQuest(today);
  const quests = useTodayQuests(today);
  const summary = useProgressSummary(today);
  const toggleQuest = useGameStore((s) => s.toggleQuest);
  const skipQuest = useGameStore((s) => s.skipQuest);
  const completeTutorial = useGameStore((s) => s.completeTutorial);
  const setKeeperHold = useSession((s) => s.setKeeperHold);

  const [banner, setBanner] = useState<Banner | null>(null);
  const [levelUp, setLevelUp] = useState<{ characterId: CharacterId; level: number } | null>(null);
  const [wrapUpPending, setWrapUpPending] = useState(false);
  const [wrapUpVisible, setWrapUpVisible] = useState(false);

  const scroller = useTourScroller();
  const addRef = useTourTarget('add-quest', scroller);
  const radarRef = useTourTarget('radar', scroller);
  const questRef = useTourTarget('first-quest', scroller);
  const focused = useIsFocused();
  const introDone = useSession((s) => s.introDone);
  const tourDue = useTour((s) => s.ready && !s.done && !s.running);
  const beginTour = useTour((s) => s.begin);
  // The Keeper's tour starts as soon as the player has a name (and the screen is quiet), and walks
  // them through their first habit and the tabs from above them (see KeeperTour in the tabs layout).
  const touring =
    tourDue && introDone && focused && !!player && !wrapUpPending && !wrapUpVisible && !banner && !levelUp;
  useEffect(() => {
    if (touring) beginTour();
  }, [touring, beginTour]);

  const onToggle = (questId: string) => {
    const outcome = toggleQuest(questId, today);
    if (outcome.kind === 'completed') {
      // The big double thump is saved for every tenth overall level, so
      // near-daily level-ups keep feeling special; other level-ups buzz lightly.
      if (outcome.overallLevelUp !== null && outcome.overallLevelUp % 10 === 0) haptics.celebrate();
      else if (outcome.gain.leveledUp || outcome.characterLeveledUp || outcome.overallLevelUp) haptics.success();
      else haptics.nudge();
      // A companion's level-up plays its own fanfare over the top.
      const leveled = outcome.gain.leveledUp || outcome.overallLevelUp !== null;
      playSound(leveled && !outcome.characterLevelUp ? 'levelUp' : 'quest');
      setBanner({
        key: outcome.completionId,
        dimension: outcome.dimension,
        gain: outcome.gain,
        milestone: outcome.milestone,
      });
      // Only for someone already awake: the first habit levels Quill before they've even hatched.
      const levelled = outcome.characterLevelUp;
      if (levelled && (useGameStore.getState().owned?.[levelled.characterId] ?? 0) > 0) setLevelUp(levelled);
      if (questId === TUTORIAL_QUEST_ID) {
        completeTutorial();
        // In the tour, the Keeper says it himself; otherwise the wrap-up card does, and he waits for it.
        if (!useTour.getState().running) {
          setWrapUpPending(true);
          setKeeperHold(true);
        }
      }
    } else if (outcome.kind === 'undone') {
      haptics.select();
      setBanner(null);
    }
  };

  // Only an unfinished quest can be skipped; a skip can't be taken back.
  const onSkip = (questId: string, title: string) => {
    haptics.tap();
    Alert.alert(
      `Skip "${title}" today?`,
      "It's erased from today: no XP, and your streak is left alone. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip for today',
          style: 'destructive',
          onPress: () => {
            if (skipQuest(questId, today)) haptics.select();
          },
        },
      ],
    );
  };

  const closeLevelUp = useCallback(() => setLevelUp(null), []);

  // "Done" on one of the Keeper's calls: complete it here, once the intro is over
  // and the screen has settled, so it gets the same banner and level-ups as a tap.
  // Never undoes a quest that's already done.
  const pendingQuest = useSession((s) => s.pendingQuest);
  const toggleRef = useRef(onToggle);
  useEffect(() => {
    toggleRef.current = onToggle;
  });
  useEffect(() => {
    if (!pendingQuest || !introDone) return;
    const timer = setTimeout(() => {
      useSession.setState({ pendingQuest: null });
      const { quests, completions } = useGameStore.getState();
      const quest = quests.find((q) => q.id === pendingQuest && q.active);
      const done = completions.some((c) => c.questId === pendingQuest && c.date === today);
      if (quest && !done) toggleRef.current(quest.id);
    }, DONE_ACTION_DELAY_MS);
    return () => clearTimeout(timer);
  }, [pendingQuest, introDone, today]);

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
      <Screen
        scrollRef={scroller.ref}
        onScroll={scroller.onScroll}
        action={
          <Pressable
            ref={addRef}
            accessibilityRole="button"
            accessibilityLabel="Add quest"
            onPress={() => {
              haptics.tap();
              router.push('/quest-editor');
            }}
            hitSlop={12}
            style={[styles.add, { backgroundColor: classInfo.color }]}>
            <SymbolView name="plus" tintColor={colors.background} size={18} weight="bold" />
          </Pressable>
        }>
        {tutorial ? (
          <View style={styles.tutorial}>
            <Text style={styles.greeting}>Welcome, {player.name}.</Text>
            <Text style={styles.hint}>Complete your first quest to earn XP as a {classInfo.className}.</Text>
            <View ref={questRef} collapsable={false}>
              <QuestCard view={tutorial} pinned onPress={() => onToggle(tutorial.quest.id)} />
            </View>
            {/* The eight Paths, still empty: the Keeper's tour shows it off before the first habit. */}
            <View ref={radarRef} collapsable={false}>
              <RadarCard today={today} classInfo={classInfo} />
            </View>
          </View>
        ) : (
          <>
            <ProgressStrip summary={summary} color={classInfo.color} />
            <View ref={radarRef} collapsable={false}>
              <RadarCard today={today} classInfo={classInfo} />
            </View>
          </>
        )}
        {!tutorial && <PartyRow />}
        {!tutorial && quests.length > 1 && (
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>TODAY</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reorder quests"
              onPress={() => {
                haptics.tap();
                router.push('/reorder-quests');
              }}
              hitSlop={12}
              style={({ pressed }) => [styles.reorder, pressed && { opacity: 0.6 }]}>
              <SymbolView name="arrow.up.arrow.down" tintColor={classInfo.color} size={15} />
              <Text style={[styles.reorderText, { color: classInfo.color }]}>Reorder</Text>
            </Pressable>
          </View>
        )}
        {!tutorial && quests.length === 0 && (
          <Text style={styles.hint}>No quests scheduled today. Tap + to add one.</Text>
        )}
        {!tutorial &&
          quests.map((view, q) => (
            <View key={view.quest.id} ref={q === 0 ? questRef : undefined} collapsable={false}>
              <QuestCard
                view={view}
                showPath
                onPress={() => onToggle(view.quest.id)}
                onSkip={view.done ? undefined : () => onSkip(view.quest.id, view.quest.title)}
              />
            </View>
          ))}
        {!tutorial && quests.some((v) => !v.done) && (
          <Text style={styles.skipHint}>{"Can't get to one today? Hold it to skip it."}</Text>
        )}
        {!tutorial && (
          <View style={styles.manage}>
            <SettingsRow
              icon="script"
              iconColor={classInfo.color}
              title="All quests"
              subtitle="Edit, reschedule or archive your quests"
              onPress={() => router.push('/all-quests')}
            />
          </View>
        )}
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
      <WrapUpCard
        visible={wrapUpVisible}
        info={classInfo}
        onClose={() => {
          setWrapUpVisible(false);
          setKeeperHold(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  add: { width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  manage: { ...windowStyle, marginTop: spacing.sm },
  tutorial: { gap: spacing.md },
  greeting: { color: colors.text, fontSize: 26, fontFamily: fonts.bold },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  skipHint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, textAlign: 'center' },
  listHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  listTitle: { color: colors.textMuted, fontSize: 16, fontFamily: fonts.bold, letterSpacing: 1.2 },
  reorder: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  reorderText: { fontFamily: fonts.bold, fontSize: 15 },
});
