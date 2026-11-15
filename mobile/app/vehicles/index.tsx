import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FAB, IconButton, Menu } from 'react-native-paper';
import {
  Card,
  ConfirmDialog,
  ConnectorChip,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  useSnackbar,
} from '@/components';
import { useDeleteVehicle, useVehicles } from '@/features/profile/hooks';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/lib/theme';
import type { Vehicle } from '@/types/domain';

export default function MyVehiclesScreen() {
  const snackbar = useSnackbar();
  const { data: vehicles, isLoading, isError, error, refetch, isRefetching } = useVehicles();
  const deleteVehicle = useDeleteVehicle();
  const [menuVehicleId, setMenuVehicleId] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  function openEdit(vehicle: Vehicle) {
    setMenuVehicleId(null);
    router.push({ pathname: '/vehicles/edit', params: { id: vehicle.id } });
  }

  function askDelete(vehicle: Vehicle) {
    setMenuVehicleId(null);
    setVehicleToDelete(vehicle);
  }

  async function confirmDelete() {
    if (!vehicleToDelete) return;
    const id = vehicleToDelete.id;
    setVehicleToDelete(null);
    try {
      await deleteVehicle.mutateAsync(id);
      snackbar.show('Vehicle deleted');
    } catch (err) {
      snackbar.show(errorMessage(err));
    }
  }

  function renderVehicle({ item }: { item: Vehicle }) {
    return (
      <Card
        title={item.makeModel}
        subtitle={item.batteryKwh ? `${item.batteryKwh} kWh battery` : 'Battery size not set'}
        right={
          <Menu
            visible={menuVehicleId === item.id}
            onDismiss={() => setMenuVehicleId(null)}
            anchor={
              <IconButton
                icon="dots-vertical"
                accessibilityLabel={`Options for ${item.makeModel}`}
                onPress={() => setMenuVehicleId(item.id)}
              />
            }
          >
            <Menu.Item leadingIcon="pencil" title="Edit" onPress={() => openEdit(item)} />
            <Menu.Item leadingIcon="delete-outline" title="Delete" onPress={() => askDelete(item)} />
          </Menu>
        }
      >
        <View style={styles.chipRow}>
          <ConnectorChip connector={item.connector} />
        </View>
      </Card>
    );
  }

  function renderContent() {
    if (isLoading) return <LoadingView />;
    if (isError || !vehicles) return <ErrorView error={error} onRetry={refetch} />;
    return (
      <FlatList
        data={vehicles}
        keyExtractor={(vehicle) => vehicle.id}
        renderItem={renderVehicle}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="car-electric"
            title="No vehicles yet"
            message="Add one to filter chargers faster."
            actionLabel="Add vehicle"
            onAction={() => router.push('/vehicles/edit')}
          />
        }
      />
    );
  }

  return (
    <Screen title="My vehicles" back>
      {renderContent()}
      {vehicles && vehicles.length > 0 ? (
        <FAB
          icon="plus"
          label="Add vehicle"
          style={styles.fab}
          onPress={() => router.push('/vehicles/edit')}
        />
      ) : null}
      <ConfirmDialog
        visible={!!vehicleToDelete}
        title="Delete vehicle?"
        message={`${vehicleToDelete?.makeModel ?? 'This vehicle'} will be removed from your account.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onDismiss={() => setVehicleToDelete(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: spacing.xxl * 3 },
  chipRow: { flexDirection: 'row' },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
});
