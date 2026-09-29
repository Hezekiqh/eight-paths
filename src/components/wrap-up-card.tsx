import { SymbolView } from 'expo-symbols';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { ClassInfo } from '@/game';
import { colors, fonts, spacing, windowStyle } from '@/theme';

type Props = {
  visible: boolean;
  info: ClassInfo;
  onClose: () => void;
};

/** Ends onboarding. The Keeper asks about notifications right after it closes. */
export function WrapUpCard({ visible, info, onClose }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderColor: info.color }]}>
          <SymbolView name="flag.checkered" tintColor={info.color} size={36} />
          <Text style={styles.title}>Your journey has begun</Text>
          <Text style={styles.body}>
            These quests are just a start: edit, add, or remove them anytime.
          </Text>
          <View style={styles.button}>
            <Button title="Continue" color={info.color} onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    ...windowStyle,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  title: { color: colors.text, fontSize: 29, fontFamily: fonts.bold, textAlign: 'center' },
  body: { color: colors.textMuted, fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: spacing.sm },
});
