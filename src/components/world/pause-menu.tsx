import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Segmented } from '@/components/segmented';
import { haptics } from '@/haptics';
import type { ControlScheme } from '@/world/store';
import { colors, fonts, spacing, windowStyle } from '@/theme';

const SCHEMES = [
  { value: 'joystick', label: 'Joystick' },
  { value: 'touchpad', label: 'Touch pad' },
] as const;

const HINTS: Record<ControlScheme, string> = {
  joystick: 'Drag the stick at bottom left to walk. A talks and examines.',
  touchpad: 'Put your thumb down anywhere and drag to walk. Tap, or press A, to talk and examine.',
};

type Props = {
  mapName: string;
  controls: ControlScheme;
  onControls: (controls: ControlScheme) => void;
  onResume: () => void;
  onLeave: () => void;
};

/** The World's pause menu: resume, pick the controls, or go back to habits. */
export function PauseMenu({ mapName, controls, onControls, onResume, onLeave }: Props) {
  return (
    <View style={styles.scrim}>
      <View style={styles.window} accessibilityViewIsModal>
        <Text style={styles.title}>PAUSED</Text>
        <Text style={styles.place}>{mapName}</Text>

        <Text style={styles.section}>CONTROLS</Text>
        <Segmented options={SCHEMES} value={controls} onChange={onControls} color={colors.accent} />
        <Text style={styles.hint}>{HINTS[controls]}</Text>

        <View style={styles.actions}>
          <MenuItem label="Resume" onPress={onResume} primary />
          <MenuItem label="Back to habits" onPress={onLeave} />
        </View>
      </View>
    </View>
  );
}

function MenuItem({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={({ pressed }) => [styles.item, primary && styles.itemPrimary, pressed && { opacity: 0.7 }]}>
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
  window: { ...windowStyle, width: 420, maxWidth: '80%', padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.accent, fontFamily: fonts.bold, fontSize: 32, textAlign: 'center' },
  place: { color: colors.textMuted, fontFamily: fonts.dialogue, fontSize: 16, textAlign: 'center', marginTop: -6 },
  section: { color: colors.textMuted, fontFamily: fonts.bold, fontSize: 18, letterSpacing: 1, marginTop: spacing.sm },
  hint: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  item: {
    flex: 1,
    borderWidth: 3,
    borderColor: colors.frame,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  itemPrimary: { backgroundColor: colors.accent },
  itemLabel: { color: colors.text, fontFamily: fonts.bold, fontSize: 20, letterSpacing: 1 },
  itemLabelPrimary: { color: colors.background },
});
