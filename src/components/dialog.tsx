import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { FullWindowOverlay } from 'react-native-screens';
import { create } from 'zustand';

import { haptics } from '@/haptics';
import { FRAME, colors, fonts, spacing, windowStyle } from '@/theme';

export type DialogButton = {
  text: string;
  /** As with iOS alerts: `cancel` is the quiet way out, `destructive` is drawn in red. */
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

type Dialog = { id: number; title: string; message?: string; buttons: DialogButton[] };

const useDialogs = create<{ queue: Dialog[] }>(() => ({ queue: [] }));
let nextId = 0;

/**
 * A pop-up in the game's own look, in place of the iPhone's alert: a framed
 * window over a dimmed screen. Called just like `Alert.alert`, from anywhere;
 * with no buttons it gets a plain OK. A second one waits until the first closes.
 */
export function showDialog(title: string, message?: string, buttons?: DialogButton[]) {
  const dialog = { id: nextId++, title, message, buttons: buttons?.length ? buttons : [{ text: 'OK' }] };
  useDialogs.setState((s) => ({ queue: [...s.queue, dialog] }));
}

function close(id: number, button?: DialogButton) {
  useDialogs.setState((s) => ({ queue: s.queue.filter((d) => d.id !== id) }));
  button?.onPress?.();
}

/**
 * On iOS a `Modal` is presented by the root screen, and UIKit won't let a screen that is already
 * presenting a sheet or modal present anything else: the pop-up never appeared and the queue
 * stuck, so e.g. Skip on a held quest's sheet did nothing. `FullWindowOverlay` draws in its own
 * window above every sheet instead.
 */
function Layer({ onClose, children }: { onClose: () => void; children: ReactNode }) {
  const [fade] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, [fade]);
  if (Platform.OS === 'ios') {
    return (
      <FullWindowOverlay>
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fade }]}>
          {children}
        </Animated.View>
      </FullWindowOverlay>
    );
  }
  return (
    <Modal transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      {children}
    </Modal>
  );
}

/** Draws the waiting pop-up. Mounted once, at the root, so it sits over every screen and sheet. */
export function DialogHost() {
  const dialog = useDialogs((s) => s.queue[0]);
  if (!dialog) return null;
  const cancel = dialog.buttons.find((b) => b.style === 'cancel');
  // Two short buttons sit side by side, the way out first; more than two stack.
  const row = dialog.buttons.length === 2 && dialog.buttons.every((b) => b.text.length <= 12);
  const buttons = row && cancel ? [cancel, ...dialog.buttons.filter((b) => b !== cancel)] : dialog.buttons;

  return (
    // The hardware back gesture or a tap outside counts as Cancel, when there is one.
    <Layer onClose={() => cancel && close(dialog.id, cancel)}>
      <Pressable style={styles.backdrop} onPress={() => cancel && close(dialog.id, cancel)} accessible={false}>
        <Pressable style={styles.window} accessibilityViewIsModal onPress={() => {}}>
          <Text style={styles.title} accessibilityRole="header">
            {dialog.title}
          </Text>
          {!!dialog.message && <Text style={styles.message}>{dialog.message}</Text>}
          <View style={[styles.buttons, row && styles.buttonRow]}>
            {buttons.map((b) => (
              <Pressable
                key={b.text}
                accessibilityRole="button"
                onPress={() => {
                  haptics.tap();
                  close(dialog.id, b);
                }}
                style={({ pressed }) => [
                  styles.button,
                  row && styles.flex,
                  b.style === 'cancel' ? styles.quiet : b.style === 'destructive' ? styles.danger : styles.main,
                  pressed && styles.pressed,
                ]}>
                <Text
                  style={[
                    styles.label,
                    b.style === 'cancel' ? styles.quietLabel : b.style === 'destructive' && styles.dangerLabel,
                  ]}>
                  {b.text.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Layer>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  window: { ...windowStyle, width: '100%', maxWidth: 400, padding: spacing.lg, gap: spacing.sm },
  title: { color: colors.text, fontFamily: fonts.bold, fontSize: 22 },
  message: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  buttons: { gap: spacing.sm, marginTop: spacing.sm },
  buttonRow: { flexDirection: 'row' },
  flex: { flex: 1 },
  button: {
    borderWidth: FRAME,
    borderColor: colors.frame,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 1,
    shadowRadius: 0,
    shadowOffset: { width: 3, height: 3 },
  },
  main: { backgroundColor: colors.accent },
  danger: { backgroundColor: colors.danger },
  quiet: { backgroundColor: colors.card, borderColor: colors.border },
  pressed: { transform: [{ translateX: 2 }, { translateY: 2 }], shadowOffset: { width: 1, height: 1 } },
  label: { color: colors.background, fontFamily: fonts.bold, fontSize: 16, letterSpacing: 1 },
  dangerLabel: { color: colors.background },
  quietLabel: { color: colors.textMuted },
});
