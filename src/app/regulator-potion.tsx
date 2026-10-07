import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { close } from '@/components/modal-header';
import { PixelIcon } from '@/components/pixel-icon';
import { HP_COLORS } from '@/components/player-card';
import { POTION_BELOW, POTION_TO } from '@/game/regulator';
import { haptics } from '@/haptics';
import { fonts, spacing } from '@/theme';

/** The Keeper hands over a potion: the bar fell below 20, and it's back at 50. */
export default function RegulatorPotion() {
  const done = () => {
    haptics.success();
    close();
  };

  return (
    <View style={styles.backdrop}>
      <SafeAreaView edges={['bottom']} style={styles.bottom}>
        <View style={styles.potion}>
          <PixelIcon name="potion" color={HP_COLORS.high} size={72} />
          <Text style={styles.restored}>DB restored to {POTION_TO}</Text>
        </View>
        <View style={styles.dialogue} accessibilityRole="alert">
          <Text style={styles.speaker}>THE KEEPER</Text>
          <Text style={styles.line}>
            Your Dopamine Baseline dipped below {POTION_BELOW}. Here, drink this. It will put you back on your feet.
          </Text>
          <Text style={styles.line}>You can do it. Regulate that dopamine!</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Thank you" onPress={done} hitSlop={8}>
            {({ pressed }) => <Text style={[styles.choice, pressed && styles.pressed]}>{'▶︎ '}Thank you</Text>}
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

// The Keeper's dialogue window, as on his calls.
const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottom: { padding: spacing.lg, gap: spacing.xl },
  potion: { alignItems: 'center', gap: spacing.sm },
  restored: { color: '#FFFFFF', fontFamily: fonts.bold, fontSize: 28, letterSpacing: 1 },
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
  choice: { color: '#FFFFFF', fontFamily: fonts.dialogue, fontSize: 18, lineHeight: 26, marginTop: spacing.md },
  pressed: { color: '#FFD27A' },
});
