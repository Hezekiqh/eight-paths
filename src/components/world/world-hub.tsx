import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Segmented } from '@/components/segmented';
import { SettingsPanel } from '@/components/settings-panel';
import { isObjectiveDone } from '@/game';
import { haptics } from '@/haptics';
import { useGameStore } from '@/store';
import { useObjectives, useToday, useXpTotals } from '@/store/hooks';
import { COMPANIONS } from '@/story/companions';
import { classColors, colors, fonts, spacing, windowStyle } from '@/theme';
import { worldHero } from '@/world/hero';
import { MAPS, type MapId } from '@/world/maps';
import { EXITS, FINAL_GOAL, describeRequirement, howToProgress, standing } from '@/world/progress';
import { ROADMAP } from '@/world/roadmap';
import { useWorldStore } from '@/world/store';

const TABS = [
  { value: 'world', label: 'World' },
  { value: 'settings', label: 'Settings' },
] as const;
type Tab = (typeof TABS)[number]['value'];

/** Lore entries shown before "Show all". */
const LORE_PREVIEW = 4;

/**
 * What the World tab opens on: an upright pause menu. The World tab jumps
 * back into the sideways game and shows what your habits need to do next,
 * what people have told you, and what's still being built. The Settings tab
 * holds every setting in the app.
 */
