import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { AppButton } from './AppButton';
import { spacing } from '@/lib/theme';

type ErrorViewProps = {
  message: string;
  onRetry?: () => void;
};

export function ErrorView({ message, onRetry }: ErrorViewProps) {
  return (
    <View style={styles.container}>
      <Text variant="bodyMedium" style={styles.message}>
        {message}
      </Text>
      {onRetry ? <AppButton label="Retry" onPress={onRetry} mode="outlined" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.lg },
  message: { marginBottom: spacing.md, textAlign: 'center' },
});
