import { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { IconButton, Text } from 'react-native-paper';
import { AppButton, ConfirmDialog, ErrorView, LoadingView, Screen } from '@/components';
import { Meter, useMeter } from '@/features/session/Meter';
import { useCancelSession, useEndSession, useSession, useSessionEvents } from '@/features/session/hooks';
import type { SessionWithNames } from '@/types/domain';
import { errorMessage } from '@/lib/errors';
import { spacing, useAppTheme } from '@/lib/theme';

function ActiveSession({ session }: { session: SessionWithNames }) {
  const theme = useAppTheme();
  const reading = useMeter(session);
  const end = useEndSession();
  const cancel = useCancelSession();
  const finishing = useRef(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const finish = useCallback(async (automatic: boolean) => {
    if (finishing.current) return;
    finishing.current = true;
    const measuredKwh = automatic
      ? Math.ceil((session.spendingLimit / session.ratePerKwh) * 100) / 100
      : Math.round(reading.kwh * 100) / 100;
    const kwh = Math.min(500, Math.max(0.01, measuredKwh));
    try {
      await end.mutateAsync({ id: session.id, kwh });
      router.replace({ pathname: '/receipt/[id]', params: { id: session.id } });
    } catch (error) {
      finishing.current = false;
      setActionError(errorMessage(error));
    }
  }, [end, reading.kwh, session.id, session.ratePerKwh, session.spendingLimit]);

  useEffect(() => {
    if (reading.progress >= 1) void finish(true);
  }, [reading.progress, finish]);

  async function cancelNow() {
    setConfirmCancel(false);
    if (finishing.current || reading.kwh >= 0.05) return;
    finishing.current = true;
    try {
      await cancel.mutateAsync(session.id);
      router.replace('/(customer)/sessions');
    } catch (error) {
      finishing.current = false;
      setActionError(errorMessage(error));
    }
  }

  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <IconButton icon="arrow-left" accessibilityLabel="Back to sessions" onPress={() => router.replace('/(customer)/sessions')} />
        <Text variant="titleLarge">Charging in progress</Text>
      </View>
      <View style={{ flex: 1, justifyContent: 'center', gap: spacing.xl }}>
        <View>
          <Text variant="titleMedium">{session.stationName}</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {session.chargerLabel} · {session.connector}
          </Text>
        </View>
        <Meter session={session} reading={reading} />
        {actionError ? <Text variant="bodyMedium" style={{ color: theme.colors.error }}>{actionError}</Text> : null}
      </View>
      <View style={{ gap: spacing.sm }}>
        <AppButton label="Stop charging" loading={end.isPending} disabled={finishing.current} onPress={() => setConfirmStop(true)} />
        {reading.kwh < 0.05 ? (
          <AppButton label="Cancel session" mode="text" disabled={finishing.current} onPress={() => setConfirmCancel(true)} />
        ) : null}
      </View>
      <ConfirmDialog
        visible={confirmStop}
        title="Stop charging?"
        message="Your final energy use will be charged from the held credits."
        confirmLabel="Stop charging"
        onDismiss={() => setConfirmStop(false)}
        onConfirm={() => { setConfirmStop(false); void finish(false); }}
      />
      <ConfirmDialog
        visible={confirmCancel}
        title="Cancel session?"
        message="The full spending limit will be released."
        confirmLabel="Cancel session"
        danger
        onDismiss={() => setConfirmCancel(false)}
        onConfirm={() => { void cancelNow(); }}
      />
    </Screen>
  );
}

export default function LiveSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const session = useSession(id ?? '');
  useSessionEvents(id);

  useEffect(() => {
    if (session.data && session.data.status !== 'active') {
      router.replace({ pathname: '/receipt/[id]', params: { id: session.data.id } });
    }
  }, [session.data]);

  if (session.isPending) return <Screen><LoadingView message="Loading session" /></Screen>;
  if (session.isError) return <Screen><ErrorView error={session.error} onRetry={() => session.refetch()} /></Screen>;
  if (session.data.status !== 'active') return <Screen><LoadingView message="Opening receipt" /></Screen>;
  return <ActiveSession session={session.data} />;
}
