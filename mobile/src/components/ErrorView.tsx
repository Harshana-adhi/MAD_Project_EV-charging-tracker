import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { useAppTheme, spacing } from '@/lib/theme';
import { errorMessage } from '@/lib/errors';

type ErrorViewProps = {
  error: unknown;
  onRetry?: () => void;
};

export function ErrorView({ error, onRetry }: ErrorViewProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
      <Text variant="bodyMedium" style={styles.message}>
        {errorMessage(error)}
      </Text>
      {onRetry ? <AppButton label="Try again" onPress={onRetry} mode="outlined" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  message: { textAlign: 'center' },
});
