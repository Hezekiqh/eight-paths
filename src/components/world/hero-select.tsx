import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { playSound } from '@/audio';
import { CHARACTER_ART } from '@/art/sprites';
import { Button } from '@/components/button';
import { PixelSprite } from '@/components/pixel-sprite';
import { TypewriterText } from '@/components/typewriter-text';
import { Portrait } from '@/components/world/portrait';
import { CLASSES } from '@/game';
import { haptics } from '@/haptics';
import { COMPANIONS, STARTERS, type CharacterId } from '@/story/companions';
import { colors, fonts, spacing, windowStyle } from '@/theme';

const KEEPER_LINE =
  "Oh good, you're finally awake. I was beginning to forget what you look like.";

/**
 * The first step into the Other World, like Pokémon's "boy or girl": the
 * Keeper asks which hero you look like, of the four Season 1 starters (the
 * other four of the Original 8 are met on the road). Picking one asks
 * "Are you sure?"; Yes hands the choice up (the screen flashes there).
 */
export function HeroSelect({ onChoose }: { onChoose: (id: CharacterId) => void }) {
  const [asked, setAsked] = useState(false);
  const [picked, setPicked] = useState<CharacterId | null>(null);
  const pick = (id: CharacterId) => {
    playSound('select');
    haptics.select();
    setPicked(id);
  };
  const chosen = picked ? COMPANIONS[picked] : null;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.speech}>
        <Portrait sprite="keeper" />
        <View style={{ flex: 1 }}>
          <Text style={styles.speaker}>THE KEEPER</Text>
          <TypewriterText text={KEEPER_LINE} style={styles.line} onDone={() => setAsked(true)} />
        </View>
      </View>
      <View style={[styles.grid, !asked && styles.waiting]} pointerEvents={asked && !picked ? 'auto' : 'none'}>
        {STARTERS.map((id) => {
          const c = COMPANIONS[id];
          const art = CHARACTER_ART[id];
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={`${c.name}, the ${CLASSES[c.dimension].className}`}
              onPress={() => pick(id)}
              style={({ pressed }) => [styles.hero, pressed && { opacity: 0.6 }]}>
              {art && <PixelSprite sheet={art.idle} scale={2} />}
              <Text style={styles.name}>{c.name}</Text>
              <Text style={[styles.className, { color: CLASSES[c.dimension].color }]}>
                {CLASSES[c.dimension].className}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {chosen && (
        <View style={styles.scrim}>
          <View style={styles.confirm}>
            {CHARACTER_ART[chosen.id] && <PixelSprite sheet={CHARACTER_ART[chosen.id]!.idle} scale={2} />}
            <Text style={styles.ask}>Are you sure?</Text>
            <Text style={styles.detail}>
              You look like {chosen.name}, the {CLASSES[chosen.dimension].className}.
            </Text>
            <View style={styles.buttons}>
              <View style={{ flex: 1 }}>
                <Button title="No" variant="ghost" onPress={() => setPicked(null)} />
              </View>
              <View style={{ flex: 1 }}>
                <Button title="Yes" color={CLASSES[chosen.dimension].color} onPress={() => onChoose(chosen.id)} />
              </View>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.lg },
  speech: { ...windowStyle, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  speaker: { color: colors.accent, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 1 },
  line: { color: colors.text, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', rowGap: spacing.lg },
  waiting: { opacity: 0.35 },
  hero: { width: '50%', alignItems: 'center', gap: 2 },
  name: { color: colors.text, fontFamily: fonts.bold, fontSize: 18 },
  className: { fontFamily: fonts.bold, fontSize: 14, letterSpacing: 1 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  confirm: { ...windowStyle, alignSelf: 'stretch', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  ask: { color: colors.text, fontFamily: fonts.bold, fontSize: 28 },
  detail: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, textAlign: 'center' },
  buttons: { flexDirection: 'row', gap: spacing.md, alignSelf: 'stretch' },
});
