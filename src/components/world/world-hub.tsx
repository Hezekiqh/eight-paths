import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenTitle } from '@/components/screen';
import { Segmented } from '@/components/segmented';
import { SettingsPanel } from '@/components/settings-panel';
import { LoreScroll } from '@/components/world/lore-scroll';
import { MemoryScroll } from '@/components/world/memory-scroll';
import { haptics } from '@/haptics';
import { colors, fonts, spacing, windowStyle } from '@/theme';
import { useTourScroller, useTourTarget } from '@/tutorial/tour';
import { COMPANIONS, type CharacterId } from '@/story/companions';
import { useGameStore } from '@/store';
import { useWorldStore } from '@/world/store';
import { showDialog } from '@/components/dialog';

const TABS = [
  { value: 'world', label: 'Other World' },
  { value: 'settings', label: 'Settings' },
] as const;
type Tab = (typeof TABS)[number]['value'];

/**
 * What the World tab opens on: an upright pause menu. The World tab jumps
 * back into the sideways game, keeps the story of the Kingdom, uncovered by
 * what people tell you, and can start it all again. The Settings tab holds
 * every setting in the app.
 */
export function WorldHub({ onPlay }: { onPlay: () => void }) {
  const position = useWorldStore((s) => s.position);
  const discovered = useWorldStore((s) => s.discovered);
  const heard = useWorldStore((s) => s.heard);
  const memories = useWorldStore((s) => s.memories);
  // First the Keeper asks who you look like (stepping outside asks it); then no Other World
  // until the first habit wakes that hero (an old save, with no `owned`, has everyone already).
  const origin = useGameStore((s) => s.player?.origin);
  const awake = useGameStore((s) => !s.player?.origin || s.owned === null || (s.owned[s.player.origin] ?? 0) > 0);
  // `/world?tab=settings` opens straight on Settings (the Character tab links here).
  const params = useLocalSearchParams<{ tab?: string }>();
  const asked: Tab = params.tab === 'settings' ? 'settings' : 'world';
  const [tab, setTab] = useState<Tab>(asked);
  const [lastAsked, setLastAsked] = useState(asked);
  // The Keeper's tour ends here, at the door out.
  const scroller = useTourScroller();
  const playRef = useTourTarget('step-outside', scroller);
  const settingsRef = useTourTarget('regulator', scroller);
  const { ref: scrollRef, onScroll } = scroller;
  if (asked !== lastAsked) {
    setLastAsked(asked);
    setTab(asked);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView ref={scrollRef} onScroll={onScroll} scrollEventThrottle={32} contentContainerStyle={styles.content}>
        <ScreenTitle title="Other World" />
        {/* The Keeper's tour points here for Settings and the Dopamine Regulator inside it. */}
        <View ref={settingsRef} collapsable={false}>
          <Segmented options={TABS} value={tab} onChange={setTab} color={colors.accent} />
        </View>

        {tab === 'settings' ? (
          <SettingsPanel />
        ) : (
          <>
            <View ref={playRef} collapsable={false}>
              {awake || !origin ? <Play started={position !== null} onPlay={onPlay} /> : <Asleep id={origin} />}
            </View>

            <LoreScroll heard={heard} />
            <MemoryScroll seen={memories} />
            <Restart started={position !== null || discovered.length > 0} />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Play({ started, onPlay }: { started: boolean; onPlay: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens the game. Turn your phone sideways."
      onPress={() => {
        haptics.tap();
        onPlay();
      }}
      style={({ pressed }) => [styles.play, pressed && { opacity: 0.8 }]}>
      <Text style={styles.playLabel}>{started ? '▶︎  JUMP BACK IN' : '▶︎  PLAY'}</Text>
      <Text style={styles.playHint}>Turn your phone sideways</Text>
    </Pressable>
  );
}

/** Before the first habit: the door stays shut, and the hero you chose sleeps. */
function Asleep({ id }: { id: CharacterId }) {
  const { name } = COMPANIONS[id];
  return (
    <View style={styles.asleep} accessible>
      <Text style={styles.asleepLabel}>{name.toUpperCase()} IS ASLEEP</Text>
      <Text style={styles.how}>Finish your first habit to wake {name}. Then you can play.</Text>
    </View>
  );
}

/** Start the Other World over, after an "are you sure". Habits, levels and the collection stay as they are. */
function Restart({ started }: { started: boolean }) {
  if (!started) return null;
  const confirm = () => {
    haptics.tap();
    showDialog(
      'Restart the Other World?',
      "You'll start again on the Archive floor. Every place found, story choice, Heart Piece and lore page in the Other World is forgotten. Your habits, levels and heroes stay. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restart',
          style: 'destructive',
          onPress: () => {
            useWorldStore.getState().restart();
            haptics.select();
          },
        },
      ],
    );
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Asks first. Starts the Other World from the beginning."
      onPress={confirm}
      style={({ pressed }) => [styles.restart, pressed && { opacity: 0.7 }]}>
      <Text style={styles.restartLabel}>RESTART THE OTHER WORLD</Text>
      <Text style={styles.how}>Start the story again from the Archive floor. Your habits stay.</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: 120 },
  play: {
    borderWidth: 3,
    borderColor: colors.frame,
    backgroundColor: colors.accent,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    gap: 2,
  },
  playLabel: { color: colors.background, fontFamily: fonts.bold, fontSize: 26, letterSpacing: 1 },
  playHint: { color: colors.background, fontFamily: fonts.regular, fontSize: 13, opacity: 0.8 },
  how: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  asleep: { ...windowStyle, padding: spacing.lg, gap: 4, alignItems: 'center' },
  asleepLabel: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 22, letterSpacing: 1 },
  restart: { ...windowStyle, padding: spacing.lg, gap: 4, alignItems: 'center' },
  restartLabel: { color: colors.danger, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 1 },
});
