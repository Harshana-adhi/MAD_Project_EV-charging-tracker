import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, SegmentedButtons, Text } from 'react-native-paper';
import { AppButton, AppTextInput, Card, EmptyState, ErrorView, LoadingView, Screen, StatusBadge, useSnackbar } from '@/components';
import { useDisputeSession, useOwnerSessions } from '@/features/owner';
import { errorMessage } from '@/lib/errors';
import { formatCredits, formatDate, formatKwh } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { SessionStatus, SessionWithNames } from '@/types/domain';

type SessionFilter = 'all' | 'active' | 'completed' | 'disputed';

function canDispute(session: SessionWithNames): boolean {
  if (session.status !== 'completed' || !session.endedAt) return false;
  const elapsed = Date.now() - new Date(session.endedAt).getTime();
  return elapsed >= 0 && elapsed <= 24 * 60 * 60 * 1000;
}

export default function OwnerSessionsScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const sessions = useOwnerSessions();
  const dispute = useDisputeSession();
  const [filter, setFilter] = useState<SessionFilter>('all');
  const [selected, setSelected] = useState<SessionWithNames | null>(null);
  const [reason, setReason] = useState('');
  const [dialogError, setDialogError] = useState('');
  const visibleSessions = useMemo(
    () => (sessions.data ?? []).filter((session) => filter === 'all' || session.status === filter),
    [sessions.data, filter],
  );

  async function submitDispute() {
    const trimmed = reason.trim();
    if (trimmed.length < 10 || trimmed.length > 300) {
      setDialogError('Enter a reason between 10 and 300 characters.');
      return;
    }
    if (!selected) return;
    setDialogError('');
    try {
      await dispute.mutateAsync({ id: selected.id, reason: trimmed });
      snackbar.show('Dispute submitted');
      setSelected(null);
      setReason('');
    } catch (error) {
      setDialogError(errorMessage(error));
    }
  }

  return (
    <Screen title="Owner sessions" back scroll refreshing={sessions.isRefetching} onRefresh={() => void sessions.refetch()}>
      <View style={styles.content}>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as SessionFilter)}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'completed', label: 'Completed' },
            { value: 'disputed', label: 'Disputed' },
          ]}
        />
        {sessions.isLoading ? <LoadingView message="Loading sessions…" /> : null}
        {sessions.isError ? <ErrorView error={sessions.error} onRetry={() => void sessions.refetch()} /> : null}
        {sessions.isSuccess && visibleSessions.length === 0 ? (
          <EmptyState icon="lightning-bolt" title="No sessions" message="Charging sessions for your stations will appear here." />
        ) : null}
        {visibleSessions.map((session) => (
          <Card key={session.id} title={session.stationName} subtitle={`${session.chargerLabel} · ${session.customerName}`}>
            <View style={styles.details}>
              <StatusBadge status={session.status as SessionStatus} />
              <Text variant="bodyMedium">{session.connector} · {session.powerKw} kW · {formatCredits(session.ratePerKwh)}/kWh</Text>
              <Text variant="bodyMedium">Started {formatDate(session.startedAt)}</Text>
              {session.endedAt ? <Text variant="bodyMedium">Ended {formatDate(session.endedAt)}</Text> : null}
              {session.kwh !== null ? <Text variant="bodyMedium">Energy {formatKwh(session.kwh)}</Text> : null}
              {session.cost !== null ? <Text variant="bodyMedium">Session total {formatCredits(session.cost)}</Text> : null}
              {session.commission !== null ? <Text variant="bodyMedium" style={{ color: theme.colors.secondary }}>Commission {formatCredits(session.commission)}</Text> : null}
              {session.disputeReason ? <Text variant="bodySmall" style={{ color: theme.colors.error }}>Dispute: {session.disputeReason}</Text> : null}
              {session.hasReview ? <Text variant="labelMedium" style={{ color: theme.colors.primary }}>Customer review received</Text> : null}
              {canDispute(session) ? (
                <AppButton
                  label="Dispute session"
                  mode="outlined"
                  icon="alert-circle-outline"
                  onPress={() => { setSelected(session); setReason(''); setDialogError(''); }}
                />
              ) : null}
            </View>
          </Card>
        ))}
      </View>
      <Portal>
        <Dialog visible={!!selected} onDismiss={() => setSelected(null)}>
          <Dialog.Title>Dispute completed session</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogHint}>Give a clear reason (10–300 characters). Disputes do not automatically change wallet balances.</Text>
            <DialogInput value={reason} onChangeText={setReason} error={dialogError} />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setSelected(null)}>Cancel</Button>
            <Button onPress={() => void submitDispute()} loading={dispute.isPending} disabled={dispute.isPending}>Submit</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </Screen>
  );
}

function DialogInput({ value, onChangeText, error }: { value: string; onChangeText: (text: string) => void; error: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.inputWrap}>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{value.trim().length}/300</Text>
      <AppTextInput
        label="Reason"
        value={value}
        onChangeText={onChangeText}
        error={error || undefined}
        multiline
        numberOfLines={4}
        maxLength={300}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  details: { gap: spacing.sm },
  dialogHint: { marginBottom: spacing.md },
  inputWrap: { gap: spacing.xs },
});
