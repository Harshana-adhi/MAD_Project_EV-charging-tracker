import { useState } from 'react';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { AppTextInput } from '@/components';
import { useAppTheme } from '@/lib/theme';
import { useKeyboardOffset } from '../useKeyboardOffset';

type ReasonDialogProps = {
  title: string;
  message: string;
  onSubmit: (reason: string) => void;
  onDismiss: () => void;
};

export function ReasonDialog({ title, message, onSubmit, onDismiss }: ReasonDialogProps) {
  const theme = useAppTheme();
  const keyboardOffset = useKeyboardOffset();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | undefined>();

  function submit() {
    const trimmed = reason.trim();
    if (trimmed.length < 5 || trimmed.length > 200) {
      setError('Enter a reason between 5 and 200 characters');
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss} style={{ marginBottom: keyboardOffset }}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
          <AppTextInput
            label="Reason"
            value={reason}
            onChangeText={(text) => {
              setReason(text);
              setError(undefined);
            }}
            multiline
            error={error}
          />
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={submit} textColor={theme.colors.error}>
            Reject
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
