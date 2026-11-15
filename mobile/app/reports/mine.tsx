import { useState } from 'react';
import { ErrorView, LoadingView, Screen } from '@/components';
import { OwnerStatementView } from '@/features/reports/components/OwnerStatementView';
import { useMyStatement } from '@/features/reports/hooks';

export default function MyReportsScreen() {
  const [month, setMonth] = useState<string | undefined>();
  const { data: statement, isLoading, isError, error, refetch, isRefetching } =
    useMyStatement(month);

  return (
    <Screen title="Monthly reports" back scroll refreshing={isRefetching} onRefresh={refetch}>
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
