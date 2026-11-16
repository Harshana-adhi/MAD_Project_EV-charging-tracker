import { useState } from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { AppTextInput } from '@/components';
import { useAppTheme } from '@/lib/theme';

type DeleteAccountDialogProps = {
  onConfirm: (password: string) => void;
  onDismiss: () => void;
  loading: boolean;
  error?: string;
};

export function DeleteAccountDialog({ onConfirm, onDismiss, loading, error }: DeleteAccountDialogProps) {
  const theme = useAppTheme();
  const [password, setPassword] = useState('');

  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss}>
        <Dialog.Title>Delete your account?</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            This permanently removes your name, email and phone number, and you won't be able to log
            in again. Any credits left in your wallet are lost, and stations you own are removed from the
            map. Your past sessions, reviews and transactions stay on record. Enter your password
            to confirm.
          </Text>
          <AppTextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            error={error}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            textColor={theme.colors.error}
            loading={loading}
            disabled={loading || !password}
            onPress={() => onConfirm(password)}
          >
            Delete account
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
