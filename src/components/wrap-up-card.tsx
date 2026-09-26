import { SymbolView } from 'expo-symbols';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import type { ClassInfo } from '@/game';
import { ensureReminderPermission } from '@/notifications';
import { colors, radius, spacing } from '@/theme';

type Props = {
  visible: boolean;
  info: ClassInfo;
  onClose: () => void;
};

/** Ends onboarding; the notification permission prompt is shown only from here. */
export function WrapUpCard({ visible, info, onClose }: Props) {
  const finish = async () => {
    try {
      await ensureReminderPermission();
    } finally {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { borderColor: info.color }]}>
          <SymbolView name="flag.checkered" tintColor={info.color} size={36} />
          <Text style={styles.title}>Your journey has begun</Text>
          <Text style={styles.body}>
            These quests are just a start: edit, add, or remove them anytime.
          </Text>
          <Text style={styles.body}>
            Want a gentle evening reminder? We&apos;ll ask for permission next.
          </Text>
          <View style={styles.button}>
            <Button title="Continue" color={info.color} onPress={finish} />
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
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing.xl,
    gap: spacing.md,
    alignItems: 'center',
  },
  title: { color: colors.text, fontSize: 22, fontWeight: '800', textAlign: 'center' },
  body: { color: colors.textMuted, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  button: { alignSelf: 'stretch', marginTop: spacing.sm },
});
