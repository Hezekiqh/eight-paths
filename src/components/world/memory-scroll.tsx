import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Roll } from '@/components/world/lore-scroll';
import { haptics } from '@/haptics';
import { FRAME, colors, fonts, spacing } from '@/theme';
import { MEMORIES, SEASONS, type Memory } from '@/world/memories';
import { requirementLabel } from '@/world/progress';
import { useWorldProgress } from '@/world/use-progress';

/**
 * The World menu's second scroll: the hidden memories you've found, to read
 * again. One a season; those still hidden say what your habits need to reach
 * to remember them, but never where they are.
 */
export function MemoryScroll({ seen }: { seen: string[] }) {
  const [open, setOpen] = useState(false);
  const xp = useWorldProgress();
  const found = MEMORIES.filter((m) => seen.includes(m.id)).length;
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Scroll 2, memories, ${found} of ${SEASONS} found`}
        onPress={() => {
          haptics.tap();
          setOpen((o) => !o);
        }}>
        {({ pressed }) => (
          <Roll style={pressed && { opacity: 0.8 }}>
            <Text style={styles.number}>2</Text>
            <Text style={styles.caption}>
              Memories · {found} of {SEASONS}
            </Text>
            <Text style={styles.toggle}>{open ? 'roll up ▴' : 'unroll ▾'}</Text>
          </Roll>
        )}
      </Pressable>
      {open && (
        <>
          <View style={styles.sheet}>
            <Text style={styles.how}>
              Memories hide in quiet corners of the Other World, one each season. They only shimmer once your habits
              are strong enough to remember them.
            </Text>
            {Array.from({ length: SEASONS }, (_, i) => {
              const memory = MEMORIES.find((m) => m.season === i + 1);
              if (memory && seen.includes(memory.id)) return <Remembered key={i} memory={memory} />;
              return (
                <View key={i} style={styles.entry}>
                  <Text style={styles.title}>? ? ?</Text>
                  <Text style={styles.hint}>
                    {memory
                      ? `Season ${memory.season} · ${requirementLabel(memory.needs, xp)}`
                      : `Season ${i + 1} · not yet in the World`}
                  </Text>
                </View>
              );
            })}
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
      <Text style={styles.title}>{memory.title}</Text>
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
  caption: { color: colors.text, fontFamily: fonts.medieval, fontSize: 16 },
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
