import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { HeroSprite } from '@/components/avatar/hero-sprite';
import { DEFAULT_LOOK, MOOD_LABELS, todaysMoods, type ClassInfo, type Mood } from '@/game';
import { haptics } from '@/haptics';
import { useGameStore } from '@/store';
import { usePlayer, useTodayQuests } from '@/store/hooks';
import { useSession } from '@/store/session';
import { colors, fonts, spacing } from '@/theme';

/** What each mood says about the day, under the hero. */
const MOOD_LINES: Record<Mood, string> = {
  sleepy: 'Fast asleep. Tomorrow is a new road.',
  waking: 'Stretching off the night.',
  ready: 'Ready for whatever the day brings.',
  winding: 'Winding down with something warm.',
  champion: 'Every quest today is done!',
  strong: 'A Physical habit done: feeling strong.',
  rich: 'A Financial habit done: coins in hand.',
  smart: 'An Intellectual habit done: a bright idea.',
  calm: 'A Spiritual habit done: a quiet glow.',
  peaceful: 'An Emotional habit done: a full heart.',
  cheerful: 'A Social habit done: waving to friends.',
  busy: 'An Occupational habit done: hard at work.',
  outdoorsy: 'An Environmental habit done: something growing.',
  victory: 'You leveled up!',
  anxious: 'Falling behind today. One quest would help.',
  confident: 'Ahead of the day, and knows it.',
  overdrive: 'WAY ahead of the day. A TON of energy.',
  cool: 'A habit an hour. Too cool.',
};

/** The clock, ticking often enough for a level-up's victory to end on time and the day's pace to move. */
const useNow = () => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(id);
  }, []);
  return now;
};

type Props = { today: string; classInfo: ClassInfo; width: number; height: number };

/**
 * Your own hero on Today: they act out the habits you've done (strong after
 * Physical, smart after Intellectual, ...) and otherwise follow the clock.
 * Tapping a mood earned today plays it again.
 */
export function CharacterPage({ today, classInfo, width, height }: Props) {
  const player = usePlayer();
  const completions = useGameStore((s) => s.completions);
  const quests = useTodayQuests(today);
  const victory = useSession((s) => s.victory);
  const tick = useNow();
  // A victory resets the clock at once, so the dance starts as the level-up lands.
  const now = Math.max(tick, victory?.at ?? 0);
  const date = new Date(now);
  const { current, earned } = todaysMoods({
    completions,
    today,
    minutes: date.getHours() * 60 + date.getMinutes(),
    done: quests.filter((q) => q.done).length,
    total: quests.length,
    victoryAt: victory?.date === today ? victory.at : null,
    now,
  });
  const [picked, setPicked] = useState<Mood | null>(null);
  const mood = picked && earned.includes(picked) ? picked : current;
  const look = player?.look ?? DEFAULT_LOOK;
  const made = !!player?.look;

  return (
    <View style={[styles.page, { width, height }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={made ? `You, ${MOOD_LABELS[mood]}. Edit yourself` : 'Create yourself'}
        onPress={() => {
          haptics.tap();
          router.push('/character-creator');
        }}
        style={({ pressed }) => [styles.stage, pressed && { opacity: 0.8 }]}>
        <View style={[styles.ground, { backgroundColor: classInfo.color }]} />
        <HeroSprite look={look} mood={mood} scale={5} />
      </Pressable>
      <Text style={[styles.mood, { color: classInfo.color }]}>{MOOD_LABELS[mood].toUpperCase()}</Text>
      <Text style={styles.line}>{MOOD_LINES[mood]}</Text>
      {earned.length > 1 && (
        <View style={styles.chips}>
          {earned.map((m) => {
            const on = m === mood;
            return (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  haptics.select();
                  setPicked(m);
                }}
                style={[styles.chip, on && { borderColor: classInfo.color }]}>
                <Text style={[styles.chipText, on && { color: classInfo.color }]}>{MOOD_LABELS[m]}</Text>
              </Pressable>
            );
          })}
        </View>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptics.tap();
          router.push('/character-creator');
        }}
        hitSlop={8}>
        <Text style={[styles.edit, { color: classInfo.color }]}>{made ? 'Edit yourself' : 'Create yourself'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
  stage: { alignItems: 'center', justifyContent: 'flex-end', height: 210, width: 220, overflow: 'visible' },
  ground: { position: 'absolute', bottom: 6, width: 150, height: 10, opacity: 0.25, borderRadius: 2 },
  mood: { fontFamily: fonts.bold, fontSize: 24, letterSpacing: 1.2, marginTop: spacing.xs },
  line: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xs, marginTop: spacing.xs },
  chip: { borderWidth: 2, borderColor: colors.border, paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: 2 },
  chipText: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 15 },
  edit: { fontFamily: fonts.bold, fontSize: 17, marginTop: spacing.sm },
});
