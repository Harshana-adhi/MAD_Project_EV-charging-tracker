import { useCallback, useState } from 'react';

// The spinner only shows for a pull the user started. Background refetches (for example when a
// tab comes back into focus) stay silent, because iOS can leave the spinner stuck on screen when
// `refreshing` is switched on by code instead of by a pull.
export function usePullToRefresh(refetch: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  return { refreshing, onRefresh };
}
