import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Roll } from '@/components/world/lore-scroll';
import { haptics } from '@/haptics';
import { COMPANIONS } from '@/story/companions';
import { FRAME, colors, fonts, spacing } from '@/theme';
import { MEMORIES, PER_SEASON, SEASONS, ownMemories, seasonMemories, type Memory } from '@/world/memories';
import { requirementLabel } from '@/world/progress';
import { useWorldProgress } from '@/world/use-progress';

/**
 * The World menu's second scroll: the hidden memories you've found, to read
 * again. Four a season; those still hidden say what your habits need to reach
 * to remember them, but never where they are.
 */
export function MemoryScroll({ seen }: { seen: string[] }) {
  const [open, setOpen] = useState(false);
  const xp = useWorldProgress();
  const found = MEMORIES.filter((m) => !m.whose && seen.includes(m.id)).length;
  // someone's own (Brannoc's): listed only once seen, never hinted at before
  const theirs = ownMemories().filter((m) => seen.includes(m.id));
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Scroll 2, memories, ${found} of ${SEASONS * PER_SEASON} found`}
        onPress={() => {
          haptics.tap();
          setOpen((o) => !o);
        }}>
        {({ pressed }) => (
          <Roll style={pressed && { opacity: 0.8 }}>
            <Text style={styles.number}>2</Text>
            <Text style={styles.caption}>Memories</Text>
            <Text style={styles.count}>
              {found} of {SEASONS * PER_SEASON} found
            </Text>
            <Text style={styles.toggle}>{open ? 'roll up ▴' : 'unroll ▾'}</Text>
          </Roll>
        )}
      </Pressable>
      {open && (
        <>
          <View style={styles.sheet}>
            <Text style={styles.how}>
              Memories lie hidden in the quiet corners of the Other World, four in every season. Only when your habits
              grow strong enough to remember them do they shimmer into sight.
            </Text>
            {Array.from({ length: SEASONS * PER_SEASON }, (_, i) => {
              const season = Math.floor(i / PER_SEASON) + 1;
              const memory = seasonMemories(season)[i % PER_SEASON];
              if (memory && seen.includes(memory.id)) return <Remembered key={i} memory={memory} />;
              return (
                <View key={i} style={styles.entry}>
                  <Text style={styles.title}>? ? ?</Text>
                  <Text style={styles.hint}>
                    {memory
                      ? `Season ${memory.season} · ${requirementLabel(memory.needs, xp)}`
                      : `Season ${season} · not yet in the World`}
                  </Text>
                </View>
              );
            })}
            {theirs.map((m) => (
              <Remembered key={m.id} memory={m} />
            ))}
          </View>
          <Roll small />
        </>
      )}
    </View>
  );
}

/** A memory you've seen: its title, then the flashback, speech with its speaker picked out. */
function Remembered({ memory }: { memory: Memory }) {
  return (
    <View style={styles.entry}>
      <Text style={styles.title}>
        {memory.whose ? `${COMPANIONS[memory.whose].name}'s: ${memory.title}` : memory.title}
      </Text>
      {memory.lines.map((line, i) => {
        const speech = /^([A-Z][A-Z' ]+): (.*)$/.exec(line);
        return speech ? (
          <Text key={i} style={styles.story}>
            <Text style={styles.speaker}>{speech[1]}: </Text>
            {speech[2]}
          </Text>
        ) : (
          <Text key={i} style={[styles.story, styles.narration]}>
            {line}
          </Text>
        );
      })}
    </View>
  );
}

const ROD = 14;

const styles = StyleSheet.create({
  number: { color: colors.accent, fontFamily: fonts.medieval, fontSize: 40, lineHeight: 46 },
  caption: { color: colors.text, fontFamily: fonts.medieval, fontSize: 18 },
  count: { color: colors.textMuted, fontFamily: fonts.medieval, fontSize: 14 },
  toggle: { color: colors.textMuted, fontFamily: fonts.ancientItalic, fontSize: 13, marginTop: 2 },
  sheet: {
    marginHorizontal: ROD / 2,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.card,
    borderLeftWidth: FRAME,
    borderRightWidth: FRAME,
    borderColor: colors.border,
  },
  how: { color: colors.textMuted, fontFamily: fonts.ancientItalic, fontSize: 15, lineHeight: 21 },
  entry: { gap: spacing.xs },
  title: { color: colors.accent, fontFamily: fonts.medieval, fontSize: 20 },
  hint: { color: colors.textMuted, fontFamily: fonts.ancientItalic, fontSize: 14 },
  story: { color: colors.text, fontFamily: fonts.ancient, fontSize: 17, lineHeight: 24 },
  narration: { fontFamily: fonts.ancientItalic, color: colors.textMuted },
  speaker: { color: colors.accent },
});
