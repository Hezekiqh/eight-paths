import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useWorldProgress } from '@/world/use-progress';
import { isObjectiveDone } from '@/game';
import { useGameStore } from '@/store';
import { useCollection, useObjectives, useToday } from '@/store/hooks';
import type { HeroId } from '@/world/hero';
import { openNotices } from '@/world/notices';
import { useWorldStore } from '@/world/store';
import { classColors, colors, fonts, spacing } from '@/theme';
import type { MapId } from '@/world/maps';
import { EXITS, howToProgress, requirementLabel, standing } from '@/world/progress';

type Props = {
  map: MapId;
  /** Who's walking now: a lost fight's hint is about them. */
  hero: HeroId;
  onOpenBoard: () => void;
};

/**
 * The pause screen's answer to "what now?": what each way out of this area
 * needs, in real habits, everything the player has run into and couldn't do
 * yet (with who can), and how the day's objectives are going.
 */
export function ObjectivesPanel({ map, hero, onOpenBoard }: Props) {
  const today = useToday();
  const xp = useWorldProgress();
  const objectives = useObjectives(today);
  const all = [...objectives.daily, ...objectives.weekly];
  const done = all.filter(isObjectiveDone).length;
  const noticed = useWorldStore((s) => s.noticed);
  const party = useGameStore((s) => s.party);
  const collection = useCollection();
  // This area's ways on are listed above; everything else found stays here until it's done.
  const found = useMemo(() => {
    const levelOf = (id: HeroId) => collection.entries.find((e) => e.companion.id === id)?.progress.level ?? 1;
    return openNotices(noticed, { xp, party, levelOf, hero }).filter(
      (n) => !(n.id.startsWith('exit:') && n.map === map),
    );
  }, [noticed, xp, party, collection, hero, map]);
  // The road onward first, then any hard-to-reach places.
  const exits = EXITS.filter((e) => e.from === map && !e.back).sort(
    (a, b) => Number(b.needs.kind === 'overall') - Number(a.needs.kind === 'overall'),
  );

  return (
    <View style={styles.panel}>
      <Text style={styles.section}>TO GO ON</Text>
      {exits.map((exit) => {
        const s = standing(exit.needs, xp);
        const waiting = s.met && exit.to === null;
        return (
          <View key={exit.id} style={styles.item} accessible>
            <View style={styles.row}>
              <Text style={styles.label}>{exit.label}</Text>
              <Text style={[styles.need, s.met && styles.met]}>
                {requirementLabel(exit.needs, xp)}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(s.fraction * 100)}%` }, s.met && styles.fillMet]} />
            </View>
            <Text style={styles.how}>
              {waiting
                ? 'The way is sealed. You have walked as far as the Other World goes.'
                : s.met
                  ? 'The way is open. Walk up to it and press A.'
                  : howToProgress(s)}
            </Text>
          </View>
        );
      })}

      {found.length > 0 && (
        <>
          <Text style={styles.section}>FOUND ON YOUR TRAVELS</Text>
          {found.map((n) => (
            <View key={n.id} style={styles.item} accessible>
              <View style={styles.row}>
                <Text style={styles.label}>{n.title}</Text>
                <Text style={styles.place}>{n.place}</Text>
              </View>
              <Text style={styles.how}>{n.hint}</Text>
            </View>
          ))}
        </>
      )}

      <Text style={styles.section}>QUEST BOARD</Text>
      <Pressable accessibilityRole="button" onPress={onOpenBoard} style={styles.item}>
        {({ pressed }) => (
          <>
            <View style={styles.row}>
              <Text style={[styles.label, pressed && styles.met]}>
                {done} of {all.length} objectives done
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

const styles = StyleSheet.create({
  panel: { gap: spacing.xs },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 1 },
  item: { gap: 4, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  label: { color: colors.text, fontFamily: fonts.dialogue, fontSize: 16, flexShrink: 1 },
  need: { color: colors.accent, fontFamily: fonts.bold, fontSize: 16 },
  met: { color: classColors.environmental },
  track: { height: 6, backgroundColor: colors.border },
  fill: { height: 6, backgroundColor: colors.accent },
  fillMet: { backgroundColor: classColors.environmental },
  how: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  place: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
});
