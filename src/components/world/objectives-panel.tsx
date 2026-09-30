import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useWorldProgress } from '@/world/use-progress';
import { isObjectiveDone } from '@/game';
import { useObjectives, useToday } from '@/store/hooks';
import { classColors, colors, fonts, spacing } from '@/theme';
import type { MapId } from '@/world/maps';
import { EXITS, describeRequirement, howToProgress, standing } from '@/world/progress';

type Props = {
  map: MapId;
  onOpenBoard: () => void;
};

/**
 * The pause screen's answer to "what now?": what each way out of this area
 * needs, in real habits, and how the day's objectives are going.
 */
export function ObjectivesPanel({ map, onOpenBoard }: Props) {
  const today = useToday();
  const xp = useWorldProgress();
  const objectives = useObjectives(today);
  const all = [...objectives.daily, ...objectives.weekly];
  const done = all.filter(isObjectiveDone).length;
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
                {describeRequirement(exit.needs)}
                {s.met ? ' ✓' : ` · you're Lv ${s.have}`}
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
});
