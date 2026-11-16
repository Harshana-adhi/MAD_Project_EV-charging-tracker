import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Button, Divider, HelperText, Text } from 'react-native-paper';
import {
  AppButton,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  StatusBadge,
  useSnackbar,
} from '@/components';
import {
  ChargerForm,
  StationForm,
  WalkinDialog,
  useCreateCharger,
  useDeleteCharger,
  useOwnerStations,
  useSetChargerStatus,
  useUpdateCharger,
  useUpdateStation,
  useUploadStationPhoto,
} from '@/features/owner';
import type { OwnerPhotoUpload } from '@/features/owner/api';
import { errorMessage } from '@/lib/errors';
import { formatClock } from '@/lib/format';
import { spacing, useAppTheme } from '@/lib/theme';
import type { Charger, ChargerInput, StationInput } from '@/types/domain';

export default function EditStationScreen() {
  const theme = useAppTheme();
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const snackbar = useSnackbar();
  const stations = useOwnerStations();
  const updateStation = useUpdateStation();
  const uploadPhoto = useUploadStationPhoto();
  const createCharger = useCreateCharger();
  const updateCharger = useUpdateCharger();
  const deleteCharger = useDeleteCharger();
  const setChargerStatus = useSetChargerStatus();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const [chargerError, setChargerError] = useState<unknown>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [editingCharger, setEditingCharger] = useState<Charger | undefined>();
  const [chargerToDelete, setChargerToDelete] = useState<Charger | null>(null);
  const [walkinCharger, setWalkinCharger] = useState<Charger | null>(null);
  const station = stations.data?.find((item) => item.id === id);
  const savingStation = updateStation.isPending || uploadPhoto.isPending;
  const savingCharger = createCharger.isPending || updateCharger.isPending;

  async function saveStation(
    input: StationInput,
    photos: OwnerPhotoUpload[],
    onPhotoUploaded: (uri: string) => void,
  ) {
    setSubmitError(null);
    try {
      const uploadPendingPhotos = async () => {
        for (const photo of photos) {
          await uploadPhoto.mutateAsync({ id: id!, photo });
          onPhotoUploaded(photo.uri);
        }
      };

      if (station?.status === 'rejected') await uploadPendingPhotos();
      await updateStation.mutateAsync({ id: id!, input });
      if (station?.status !== 'rejected') await uploadPendingPhotos();
      snackbar.show('Station saved');
      router.back();
    } catch (error) {
      setSubmitError(error);
    }
  }

  async function saveCharger(input: ChargerInput) {
    if (!station) return;
    setChargerError(null);
    if (editingCharger) {
      await updateCharger.mutateAsync({ id: editingCharger.id, input });
    } else {
      await createCharger.mutateAsync({ stationId: station.id, input });
    }
    setFormVisible(false);
    setEditingCharger(undefined);
    snackbar.show(editingCharger ? 'Charger updated' : 'Charger added');
  }

  async function confirmDeleteCharger() {
    if (!chargerToDelete) return;
    setChargerError(null);
    try {
      await deleteCharger.mutateAsync(chargerToDelete.id);
      snackbar.show('Charger deleted');
      setChargerToDelete(null);
    } catch (error) {
      setChargerError(error);
      setChargerToDelete(null);
    }
  }

  async function toggleCharger(charger: Charger) {
    if (charger.status === 'busy') return;
    setChargerError(null);
    try {
      const status = charger.status === 'offline' ? 'available' : 'offline';
      await setChargerStatus.mutateAsync({ id: charger.id, status });
      snackbar.show(status === 'available' ? 'Charger is available' : 'Charger is offline');
    } catch (error) {
      setChargerError(error);
    }
  }

  async function setAvailable(charger: Charger) {
    setChargerError(null);
    try {
      await setChargerStatus.mutateAsync({ id: charger.id, status: 'available' });
      snackbar.show('Charger released');
    } catch (error) {
      setChargerError(error);
    }
  }

  async function submitWalkin(busyUntil?: string) {
    if (!walkinCharger) return;
    await setChargerStatus.mutateAsync({ id: walkinCharger.id, status: 'walkin', busyUntil });
    setWalkinCharger(null);
    snackbar.show('Charger marked as busy');
  }

  function openCreateCharger() {
    setEditingCharger(undefined);
    setFormVisible(true);
  }

  function openEditCharger(charger: Charger) {
    setEditingCharger(charger);
    setFormVisible(true);
  }

  if (stations.isLoading) {
    return <Screen title="Edit station" back><LoadingView message="Loading station…" /></Screen>;
  }
  if (stations.isError) {
    return (
      <Screen title="Edit station" back>
        <ErrorView error={stations.error} onRetry={() => void stations.refetch()} />
      </Screen>
    );
  }
  if (!station) {
    return (
      <Screen title="Edit station" back>
        <EmptyState icon="ev-station" title="Station not found" message="This station may have been removed." />
      </Screen>
    );
  }

  return (
    <Screen title="Edit station" back scroll>
      <View style={styles.content}>
        <StationForm station={station} saving={savingStation} submitError={submitError} onSubmit={saveStation} />
        <Text variant="bodySmall">
          Stations are submitted for review when created. Rejected stations return to review after you save an update; chargers can be added while a station is pending.
        </Text>
        <Divider />
        <View style={styles.sectionHeading}>
          <Text variant="titleLarge">Chargers</Text>
          <AppButton label="Add charger" icon="plus" mode="contained-tonal" onPress={openCreateCharger} />
        </View>
        {station.chargers.length === 0 ? (
          <EmptyState
            icon="ev-plug-type2"
            title="No chargers yet"
            message="Add a charger with its connector, power and rate."
            actionLabel="Add charger"
            onAction={openCreateCharger}
          />
        ) : null}
        {station.chargers.map((charger) => (
          <Card
            key={charger.id}
            title={charger.label}
            subtitle={`${charger.connector} · ${charger.powerKw} kW · ${charger.ratePerKwh} credits/kWh`}
            right={
              <StatusBadge
                status={charger.status}
                label={
                  charger.status === 'walkin'
                    ? charger.busyUntil
                      ? `Marked busy by owner until ${formatClock(charger.busyUntil)}`
                      : 'Marked busy by owner'
                    : undefined
                }
              />
            }
          >
            <View style={styles.actions}>
              <Button compact icon="pencil" onPress={() => openEditCharger(charger)}>Edit</Button>
              <Button
                compact
                icon="qrcode"
                onPress={() => router.push({ pathname: '/owner/charger/[id]/qr', params: { id: charger.id } })}
              >
                QR
              </Button>
              <Button
                compact
                icon={charger.status === 'offline' ? 'power-plug' : 'power-plug-off'}
                disabled={charger.status === 'busy' || setChargerStatus.isPending}
                onPress={() => void toggleCharger(charger)}
              >
                {charger.status === 'busy' ? 'Busy' : charger.status === 'offline' ? 'Available' : 'Offline'}
              </Button>
              {charger.status === 'walkin' ? (
                <Button compact icon="lock-open-outline" disabled={setChargerStatus.isPending} onPress={() => void setAvailable(charger)}>
                  Release
                </Button>
              ) : (
                <Button
                  compact
                  icon="account-clock-outline"
                  disabled={charger.status === 'busy' || charger.status === 'offline'}
                  onPress={() => setWalkinCharger(charger)}
                >
                  Mark as busy
                </Button>
              )}
              <Button
                compact
                icon="delete-outline"
                textColor={theme.colors.error}
                disabled={charger.status === 'busy'}
                onPress={() => setChargerToDelete(charger)}
              >
                Delete
              </Button>
            </View>
          </Card>
        ))}
        {chargerError ? <HelperText type="error">{errorMessage(chargerError)}</HelperText> : null}
        <ChargerForm
          key={editingCharger?.id ?? 'new-charger'}
          visible={formVisible}
          charger={editingCharger}
          loading={savingCharger}
          onSubmit={saveCharger}
          onDismiss={() => setFormVisible(false)}
        />
        <ConfirmDialog
          visible={!!chargerToDelete}
          title="Delete charger?"
          message="The charger can only be deleted if it has no session history."
          confirmLabel={deleteCharger.isPending ? 'Deleting…' : 'Delete charger'}
          danger
          onConfirm={() => void confirmDeleteCharger()}
          onDismiss={() => setChargerToDelete(null)}
        />
        {walkinCharger ? (
          <WalkinDialog onSubmit={submitWalkin} onDismiss={() => setWalkinCharger(null)} />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs, paddingTop: spacing.sm },
});
