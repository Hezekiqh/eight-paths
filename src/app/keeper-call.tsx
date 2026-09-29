import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { close } from '@/components/modal-header';
import { haptics } from '@/haptics';
import { allowQuietReminders, ensureReminderPermission } from '@/notifications';
import { KEEPER_ASK_CARDS, type KeeperAsk } from '@/notifications/ask-rules';
import { fonts, spacing } from '@/theme';

const isAsk = (value: unknown): value is KeeperAsk => typeof value === 'string' && value in KEEPER_ASK_CARDS;

/**
 * The Keeper asks, in his own dialogue window, before iOS does. "Yes" opens
 * the system dialog; "Not now" turns on quiet delivery without one, so the
 * single real ask isn't spent on a player who isn't ready.
 */
export default function KeeperCall() {
  const { ask } = useLocalSearchParams<{ ask?: string }>();
  const card = KEEPER_ASK_CARDS[isAsk(ask) ? ask : 'first'];
  const [busy, setBusy] = useState(false);

  const answer = async (yes: boolean) => {
    if (busy) return;
    setBusy(true);
    haptics.tap();
    try {
      if (yes) await ensureReminderPermission();
      else await allowQuietReminders();
    } finally {
      close();
    }
  };

  return (
    <View style={styles.backdrop}>
      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <View style={styles.dialogue} accessibilityRole="alert">
          <Text style={styles.speaker}>THE KEEPER</Text>
          <Text style={styles.line}>{card.title}</Text>
          <Text style={styles.line}>{card.body}</Text>
          <View style={styles.choices}>
            <Choice label={card.yes} onPress={() => answer(true)} primary />
            <Choice label={card.no} onPress={() => answer(false)} />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

/** An RPG menu choice: "▶ Yes, find me". */
function Choice({ label, onPress, primary }: { label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8}>
      {({ pressed }) => (
        <Text style={[styles.choice, primary && styles.primary, pressed && styles.pressed]}>
          {primary ? '\u25B6\uFE0E ' : '   '}
          {label}
        </Text>
      )}
    </Pressable>
  );
}

// The intro's dialogue window, so the Keeper looks the same wherever he speaks.
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottom: { padding: spacing.lg },
  dialogue: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: '#07060B',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 4,
  },
  speaker: { color: '#FFD27A', fontFamily: fonts.bold, fontSize: 18, letterSpacing: 2 },
  line: { color: '#FFFFFF', fontFamily: fonts.dialogue, fontSize: 18, lineHeight: 28 },
  choices: { marginTop: spacing.md, gap: spacing.md },
  choice: { color: '#B8B4CC', fontFamily: fonts.dialogue, fontSize: 18, lineHeight: 26 },
  primary: { color: '#FFFFFF' },
  pressed: { color: '#FFD27A' },
});
