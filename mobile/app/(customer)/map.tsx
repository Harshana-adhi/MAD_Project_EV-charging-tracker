import { useEffect, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Badge, FAB, IconButton, Searchbar, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { useStations } from '@/features/map/hooks';
import { LeafletMap, type LeafletMapHandle } from '@/features/map/components/LeafletMap';
import { StationCard } from '@/features/map/components/StationCard';
import { FilterSheet } from '@/features/map/components/FilterSheet';
import { AppButton, EmptyState, ErrorView, LoadingView } from '@/components';
import { useAppTheme, spacing } from '@/lib/theme';
import { DEFAULT_REGION } from '@/lib/config';
import type { StationFilters } from '@/types/domain';

export default function MapScreen() {
  const theme = useAppTheme();
  const { user } = useAuth();
  const mapRef = useRef<LeafletMapHandle>(null);

  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StationFilters>({});
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationDenied(true);
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
    })();
  }, []);

  const queryFilters: StationFilters = {
    ...filters,
    search: search || undefined,
    lat: location?.lat,
    lng: location?.lng,
  };

  const { data: stations, isLoading, isError, error, refetch } = useStations(queryFilters);
  const selectedStation = stations?.find((s) => s.id === selectedId) ?? null;

  const activeFilterCount =
    (filters.connector ? 1 : 0) +
    (filters.minPowerKw ? 1 : 0) +
    (filters.maxRate ? 1 : 0) +
    (filters.availableOnly ? 1 : 0);

  function clearFilters() {
    setFilters({});
    setSearch('');
  }

  function locateMe() {
    if (location) mapRef.current?.centreOn(location.lat, location.lng, 15);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {viewMode === 'map' ? (
        <>
          <LeafletMap
            ref={mapRef}
            stations={stations ?? []}
            me={location}
            dark={theme.dark}
            onSelectStation={setSelectedId}
          />

          <View style={styles.topBar}>
            <Searchbar
              placeholder="Search stations"
              value={search}
              onChangeText={setSearch}
              onIconPress={() => setSearch('')}
              style={[styles.searchbar, { backgroundColor: theme.colors.surface }]}
            />
            <View style={styles.topBarButton}>
              <IconButton
                icon="filter-variant"
                mode="contained"
                containerColor={theme.colors.surface}
                onPress={() => setFilterSheetVisible(true)}
              />
              {activeFilterCount > 0 ? <Badge style={styles.badge}>{activeFilterCount}</Badge> : null}
            </View>
            <IconButton
              icon="format-list-bulleted"
              mode="contained"
              containerColor={theme.colors.surface}
              onPress={() => setViewMode('list')}
            />
          </View>

          {locationDenied ? (
            <View style={[styles.banner, { backgroundColor: theme.colors.surface }]}>
              <Text variant="bodySmall">Location off – showing Kandy</Text>
            </View>
          ) : null}

          <View style={[styles.legend, { backgroundColor: theme.colors.surface }]}>
            <LegendDot color={theme.colors.marker.available} label="Available" />
            <LegendDot color={theme.colors.marker.busy} label="Busy" />
            <LegendDot color={theme.colors.marker.offline} label="Offline" />
          </View>

          <FAB
            icon="crosshairs-gps"
            style={[styles.fab, { backgroundColor: theme.colors.primaryContainer }]}
            color={theme.colors.onPrimaryContainer}
            onPress={locateMe}
            disabled={!location}
          />

          {isLoading ? (
            <View style={styles.centreOverlay}>
              <LoadingView />
            </View>
          ) : null}

          {selectedStation ? (
            <View style={[styles.bottomCard, { backgroundColor: theme.colors.surface }]}>
              <StationCard
                station={selectedStation}
                actions={
                  <AppButton
                    label="Details"
                    onPress={() => router.push(`/station/${selectedStation.id}`)}
                  />
                }
              />
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.listContainer}>
          <View style={styles.topBarList}>
            <Searchbar placeholder="Search stations" value={search} onChangeText={setSearch} />
            <IconButton icon="map" mode="contained" onPress={() => setViewMode('map')} />
          </View>
          {isLoading ? (
            <LoadingView />
          ) : isError ? (
            <ErrorView error={error} onRetry={refetch} />
          ) : !stations || stations.length === 0 ? (
            <EmptyState
              icon="map-marker-off"
              title="No stations found"
              message="No stations match your filters."
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <FlatList
              data={stations}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <StationCard station={item} onPress={() => router.push(`/station/${item.id}`)} />
              )}
            />
          )}
        </View>
      )}

      {!user ? (
        <View style={[styles.guestBar, { backgroundColor: theme.colors.surface }]}>
          <Text variant="bodySmall">Browsing as a guest.</Text>
          <AppButton label="Log in" mode="text" onPress={() => router.push('/(auth)/login')} />
        </View>
      ) : null}

      <FilterSheet
        visible={filterSheetVisible}
        onDismiss={() => setFilterSheetVisible(false)}
        filters={filters}
        onApply={setFilters}
      />
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendRow}>
      <MaterialCommunityIcons name="circle" size={10} color={color} />
      <Text variant="labelMedium">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    position: 'absolute',
    top: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  searchbar: { flex: 1 },
  topBarButton: { position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4 },
  banner: {
    position: 'absolute',
    top: 72,
    left: spacing.lg,
    right: spacing.lg,
    padding: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  legend: {
    position: 'absolute',
    bottom: spacing.lg,
    left: spacing.lg,
    borderRadius: 12,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  fab: { position: 'absolute', bottom: spacing.lg, right: spacing.lg },
  centreOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center' },
  bottomCard: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.lg },
  listContainer: { flex: 1, padding: spacing.lg },
  topBarList: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  listContent: { gap: spacing.md },
  guestBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
  },
});
