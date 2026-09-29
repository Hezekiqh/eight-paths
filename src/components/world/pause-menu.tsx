import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/segmented';
import { ObjectivesPanel } from '@/components/world/objectives-panel';
import { haptics } from '@/haptics';
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
}: Props) {
  return (
    <View style={styles.scrim}>
      <View style={styles.window} accessibilityViewIsModal>
        <View style={styles.heading}>
          <Text style={styles.title}>PAUSED</Text>
          <Text style={styles.place}>{mapName}</Text>
        </View>

        <View style={styles.columns}>
          <View style={styles.column}>
            <ObjectivesPanel map={map} onOpenBoard={onOpenBoard} />
          </View>
          <View style={styles.column}>
            <View style={styles.actions}>
              <MenuItem label="Map" onPress={onOpenMap} grow />
              <MenuItem label="World menu" onPress={onMenu} grow />
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
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 5, 10, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  window: { ...windowStyle, width: 720, maxWidth: '90%', padding: spacing.lg, gap: spacing.sm },
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
