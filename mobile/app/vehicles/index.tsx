import { useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { router } from "expo-router";
import { IconButton, Menu, Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  ConfirmDialog,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  useSnackbar,
} from "@/components";
import { useDeleteVehicle, useVehicles } from "@/features/profile/hooks";
import { errorMessage } from "@/lib/errors";
import { spacing, useAppTheme } from "@/lib/theme";
import type { ConnectorType, Vehicle } from "@/types/domain";
import { usePullToRefresh } from "@/features/admin/usePullToRefresh";

const PLUG: Record<
  ConnectorType,
  { name: string; icon: keyof typeof MaterialCommunityIcons.glyphMap }
> = {
  TYPE1: { name: "Type 1", icon: "ev-plug-type1" },
  TYPE2: { name: "Type 2", icon: "ev-plug-type2" },
  CCS2: { name: "CCS2", icon: "ev-plug-ccs2" },
  CHADEMO: { name: "CHAdeMO", icon: "ev-plug-chademo" },
  GBT: { name: "GB/T", icon: "power-plug" },
};

export default function MyVehiclesScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { data: vehicles, isLoading, isError, error, refetch } = useVehicles();
  const { refreshing, onRefresh } = usePullToRefresh(refetch);
  const deleteVehicle = useDeleteVehicle();
  const [menuVehicleId, setMenuVehicleId] = useState<string | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);

  function openEdit(vehicle?: Vehicle) {
    setMenuVehicleId(null);
    router.push(
      vehicle
        ? { pathname: "/vehicles/edit", params: { id: vehicle.id } }
        : "/vehicles/edit",
    );
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
      snackbar.show("Vehicle deleted");
    } catch (err) {
      snackbar.show(errorMessage(err));
    }
  }

  function renderContent() {
    if (isLoading) return <LoadingView />;
    if (isError || !vehicles)
      return <ErrorView error={error} onRetry={refetch} />;
    if (vehicles.length === 0) {
      return (
        <EmptyState
          icon="car-electric"
          title="Add your car"
          message="Tell us which plug your car uses and we'll show the chargers that fit it."
          actionLabel="Add vehicle"
          onAction={() => openEdit()}
        />
      );
    }
    return (
      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text
          variant="bodyMedium"
          style={[styles.intro, { color: theme.colors.onSurfaceVariant }]}
        >
          We use your car's plug to show only the chargers that fit it.
        </Text>
        {vehicles.map((vehicle) => {
          const plug = PLUG[vehicle.connector];
          return (
            <View
              key={vehicle.id}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
            >
              {/* Only the car and its details open Edit; the options button sits beside them, not inside. */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Edit ${vehicle.makeModel}`}
                onPress={() => openEdit(vehicle)}
                style={({ pressed }) => [
                  styles.cardMain,
                  pressed ? { opacity: 0.6 } : null,
                ]}
              >
                <View
                  style={[
                    styles.carIcon,
                    { backgroundColor: theme.colors.primaryContainer },
                  ]}
                >
                  <MaterialCommunityIcons
                    name="car-electric"
                    size={28}
                    color={theme.colors.onPrimaryContainer}
                  />
                </View>
                <View style={styles.flex}>
                  <Text variant="titleMedium" numberOfLines={1}>
                    {vehicle.makeModel}
                  </Text>
                  <View style={styles.facts}>
                    <View
                      style={[
                        styles.fact,
                        { backgroundColor: theme.colors.surfaceVariant },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={plug.icon}
                        size={14}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text
                        variant="labelMedium"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {plug.name} plug
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.fact,
                        { backgroundColor: theme.colors.surfaceVariant },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name="battery-charging-high"
                        size={14}
                        color={theme.colors.onSurfaceVariant}
                      />
                      <Text
                        variant="labelMedium"
                        style={{
                          color: vehicle.batteryKwh
                            ? theme.colors.onSurfaceVariant
                            : theme.colors.primary,
                        }}
                      >
                        {vehicle.batteryKwh
                          ? `${vehicle.batteryKwh} kWh battery`
                          : "Add battery size"}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
              <Menu
                visible={menuVehicleId === vehicle.id}
                onDismiss={() => setMenuVehicleId(null)}
                anchor={
                  <IconButton
                    icon="dots-vertical"
                    accessibilityLabel={`Options for ${vehicle.makeModel}`}
                    onPress={() => setMenuVehicleId(vehicle.id)}
                    style={styles.menuButton}
                  />
                }
              >
                <Menu.Item
                  leadingIcon="pencil"
                  title="Edit"
                  onPress={() => openEdit(vehicle)}
                />
                <Menu.Item
                  leadingIcon="delete-outline"
                  title="Delete"
                  onPress={() => askDelete(vehicle)}
                />
              </Menu>
            </View>
          );
        })}
        <Pressable
          accessibilityRole="button"
          onPress={() => openEdit()}
          style={({ pressed }) => [
            styles.addCard,
            {
              borderColor: theme.colors.primary,
              backgroundColor: pressed
                ? theme.colors.primaryContainer
                : "transparent",
            },
          ]}
        >
          <MaterialCommunityIcons
            name="plus"
            size={20}
            color={theme.colors.primary}
          />
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Add another vehicle
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  return (
    <Screen title="My vehicles" back>
      {renderContent()}
      <ConfirmDialog
        visible={!!vehicleToDelete}
        title="Delete vehicle?"
        message={`${vehicleToDelete?.makeModel ?? "This vehicle"} will be removed from your account.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onDismiss={() => setVehicleToDelete(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { gap: spacing.md, paddingBottom: spacing.xl },
  intro: { marginBottom: spacing.xs },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: spacing.md,
  },
  cardMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  carIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  facts: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  fact: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  menuButton: { margin: 0, marginRight: -spacing.sm },
  addCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: 18,
    paddingVertical: spacing.lg,
  },
});
