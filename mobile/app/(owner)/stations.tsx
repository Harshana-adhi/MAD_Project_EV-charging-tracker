import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { AppButton, EmptyState, ErrorView, LoadingView } from '@/components';
import { Screen } from '@/components';
import { spacing } from '@/lib/theme';
import { OwnerStationCard, useOwnerStations } from '@/features/owner';

export default function MyStationsScreen() {
  const stations = useOwnerStations();

  return (
    <Screen scroll refreshing={stations.isRefetching} onRefresh={() => void stations.refetch()}>
      <View style={styles.header}>
        <View style={styles.titleSpace} />
        <AppButton
          label="Add station"
          icon="plus"
          mode="contained-tonal"
          onPress={() => router.push('/owner/station/new')}
        />
      </View>
      {stations.isLoading ? <LoadingView message="Loading your stations…" /> : null}
      {stations.isError ? <ErrorView error={stations.error} onRetry={() => void stations.refetch()} /> : null}
      {stations.isSuccess && stations.data.length === 0 ? (
        <EmptyState
          icon="ev-station"
          title="No stations yet"
          message="Add your first charging station to start the review process."
          actionLabel="Add station"
          onAction={() => router.push('/owner/station/new')}
        />
      ) : null}
      {stations.data?.map((station) => (
        <OwnerStationCard
          key={station.id}
          station={station}
          onPress={() => router.push({ pathname: '/owner/station/[id]', params: { id: station.id } })}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: spacing.md },
  titleSpace: { flex: 1 },
});
