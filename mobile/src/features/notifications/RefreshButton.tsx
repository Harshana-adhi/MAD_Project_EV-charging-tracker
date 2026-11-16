import { IconButton } from 'react-native-paper';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from '@/components';
import { useAuth } from '@/features/auth';
import { USE_MOCKS } from '@/lib/config';
import { connectSocket } from '@/lib/socket';
import { useAppTheme } from '@/lib/theme';

// Reconnects the live-update socket and reloads everything on screen, so nobody has to
// restart the app when live updates look stale.
export function RefreshButton({ contained }: { contained?: boolean }) {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const { token } = useAuth();
  const snackbar = useSnackbar();

  function refresh() {
    if (!USE_MOCKS) connectSocket(token ?? undefined);
    void queryClient.invalidateQueries();
    snackbar.show('Refreshed – live updates reconnected');
  }

  return (
    <IconButton
      icon="refresh"
      mode={contained ? 'contained' : undefined}
      containerColor={contained ? theme.colors.surface : undefined}
      iconColor={theme.colors.onSurface}
      accessibilityLabel="Refresh for real-time updates"
      onPress={refresh}
    />
  );
}
