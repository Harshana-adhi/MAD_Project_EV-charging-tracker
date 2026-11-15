import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { ErrorView, LoadingView, Screen } from '@/components';
import { OwnerStatementView } from '@/features/reports/components/OwnerStatementView';
import { useOwnerStatement } from '@/features/reports/hooks';

export default function OwnerStatementScreen() {
  const params = useLocalSearchParams<{ id: string; month?: string }>();
  const [month, setMonth] = useState(params.month);
  const { data: statement, isLoading, isError, error, refetch, isRefetching } = useOwnerStatement(
    params.id,
    month,
  );

  return (
    <Screen
      title={statement?.ownerName ?? 'Owner report'}
      back
      scroll
      refreshing={isRefetching}
      onRefresh={refetch}
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