export function WorldHub({ onPlay }: { onPlay: () => void }) {
  const position = useWorldStore((s) => s.position);
  const discovered = useWorldStore((s) => s.discovered);
  const heard = useWorldStore((s) => s.heard);
  const picked = useWorldStore((s) => s.hero);
  const party = useGameStore((s) => s.party);
  const classDimension = useGameStore((s) => s.player?.classDimension ?? 'physical');
  const walker = worldHero(picked, party, classDimension);
  const heroName = walker === 'keeper' ? 'The Keeper' : COMPANIONS[walker].name;
  const place = MAPS[position?.map ?? 'archive'].name;
  // `/world?tab=settings` opens straight on Settings (the Character tab links here).
  const params = useLocalSearchParams<{ tab?: string }>();
  const asked: Tab = params.tab === 'settings' ? 'settings' : 'world';
  const [tab, setTab] = useState<Tab>(asked);
  const [lastAsked, setLastAsked] = useState(asked);
  if (asked !== lastAsked) {
    setLastAsked(asked);
    setTab(asked);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>THE WORLD</Text>
        <Text style={styles.place}>
          {heroName} · {place}
        </Text>
        <Segmented options={TABS} value={tab} onChange={setTab} color={colors.accent} />

        {tab === 'settings' ? (
          <SettingsPanel />
        ) : (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityHint="Opens the game. Turn your phone sideways."
              onPress={() => {
                haptics.tap();
                onPlay();
              }}
              style={({ pressed }) => [styles.play, pressed && { opacity: 0.8 }]}>
              <Text style={styles.playLabel}>{position ? '▶︎  JUMP BACK IN' : '▶︎  STEP OUTSIDE'}</Text>
              <Text style={styles.playHint}>Turn your phone sideways</Text>
            </Pressable>

            <Objectives discovered={discovered} />
            <Lore heard={heard} />
            <ComingSoon />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Objectives({ discovered }: { discovered: MapId[] }) {
  const today = useToday();
  const xp = useXpTotals();
  const objectives = useObjectives(today);
  const all = [...objectives.daily, ...objectives.weekly];
  const done = all.filter(isObjectiveDone).length;

  // Every way onward from anywhere you've been, still shut or still being built.
  const been = discovered.length > 0 ? discovered : (['archive'] as MapId[]);
  const exits = EXITS.filter((e) => been.includes(e.from) && !e.back)
    .map((exit) => ({ exit, s: standing(exit.needs, xp) }))
    .filter(({ exit, s }) => !s.met || exit.to === null);

  const final = standing(FINAL_GOAL, xp);

  return (
    <View style={styles.window}>
      <Text style={styles.section}>OBJECTIVES</Text>

      <Goal
        label="Season 1"
        need={
          final.met ? `${describeRequirement(FINAL_GOAL)} ✓` : `${describeRequirement(FINAL_GOAL)} · Lv ${final.have}`
        }
        met={final.met}
        fraction={final.fraction}
        how={
          final.met
            ? "You've reached the end of Season 1. The next kingdom arrives in a coming update."
            : `Season 1 ends at Overall Lv ${FINAL_GOAL.level}. ${howToProgress(final)}`
        }
      />

      {exits.map(({ exit, s }) => (
        <Goal
          key={exit.id}
          label={exit.label}
          need={s.met ? `${describeRequirement(exit.needs)} ✓` : `${describeRequirement(exit.needs)} · Lv ${s.have}`}
          met={s.met}
          fraction={s.fraction}
          how={s.met ? "You're strong enough. What lies beyond is still being built." : howToProgress(s)}
        />
      ))}

      <Pressable accessibilityRole="button" onPress={() => router.push('/quest-board')} style={styles.goal}>
        {({ pressed }) => (
          <>
            <View style={styles.row}>
              <Text style={[styles.label, pressed && styles.met]}>
                Quest board · {done} of {all.length} done
              </Text>
              <Text style={styles.need}>OPEN ›</Text>
            </View>
            <Text style={styles.how}>
              {objectives.unclaimed > 0
                ? `${objectives.unclaimed} reward${objectives.unclaimed === 1 ? '' : 's'} waiting to be claimed.`
                : 'Your habits fill these in as you go.'}
            </Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function Goal(props: { label: string; need: string; met: boolean; fraction: number; how: string }) {
  return (
    <View style={styles.goal} accessible>
      <View style={styles.row}>
        <Text style={styles.label}>{props.label}</Text>
        <Text style={[styles.need, props.met && styles.met]}>{props.need}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${Math.round(props.fraction * 100)}%` }, props.met && styles.fillMet]} />
      </View>
      <Text style={styles.how}>{props.how}</Text>
    </View>
  );
}

function Lore({ heard }: { heard: ReturnType<typeof useWorldStore.getState>['heard'] }) {
  const [all, setAll] = useState(false);
  const newest = [...heard].reverse();
  const shown = all ? newest : newest.slice(0, LORE_PREVIEW);
  return (
    <View style={styles.window}>
      <Text style={styles.section}>LORE · {heard.length} HEARD</Text>
      {heard.length === 0 && (
        <Text style={styles.how}>
          Talk to people in the World and ask them things. What they tell you is written down here.
        </Text>
      )}
      {shown.map((entry) => (
        <View key={entry.id} style={styles.lore}>
          <Text style={styles.speaker}>{entry.speaker}</Text>
          <Text style={styles.ask}>“{entry.ask}”</Text>
          <Text style={styles.answer}>{entry.answer.join(' ')}</Text>
        </View>
      ))}
      {newest.length > LORE_PREVIEW && (
        <Pressable accessibilityRole="button" onPress={() => setAll((a) => !a)} hitSlop={8}>
          <Text style={styles.need}>{all ? 'SHOW LESS' : `SHOW ALL ${newest.length} ›`}</Text>
        </Pressable>
      )}
    </View>
  );
}

function ComingSoon() {
  return (
    <View style={styles.window}>
      <Text style={styles.section}>COMING SOON</Text>
      <Text style={styles.how}>The World is still being built. Here&apos;s what&apos;s next, in order.</Text>
      {ROADMAP.map((item, i) => (
        <View key={item.title} style={styles.soon}>
          <Text style={styles.soonNumber}>{i + 1}</Text>
          <View style={styles.soonText}>
            <Text style={styles.label}>{item.title}</Text>
            <Text style={styles.how}>{item.body}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: 120 },
  title: { color: colors.accent, fontFamily: fonts.bold, fontSize: 36, letterSpacing: 2 },
  place: { color: colors.textMuted, fontFamily: fonts.dialogue, fontSize: 16, marginTop: -spacing.md },
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
  window: { ...windowStyle, padding: spacing.lg, gap: spacing.sm },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 1 },
  goal: { gap: 4, marginBottom: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  label: { color: colors.text, fontFamily: fonts.dialogue, fontSize: 16, flexShrink: 1 },
  need: { color: colors.accent, fontFamily: fonts.bold, fontSize: 16 },
  met: { color: classColors.environmental },
  track: { height: 6, backgroundColor: colors.border },
  fill: { height: 6, backgroundColor: colors.accent },
  fillMet: { backgroundColor: classColors.environmental },
  how: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  lore: {
    gap: 2,
    paddingVertical: spacing.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  speaker: { color: colors.accent, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1 },
  ask: { color: colors.textMuted, fontFamily: fonts.dialogue, fontSize: 14 },
  answer: { color: colors.text, fontFamily: fonts.dialogue, fontSize: 15, lineHeight: 22 },
  soon: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.xs },
  soonNumber: { color: colors.accent, fontFamily: fonts.bold, fontSize: 20, width: 20 },
  soonText: { flex: 1, gap: 2 },
});
