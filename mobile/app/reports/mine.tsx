import { useState } from 'react';
import { ErrorView, LoadingView, Screen } from '@/components';
import { OwnerStatementView } from '@/features/reports/components/OwnerStatementView';
import { useMyStatement } from '@/features/reports/hooks';
import { usePullToRefresh } from '@/features/admin/usePullToRefresh';

export default function MyReportsScreen() {
  const [month, setMonth] = useState<string | undefined>();
  const { data: statement, isLoading, isError, error, refetch } =
    useMyStatement(month);
  const { refreshing, onRefresh } = usePullToRefresh(refetch);

  return (
    <Screen title="Monthly reports" back scroll refreshing={refreshing} onRefresh={onRefresh}>
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
