import { Button } from 'react-native-paper';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  mode?: 'contained' | 'outlined' | 'text';
  loading?: boolean;
  disabled?: boolean;
};

export function AppButton({ label, onPress, mode = 'contained', loading, disabled }: AppButtonProps) {
  return (
    <Button mode={mode} onPress={onPress} loading={loading} disabled={disabled || loading}>
      {label}
    </Button>
  );
}
