import { StyleSheet, Text } from 'react-native';

import { Screen } from '@/components/screen';
import { colors } from '@/theme';

export default function QuestsScreen() {
  return (
    <Screen title="Quests">
      <Text style={styles.placeholder}>Your quest board arrives in milestone 5.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  placeholder: { color: colors.textMuted, fontSize: 15 },
});
