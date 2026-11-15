import { useEffect, useState } from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { SegmentedButtons } from 'react-native-paper';
import {
  ConfirmDialog,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  useSnackbar,
} from '@/components';
import { ReasonDialog } from '@/features/admin/components/ReasonDialog';
import { StationApprovalCard } from '@/features/admin/components/StationApprovalCard';
import { useAdminCounts, useAdminStations, useReviewStation } from '@/features/admin/hooks';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/lib/theme';
import type { AdminStation, StationStatus } from '@/types/domain';

const STATUSES: StationStatus[] = ['pending', 'approved', 'rejected'];

function isStationStatus(value: unknown): value is StationStatus {
  return STATUSES.includes(value as StationStatus);
}

export default function AdminStationsScreen() {
  const snackbar = useSnackbar();
  const params = useLocalSearchParams<{ status?: string }>();
  const { data: counts } = useAdminCounts();
  const [status, setStatus] = useState<StationStatus>(
    isStationStatus(params.status) ? params.status : 'pending',
  );

  useEffect(() => {
    if (isStationStatus(params.status)) setStatus(params.status);
  }, [params.status]);

  function changeStatus(value: string) {
    setStatus(value as StationStatus);
    router.setParams({ status: value });
  }

  const statusButtons = [
    {
      value: 'pending',
      label: counts?.pendingStations ? `Pending (${counts.pendingStations})` : 'Pending',
    },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];
  const { data: stations, isLoading, isError, error, refetch, isRefetching } =
    useAdminStations(status);
  const reviewStation = useReviewStation();
  const [stationToApprove, setStationToApprove] = useState<AdminStation | null>(null);
  const [stationToReject, setStationToReject] = useState<AdminStation | null>(null);

  async function review(station: AdminStation, approve: boolean, reason?: string) {
    setStationToApprove(null);
    setStationToReject(null);
    try {
      await reviewStation.mutateAsync({ id: station.id, input: { approve, reason } });
      snackbar.show(approve ? 'Station approved' : 'Station rejected');
    } catch (err) {
      snackbar.show(errorMessage(err));
    }
  }

  function renderContent() {
    if (isLoading) return <LoadingView />;
    if (isError || !stations) return <ErrorView error={error} onRetry={refetch} />;
    return (
      <FlatList
        data={stations}
        keyExtractor={(station) => station.id}
        refreshing={isRefetching}
        onRefresh={refetch}
        renderItem={({ item }) => (
          <StationApprovalCard
            station={item}
            disabled={reviewStation.isPending}
            onApprove={() => setStationToApprove(item)}
            onReject={() => setStationToReject(item)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="shield-check"
            title={`No ${status} stations`}
            message={
              status === 'pending'
                ? 'New stations from owners will appear here for review.'
                : 'Pull down to refresh the list.'
            }
          />
        }
      />
    );
  }

  return (
    <Screen>
      <SegmentedButtons
        value={status}
        onValueChange={changeStatus}
        buttons={statusButtons}
        style={styles.segments}
      />
      {renderContent()}

      <ConfirmDialog
        visible={!!stationToApprove}
        title="Approve station?"
        message={`${stationToApprove?.name ?? 'This station'} will become visible to all drivers on the map.`}
        confirmLabel="Approve"
        onConfirm={() => stationToApprove && review(stationToApprove, true)}
        onDismiss={() => setStationToApprove(null)}
      />
      {stationToReject ? (
        <ReasonDialog
          title="Reject station?"
          message={`Tell the owner why ${stationToReject.name} was rejected.`}
          onSubmit={(reason) => review(stationToReject, false, reason)}
          onDismiss={() => setStationToReject(null)}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segments: { marginBottom: spacing.lg },
});
