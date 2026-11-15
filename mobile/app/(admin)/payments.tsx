import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SegmentedButtons } from 'react-native-paper';
import { Screen } from '@/components';
import { TopupsTab } from '@/features/admin/components/TopupsTab';
import { WithdrawalsTab } from '@/features/admin/components/WithdrawalsTab';
import { useAdminCounts } from '@/features/admin/hooks';
import { spacing } from '@/lib/theme';

type PaymentsTab = 'topups' | 'withdrawals';

function withCount(label: string, count?: number): string {
  return count ? `${label} (${count})` : label;
}

export default function AdminPaymentsScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const { data: counts } = useAdminCounts();
  const [tab, setTab] = useState<PaymentsTab>(
    params.tab === 'withdrawals' ? 'withdrawals' : 'topups',
  );

  // The dashboard cards open this screen on a specific tab.
  useEffect(() => {
    if (params.tab === 'topups' || params.tab === 'withdrawals') setTab(params.tab);
  }, [params.tab]);

  function changeTab(value: string) {
    setTab(value as PaymentsTab);
    router.setParams({ tab: value });
  }

  return (
    <Screen>
      <SegmentedButtons
        value={tab}
        onValueChange={changeTab}
        buttons={[
          {
            value: 'topups',
            label: withCount('Top-ups', counts?.pendingTopups),
            icon: 'cash-plus',
          },
          {
            value: 'withdrawals',
            label: withCount('Withdrawals', counts?.pendingWithdrawals),
            icon: 'bank-transfer',
          },
        ]}
        style={styles.segments}
      />
      {tab === 'topups' ? <TopupsTab /> : <WithdrawalsTab />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: { marginBottom: spacing.lg },
});
