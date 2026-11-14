import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  danger,
  onConfirm,
  onDismiss,
}: ConfirmDialogProps) {
  const theme = useAppTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button onPress={onConfirm} textColor={danger ? theme.colors.error : undefined}>
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
