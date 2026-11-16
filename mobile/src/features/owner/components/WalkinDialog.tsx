import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Chip, Dialog, HelperText, Portal, Text } from 'react-native-paper';
import { AppTextInput } from '@/components';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/lib/theme';

type EndTimeOption = 'none' | '30' | '60' | '120' | 'custom';

const OPTIONS: { value: EndTimeOption; label: string }[] = [
  { value: 'none', label: 'No end time' },
  { value: '30', label: '30 min' },
  { value: '60', label: '1 h' },
  { value: '120', label: '2 h' },
  { value: 'custom', label: 'Custom time' },
];

type WalkinDialogProps = {
  onSubmit: (busyUntil?: string) => Promise<void>;
  onDismiss: () => void;
};

export function WalkinDialog({ onSubmit, onDismiss }: WalkinDialogProps) {
  const [option, setOption] = useState<EndTimeOption>('none');
  const [hours, setHours] = useState('1');
  const [minutes, setMinutes] = useState('0');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  function minutesFromNow(): number | null {
    if (option === 'none') return null;
    if (option === 'custom') return (Number(hours) || 0) * 60 + (Number(minutes) || 0);
    return Number(option);
  }

  async function submit() {
    setError(undefined);
    const total = minutesFromNow();
    if (total !== null && (total <= 0 || total > 12 * 60)) {
      setError('Choose an end time up to 12 hours from now');
      return;
    }
    const busyUntil = total === null ? undefined : new Date(Date.now() + total * 60_000).toISOString();
    setLoading(true);
    try {
      await onSubmit(busyUntil);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Portal>
      <Dialog visible onDismiss={loading ? () => undefined : onDismiss}>
        <Dialog.Title>Mark as busy</Dialog.Title>
        <Dialog.Content style={styles.content}>
          <Text variant="bodyMedium">
            Use this when someone is charging without the app. Customers will see this charger as busy until the end time you pick, or until you release it.
          </Text>
          <View style={styles.chips}>
            {OPTIONS.map((item) => (
              <Chip key={item.value} selected={option === item.value} onPress={() => setOption(item.value)}>
                {item.label}
              </Chip>
            ))}
          </View>
          {option === 'custom' ? (
            <View style={styles.customRow}>
              <AppTextInput
                label="Hours"
                keyboardType="number-pad"
                value={hours}
                onChangeText={(value) => setHours(value.replace(/[^0-9]/g, ''))}
                style={styles.customInput}
              />
              <AppTextInput
                label="Minutes"
                keyboardType="number-pad"
                value={minutes}
                onChangeText={(value) => setMinutes(value.replace(/[^0-9]/g, ''))}
                style={styles.customInput}
              />
            </View>
          ) : null}
          {error ? <HelperText type="error">{error}</HelperText> : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss} disabled={loading}>Cancel</Button>
          <Button onPress={() => void submit()} loading={loading} disabled={loading}>
            Mark in use
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  customRow: { flexDirection: 'row', gap: spacing.sm },
  customInput: { flex: 1 },
});
