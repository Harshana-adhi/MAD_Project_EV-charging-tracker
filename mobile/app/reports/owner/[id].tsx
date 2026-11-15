import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ErrorView, LoadingView, Screen } from '@/components';
import { OwnerStatementView } from '@/features/reports/components/OwnerStatementView';
import { useOwnerStatement } from '@/features/reports/hooks';
import { usePullToRefresh } from '@/features/admin/usePullToRefresh';

export default function OwnerStatementScreen() {
  const params = useLocalSearchParams<{ id: string; month?: string }>();
  const [month, setMonth] = useState(params.month);
  const { data: statement, isLoading, isError, error, refetch } = useOwnerStatement(
    params.id,
    month,
  );
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <Screen
      title={statement?.ownerName ?? 'Owner report'}
      back
      scroll
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      {isLoading ? (
        <LoadingView />
      ) : isError || !statement ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <OwnerStatementView statement={statement} onSelectMonth={setMonth} />
      )}
    </Screen>
  );
}
