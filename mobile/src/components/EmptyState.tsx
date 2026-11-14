import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppButton } from './AppButton';
import { useAppTheme, spacing } from '@/lib/theme';

type EmptyStateProps = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, message, actionLabel, onAction }: EmptyStateProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name={icon} size={48} color={theme.colors.onSurfaceVariant} />
      <Text variant="titleMedium">{title}</Text>
      <Text variant="bodyMedium" style={styles.message}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} mode="contained-tonal" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: spacing.xxl, gap: spacing.sm },
  message: { textAlign: 'center' },
});
