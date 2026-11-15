import { Button, Dialog, Portal, RadioButton } from 'react-native-paper';
import { useThemePreference, type ThemePreference } from '@/lib/themePreference';

type AppearanceDialogProps = {
  visible: boolean;
  onDismiss: () => void;
};

export function AppearanceDialog({ visible, onDismiss }: AppearanceDialogProps) {
  const { preference, setPreference } = useThemePreference();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>Appearance</Dialog.Title>
        <Dialog.Content>
          <RadioButton.Group
            value={preference}
            onValueChange={(value) => setPreference(value as ThemePreference)}
          >
            <RadioButton.Item label="Use phone setting" value="system" />
            <RadioButton.Item label="Light" value="light" />
            <RadioButton.Item label="Dark" value="dark" />
          </RadioButton.Group>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Done</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
