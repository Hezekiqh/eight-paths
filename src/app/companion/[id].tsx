import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { haptics } from '@/haptics';
import { Button } from '@/components/button';
import { CharacterPortrait } from '@/components/character-portrait';
import { NoteBox } from '@/components/note-box';
import { TypewriterText } from '@/components/typewriter-text';
import { XpBar } from '@/components/xp-bar';
import { CLASSES } from '@/game';
import { useGameStore } from '@/store';
import { useCollection } from '@/store/hooks';
import { KIND_LABEL, REALMS, formatNumber, isCharacterId } from '@/story/companions';
import { colors, fonts, radius, spacing } from '@/theme';
import { useSocial, type CharacterStat } from '@/social/store';

/** "Woken by 3% of players · first: @moss_fan", or a note that no one has yet. */
function rarityLine(stat: CharacterStat | undefined) {
  if (!stat || stat.wokenBy === 0) return 'No one has woken them yet.';
  const pct = Math.max(1, Math.round((stat.wokenBy / Math.max(1, stat.players)) * 100));
  return `Woken by ${pct}% of players${stat.firstUsername ? ` · first: @${stat.firstUsername}` : ''}`;
}

export default function CompanionSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const collection = useCollection();
  const swapCharacter = useGameStore((s) => s.swapCharacter);
  const [bioDone, setBioDone] = useState(false);
  const [skipped, setSkipped] = useState(false);
  // How rare they are among all players, once signed in to the Second 100.
  const stats = useSocial((s) => s.stats);
  if (!isCharacterId(id)) return null;

  const entry = collection.entries.find((e) => e.companion.id === id)!;
  const { companion, unlocked, inParty, progress, pathLevel } = entry;
  const info = CLASSES[companion.dimension];
  const current = collection.party[companion.dimension].companion;

  const swapIn = () => {
    if (swapCharacter(companion.id)) haptics.success();
  };

  return (
    <View style={styles.sheet}>
      {/* Rarity, card-style: big white stars in the top-right corner. */}
      <View
        style={styles.rarity}
        accessible
        accessibilityLabel={`${companion.rarity} star${companion.rarity === 1 ? '' : 's'}`}>
        {Array.from({ length: companion.rarity }, (_, i) => (
          <Text key={i} style={styles.rarityStar}>
            ★
          </Text>
        ))}
      </View>
      <View style={styles.header}>
        <View style={[styles.portrait, { borderColor: unlocked ? info.color : colors.border }]}>
          <CharacterPortrait companion={companion} locked={!unlocked} scale={2} />
        </View>
        <View style={styles.titles}>
          <Text style={[styles.number, { color: unlocked ? info.color : colors.textFaint }]}>
            {formatNumber(companion.number)} · {KIND_LABEL[companion.kind]}
          </Text>
          <Text style={styles.name}>{companion.name}</Text>
          {unlocked && companion.fullName && <Text style={styles.fullName}>{companion.fullName}</Text>}
          <Text style={[styles.className, { color: info.color }]}>
            {info.className} · {info.dimensionLabel} Path
          </Text>
          <Text style={styles.realm}>
            {REALMS[companion.dimension]} · {companion.alignment}
          </Text>
          {Object.keys(stats).length > 0 && <Text style={styles.realm}>{rarityLine(stats[companion.id])}</Text>}
        </View>
      </View>

      {unlocked ? (
        <>
          <View style={styles.level}>
            <View style={styles.levelTop}>
              <Text style={styles.levelText}>Lv {progress.level}</Text>
              <Text style={styles.xpText}>
                {progress.xpIntoLevel} / {progress.xpForNext} XP
              </Text>
            </View>
            <XpBar fill={progress.xpIntoLevel / progress.xpForNext} color={info.color} height={8} />
          </View>
          {/* Lore types out like a dialogue box; a tap shows it all. */}
          <Pressable accessibilityHint="Shows all the text" onPress={() => setSkipped(true)} style={styles.lore}>
            <TypewriterText text={companion.bio} style={styles.bio} instant={skipped} onDone={() => setBioDone(true)} />
            <View style={[styles.quote, { borderColor: info.color }]}>
              <TypewriterText
                text={`“${companion.quote}”`}
                style={styles.quoteText}
                start={bioDone}
                instant={skipped}
              />
            </View>
          </Pressable>
          {inParty ? (
            <NoteBox symbol="heart.fill" color={info.color} iconColor={colors.accent}>
              {`In your party. ${info.dimensionLabel} habits level up ${companion.name}.`}
            </NoteBox>
          ) : (
            <Button title={`Swap in for ${current.name}`} color={info.color} onPress={swapIn} />
          )}
        </>
      ) : (
        <NoteBox symbol="lock.fill" color={colors.border} iconColor={colors.textMuted}>
          {`Unlocks at ${info.className} Path Lv ${companion.unlockLevel}. You’re Lv ${pathLevel}: keep up your ${info.dimensionLabel.toLowerCase()} habits to meet them.`}
        </NoteBox>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: colors.card, padding: spacing.xl, paddingBottom: spacing.xxl, gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  rarity: { position: 'absolute', top: spacing.sm, right: spacing.lg, flexDirection: 'row', gap: 1 },
  // White in every theme, like printed stars; the dark outline keeps them visible on light paper.
  rarityStar: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 30,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  portrait: {
    width: 88,
    height: 112,
    borderWidth: 2,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: spacing.sm,
    backgroundColor: colors.cardRaised,
  },
  titles: { flex: 1, gap: 2 },
  number: { fontFamily: fonts.bold, fontSize: 16, fontVariant: ['tabular-nums'] },
  name: { color: colors.text, fontSize: 36, fontFamily: fonts.bold },
  fullName: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 14 },
  className: { fontSize: 20, fontFamily: fonts.bold },
  realm: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13 },
  level: { gap: 6 },
  levelTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  levelText: { color: colors.text, fontSize: 22, fontFamily: fonts.bold },
  xpText: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, fontVariant: ['tabular-nums'] },
  bio: { color: colors.text, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24 },
  lore: { gap: spacing.md },
  quote: { borderLeftWidth: 3, paddingLeft: spacing.md },
  quoteText: { color: colors.textMuted, fontFamily: fonts.dialogue, fontSize: 16, lineHeight: 24 },
});
