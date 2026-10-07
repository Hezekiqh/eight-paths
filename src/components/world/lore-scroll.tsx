import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/haptics';
import { FRAME, colors, fonts, spacing } from '@/theme';
import { TALKED, type LoreEntry } from '@/world/lore';
import { TALE, taleProgress, toldBy, type Chapter } from '@/world/tale';

/**
 * The World menu's lore: the story of the Kingdom on a scroll. Tap the rolled
 * top to open or close it. Pieces nobody has told you yet are left blank, in
 * their place, so the gaps show where someone is still to be found.
 */
export function LoreScroll({ heard }: { heard: LoreEntry[] }) {
  const [open, setOpen] = useState(true);
  const { found, total } = taleProgress(TALE, heard);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Scroll 1, the Lore of the Berserker Kingdom, ${found} of ${total} found`}
        onPress={() => {
          haptics.tap();
          setOpen((o) => !o);
        }}>
        {({ pressed }) => (
          <Roll style={pressed && { opacity: 0.8 }}>
            <Text style={styles.number}>1</Text>
            <Text style={styles.caption}>The Berserker Kingdom Lore</Text>
            <Text style={styles.count}>
              {found} of {total} found
            </Text>
            <Text style={styles.toggle}>{open ? 'roll up ▴' : 'unroll ▾'}</Text>
          </Roll>
        )}
      </Pressable>
      {open && (
        <>
          <View style={styles.sheet}>
            <Text style={styles.how}>
              {found === 0
                ? 'Talking to characters in the Other World unlocks pieces of the Lore and Memories. What you learn is logged here. Talk to everyone!'
                : 'Where the page is blank, someone has yet to tell you. Tap a passage to see who told you.'}
            </Text>
            {TALE.map((chapter) => (
              <TaleChapter key={chapter.title} chapter={chapter} heard={heard} />
            ))}
          </View>
          <Roll small />
        </>
      )}
    </View>
  );
}

/** A rolled end of the scroll: a parchment band between two wooden rods. */
export function Roll({ children, small, style }: { children?: ReactNode; small?: boolean; style?: object | false }) {
  return (
    <View style={[styles.roll, style]}>
      <View style={[styles.rod, small && styles.rodSmall]} />
      <View style={[styles.band, small && styles.bandSmall]}>{children}</View>
      <View style={[styles.rod, small && styles.rodSmall]} />
    </View>
  );
}

function TaleChapter({ chapter, heard }: { chapter: Chapter; heard: LoreEntry[] }) {
  const [picked, setPicked] = useState<number | null>(null);
  const { found, total } = taleProgress([chapter], heard);
  const who = picked === null ? undefined : toldBy(chapter.blocks[picked], heard);
  return (
    <View style={styles.chapter}>
      <View style={styles.row}>
        <Text style={styles.title}>{found === 0 ? '? ? ?' : chapter.title}</Text>
        <Text style={styles.count}>{found === total ? '✓' : `${found}/${total}`}</Text>
      </View>
      {/* Nothing found yet: just the title, so an untouched chapter doesn't fill the scroll with blank page. */}
      {/* One paragraph: what you've heard reads on, and what you haven't is a blank of its own size. */}
      {found > 0 && (
        <Text style={styles.story}>
          {chapter.blocks.map((block, i) => {
            const text = i < chapter.blocks.length - 1 ? `${block.text} ` : block.text;
            return toldBy(block, heard) ? (
              <Text
                key={i}
                suppressHighlighting
                onPress={() => {
                  haptics.select();
                  setPicked((p) => (p === i ? null : i));
                }}
                style={picked === i && styles.picked}>
                {text}
              </Text>
            ) : (
              <Text key={i} accessibilityLabel="Blank" style={styles.hidden}>
                {text}
              </Text>
            );
          })}
        </Text>
      )}
      {who && (
        <Text style={styles.who}>
          {who.ask === TALKED
            ? `${who.speaker} told you this.`
            : `${who.speaker} told you this, when you asked “${who.ask}”`}
        </Text>
      )}
    </View>
  );
}

const ROD = 14;

const styles = StyleSheet.create({
  roll: { flexDirection: 'row', alignItems: 'stretch' },
  rod: {
    width: ROD,
    marginVertical: -6,
    backgroundColor: colors.frame,
    borderRadius: 4,
  },
  rodSmall: { marginVertical: -4 },
  band: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.cardRaised,
    borderTopWidth: FRAME,
    borderBottomWidth: FRAME,
    borderColor: colors.frame,
  },
  bandSmall: { paddingVertical: 6 },
  number: { color: colors.accent, fontFamily: fonts.medieval, fontSize: 40, lineHeight: 46 },
  caption: { color: colors.text, fontFamily: fonts.medieval, fontSize: 18 },
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
  chapter: { gap: spacing.xs },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  title: { color: colors.accent, fontFamily: fonts.medieval, fontSize: 20, flexShrink: 1 },
  count: { color: colors.textMuted, fontFamily: fonts.medieval, fontSize: 14 },
  story: { color: colors.text, fontFamily: fonts.ancient, fontSize: 17, lineHeight: 24 },
  hidden: { color: 'transparent' },
  picked: { color: colors.accent },
  who: { color: colors.textMuted, fontFamily: fonts.ancientItalic, fontSize: 14 },
});
