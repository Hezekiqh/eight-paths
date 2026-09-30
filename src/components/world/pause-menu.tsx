import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/segmented';
import { ObjectivesPanel } from '@/components/world/objectives-panel';
import { haptics } from '@/haptics';
import { CLASSES } from '@/game';
import { COMPANIONS } from '@/story/companions';
import type { HeroId } from '@/world/hero';
import type { MapId } from '@/world/maps';
import type { ControlScheme } from '@/world/store';
import { colors, fonts, spacing, windowStyle } from '@/theme';

/** The two ways to walk, shared with the World menu's Settings. */
export const SCHEMES = [
  { value: 'joystick', label: 'Joystick' },
  { value: 'touchpad', label: 'Touch pad' },
] as const;

export const HINTS: Record<ControlScheme, string> = {
  joystick: 'Drag the stick at bottom left to walk. A talks and examines.',
  touchpad: 'Put your thumb down anywhere and drag to walk. Tap, or press A, to talk and examine.',
};

type Props = {
  map: MapId;
  mapName: string;
  controls: ControlScheme;
  onControls: (controls: ControlScheme) => void;
  onResume: () => void;
  onOpenMap: () => void;
  onOpenBoard: () => void;
  /** The upright World menu: lore, objectives, what's coming. */
  onMenu: () => void;
  onLeave: () => void;
  /** Your party members who can walk the World, the one walking now, and swapping. */
  party: HeroId[];
  hero: HeroId;
  onSwap: (hero: HeroId) => void;
};

/**
 * The World's pause menu. Left: what it takes to go on, in real habits, and
 * the quest board. Right: the map, the controls, and resume or go back to habits.
 */
export function PauseMenu({
  map,
  mapName,
  controls,
  onControls,
  onResume,
  onOpenMap,
  onOpenBoard,
  onMenu,
  onLeave,
  party,
  hero,
  onSwap,
}: Props) {
  return (
    <View style={styles.scrim}>
      <View style={styles.window} accessibilityViewIsModal>
        <View style={styles.heading}>
          <Text style={styles.title}>PAUSED</Text>
          <Text style={styles.place}>{mapName}</Text>
        </View>

        <View style={styles.columns}>
          <ScrollView style={styles.column} contentContainerStyle={{ gap: spacing.xs }}>
            <ObjectivesPanel map={map} hero={hero} onOpenBoard={onOpenBoard} />
          </ScrollView>
          <View style={styles.column}>
            <View style={styles.actions}>
              <MenuItem label="Map" onPress={onOpenMap} grow />
              <MenuItem label="Other World menu" onPress={onMenu} grow />
            </View>
            <Text style={styles.section}>WALKING AS</Text>
            <View style={styles.party}>
              {party.map((id) => {
                const c = COMPANIONS[id];
                const on = id === hero;
                return (
                  <Pressable
                    key={id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${c.name}, ${CLASSES[c.dimension].className}`}
                    onPress={() => {
                      if (on) return;
                      haptics.select();
                      onSwap(id);
                    }}
                    style={[styles.member, on && { borderColor: CLASSES[c.dimension].color }]}>
                    <Text style={[styles.memberName, on && { color: CLASSES[c.dimension].color }]}>{c.name}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.section}>CONTROLS</Text>
            <Segmented options={SCHEMES} value={controls} onChange={onControls} color={colors.accent} />
            <Text style={styles.hint}>{HINTS[controls]}</Text>
            <View style={styles.actions}>
              <MenuItem label="Resume" onPress={onResume} primary grow />
              <MenuItem label="Back to habits" onPress={onLeave} grow />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function MenuItem({
  label,
  onPress,
  primary,
  grow,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
  /** Share a row with the other buttons. */
  grow?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.item,
        grow && styles.grow,
        primary && styles.itemPrimary,
        pressed && { opacity: 0.7 },
      ]}>
      <Text style={[styles.itemLabel, primary && styles.itemLabelPrimary]}>{label.toUpperCase()}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  party: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  member: { borderWidth: 2, borderColor: colors.border, paddingHorizontal: 6, paddingVertical: 2 },
  memberName: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 14 },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 5, 10, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  window: { ...windowStyle, width: 720, maxWidth: '90%', maxHeight: '92%', padding: spacing.lg, gap: spacing.sm },
  heading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.md },
  title: { color: colors.accent, fontFamily: fonts.bold, fontSize: 30 },
  place: { color: colors.textMuted, fontFamily: fonts.dialogue, fontSize: 16 },
  columns: { flexDirection: 'row', gap: spacing.xl },
  column: { flex: 1, gap: spacing.xs },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 1, marginTop: spacing.xs },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: 'auto' },
  grow: { flex: 1 },
  item: {
    borderWidth: 3,
    borderColor: colors.frame,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  itemPrimary: { backgroundColor: colors.accent },
  itemLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 20, letterSpacing: 1 },
  itemLabelPrimary: { color: colors.background },
});
