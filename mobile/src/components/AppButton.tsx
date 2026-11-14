import { Button } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  mode?: 'contained' | 'contained-tonal' | 'outlined' | 'text';
  icon?: string;
  loading?: boolean;
  disabled?: boolean;
  danger?: boolean;
};

export function AppButton({
  label,
  onPress,
  mode = 'contained',
  icon,
  loading,
  disabled,
  danger,
}: AppButtonProps) {
  const theme = useAppTheme();
  const dangerProps = danger
    ? { buttonColor: theme.colors.error, textColor: theme.colors.onError }
    : {};

  return (
    <Button
      mode={danger ? 'contained' : mode}
      onPress={onPress}
      icon={icon}
      loading={loading}
      disabled={disabled || loading}
      {...dangerProps}
    >
      {label}
    </Button>
  );
}
