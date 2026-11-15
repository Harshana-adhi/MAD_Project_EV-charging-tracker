import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { SegmentedButtons } from 'react-native-paper';
import { Screen } from '@/components';
import { TopupsTab } from '@/features/admin/components/TopupsTab';
import { WithdrawalsTab } from '@/features/admin/components/WithdrawalsTab';
import { spacing } from '@/lib/theme';

type PaymentsTab = 'topups' | 'withdrawals';

const TAB_BUTTONS = [
  { value: 'topups', label: 'Top-ups', icon: 'cash-plus' },
  { value: 'withdrawals', label: 'Withdrawals', icon: 'bank-transfer' },
];

export default function AdminPaymentsScreen() {
  const [tab, setTab] = useState<PaymentsTab>('topups');

  return (
    <Screen>
      <SegmentedButtons
        value={tab}
        onValueChange={(value) => setTab(value as PaymentsTab)}
        buttons={TAB_BUTTONS}
        style={styles.segments}
      />
      {tab === 'topups' ? <TopupsTab /> : <WithdrawalsTab />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: { marginBottom: spacing.lg },
});
