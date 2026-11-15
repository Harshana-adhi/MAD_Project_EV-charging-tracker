import { useState } from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { AppTextInput } from '@/components';
import { useKeyboardOffset } from '../useKeyboardOffset';

type PasswordDialogProps = {
  userName: string;
  onSubmit: (newPassword: string) => void;
  onDismiss: () => void;
};

export function PasswordDialog({ userName, onSubmit, onDismiss }: PasswordDialogProps) {
  const keyboardOffset = useKeyboardOffset();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();

  function submit() {
    if (password.length < 8 || password.length > 64) {
      setError('Password must be 8 to 64 characters');
      return;
    }
    onSubmit(password);
  }

  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss} style={{ marginBottom: keyboardOffset }}>
        <Dialog.Title>Reset password</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">
            Set a new password for {userName} and share it with them privately.
          </Text>
          <AppTextInput
            label="New password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setError(undefined);
            }}
            secureTextEntry
            autoCapitalize="none"
            error={error}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={submit}>Reset password</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
