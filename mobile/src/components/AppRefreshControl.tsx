import { useCallback, useEffect, useRef, useState } from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { useAppTheme } from '@/lib/theme';

type AppRefreshControlProps = Omit<RefreshControlProps, 'refreshing' | 'onRefresh'> & {
  // Whether the screen's data is still loading. Only used to know when a pull has finished;
  // it never turns the spinner on by itself.
  refreshing?: boolean;
  onRefresh: () => unknown;
};

const MIN_SPIN_MS = 500;
const MAX_SPIN_MS = 15000;

// Pull-to-refresh that only spins for a pull the user started. Screens often pass a query's
// isRefetching, which also turns true for background refreshes (returning to a tab, live
// updates). Switching the spinner on from code like that can leave it stuck on screen on iOS,
// with the content pushed down. Here the spinner is driven only by the pull itself and always
// stops: when the data is back (at least MIN_SPIN_MS) or after MAX_SPIN_MS at the latest.
export function AppRefreshControl({ refreshing = false, onRefresh, ...rest }: AppRefreshControlProps) {
  const theme = useAppTheme();
  const [pulling, setPulling] = useState(false);
  const busy = useRef(refreshing);
  busy.current = refreshing;
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const handleRefresh = useCallback(async () => {
    setPulling(true);
    const started = Date.now();
    try {
      await onRefresh();
    } catch {
      // The screen shows its own error; the spinner just has to stop.
    }
    // Screens that fire and forget (void refetch()) report progress through `refreshing`.
    await new Promise<void>((resolve) => {
      const check = () => {
        const elapsed = Date.now() - started;
        if ((!busy.current && elapsed >= MIN_SPIN_MS) || elapsed >= MAX_SPIN_MS) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
    if (mounted.current) setPulling(false);
  }, [onRefresh]);

  return (
    <RefreshControl
      colors={[theme.colors.primary]}
      tintColor={theme.colors.primary}
      progressBackgroundColor={theme.colors.surface}
      {...rest}
      refreshing={pulling}
      onRefresh={() => void handleRefresh()}
    />
  );
}
