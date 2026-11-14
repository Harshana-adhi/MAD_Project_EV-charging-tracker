import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useAppTheme, spacing } from '@/lib/theme';

export function LoadingView({ message }: { message?: string }) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      {message ? <Text variant="bodyMedium">{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
});
