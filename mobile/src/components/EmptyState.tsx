import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { spacing } from '@/lib/theme';

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.container}>
      <Text variant="bodyMedium">{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg },
});
