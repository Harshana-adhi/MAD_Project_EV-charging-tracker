import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { Chip, Portal, Switch, Text } from 'react-native-paper';
import { AppButton } from '@/components';
import { useAppTheme, spacing } from '@/lib/theme';
import type { ConnectorType, StationFilters } from '@/types/domain';

const CONNECTORS: ConnectorType[] = ['TYPE1', 'TYPE2', 'CCS2', 'CHADEMO', 'GBT'];
const POWER_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '7 kW', value: 7 },
  { label: '22 kW', value: 22 },
  { label: '50 kW', value: 50 },
];
const PRICE_OPTIONS = [
  { label: 'Any', value: undefined },
  { label: '80 LKR/kWh', value: 80 },
  { label: '100 LKR/kWh', value: 100 },
  { label: '120 LKR/kWh', value: 120 },
];

type FilterSheetProps = {
  visible: boolean;
  onDismiss: () => void;
  filters: StationFilters;
  onApply: (filters: StationFilters) => void;
};

export function FilterSheet({ visible, onDismiss, filters, onApply }: FilterSheetProps) {
  const theme = useAppTheme();
  const [connector, setConnector] = useState(filters.connector);
  const [minPowerKw, setMinPowerKw] = useState(filters.minPowerKw);
  const [maxRate, setMaxRate] = useState(filters.maxRate);
  const [availableOnly, setAvailableOnly] = useState(!!filters.availableOnly);

  function apply() {
    onApply({ ...filters, connector, minPowerKw, maxRate, availableOnly });
    onDismiss();
  }

  function clear() {
    setConnector(undefined);
    setMinPowerKw(undefined);
    setMaxRate(undefined);
    setAvailableOnly(false);
  }

  return (
    <Portal>
      <Modal visible={visible} onDismiss={onDismiss} transparent>
        <View style={styles.backdrop}>
          <View style={[styles.sheet, { backgroundColor: theme.colors.surface }]}>
            <Text variant="titleMedium">Filters</Text>

            <Text variant="bodySmall" style={styles.label}>
              Connector
            </Text>
            <View style={styles.row}>
              {CONNECTORS.map((value) => (
                <Chip
                  key={value}
                  selected={connector === value}
                  onPress={() => setConnector(connector === value ? undefined : value)}
                >
                  {value}
                </Chip>
              ))}
            </View>

            <Text variant="bodySmall" style={styles.label}>
              Minimum power
            </Text>
            <View style={styles.row}>
              {POWER_OPTIONS.map((option) => (
                <Chip
                  key={option.label}
                  selected={minPowerKw === option.value}
                  onPress={() => setMinPowerKw(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </View>

            <Text variant="bodySmall" style={styles.label}>
              Maximum price
            </Text>
            <View style={styles.row}>
              {PRICE_OPTIONS.map((option) => (
                <Chip
                  key={option.label}
                  selected={maxRate === option.value}
                  onPress={() => setMaxRate(option.value)}
                >
                  {option.label}
                </Chip>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text variant="bodyLarge">Available now</Text>
              <Switch value={availableOnly} onValueChange={setAvailableOnly} />
            </View>

            <View style={styles.actions}>
              <AppButton label="Clear" mode="outlined" onPress={clear} />
              <AppButton label="Apply" onPress={apply} />
            </View>
          </View>
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.lg, gap: spacing.sm },
  label: { marginTop: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
});
