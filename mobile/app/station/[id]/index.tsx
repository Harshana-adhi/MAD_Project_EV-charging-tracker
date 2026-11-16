import { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Chip, Menu, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { useStation } from '@/features/map/hooks';
import { FavouriteButton } from '@/features/reviews/FavouriteButton';
import { useFavourites, useReviews } from '@/features/reviews/hooks';
import { ReviewCard } from '@/features/reviews/ReviewCard';
import {
  AppButton,
  ConnectorChip,
  EmptyState,
  ErrorView,
  LoadingView,
  RatingStars,
  Screen,
  StatusBadge,
} from '@/components';
import { useAppTheme, spacing } from '@/lib/theme';

export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useAppTheme();
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const { data: station, isLoading, isError, error, refetch } = useStation(id);
  const favourites = useFavourites();
  const reviews = useReviews(id);

  if (isLoading) return <LoadingView />;
  if (isError || !station) return <ErrorView error={error} onRetry={refetch} />;

  function openDirections(app: 'google' | 'waze') {
    setDirectionsOpen(false);
    const url =
      app === 'google'
        ? `https://www.google.com/maps/dir/?api=1&destination=${station!.lat},${station!.lng}`
        : `https://waze.com/ul?ll=${station!.lat},${station!.lng}&navigate=yes`;
    Linking.openURL(url);
  }

  function chargeHere() {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/scan');
  }

  return (
    <Screen scroll title={station.name} back>
      {station.photos.length > 0 ? (
        <ScrollView horizontal pagingEnabled style={styles.carousel}>
          {station.photos.map((photo) => (
            <Image key={photo} source={{ uri: photo }} style={styles.photo} />
          ))}
        </ScrollView>
      ) : (
        <View style={[styles.photoPlaceholder, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons name="ev-station" size={48} color={theme.colors.onSurfaceVariant} />
        </View>
      )}

      <View style={styles.headerRow}>
        <Text variant="titleLarge" style={styles.name}>
          {station.name}
        </Text>
        <StatusBadge
          status={station.availableCount > 0 ? 'available' : 'busy'}
          count={`${station.availableCount}/${station.chargerCount}`}
        />
        {user?.role === 'customer' && favourites.data ? (
          <FavouriteButton
            station={station}
            saved={favourites.data.some((favourite) => favourite.id === station.id)}
          />
        ) : null}
      </View>
      {user?.role === 'customer' && favourites.isError && !favourites.data ? (
        <AppButton
          label="Retry loading favourites"
          mode="text"
          onPress={() => void favourites.refetch()}
        />
      ) : null}
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {station.address}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {station.openingHours}
      </Text>

      <View style={styles.ratingRow}>
        <RatingStars value={Math.round(station.avgRating ?? 0)} size={16} />
        <Text variant="bodySmall">
          {station.avgRating !== null ? `${station.avgRating.toFixed(1)} (${station.reviewCount})` : 'No reviews yet'}
        </Text>
      </View>

      {station.amenities.length > 0 ? (
        <View style={styles.chipRow}>
          {station.amenities.map((amenity) => (
            <Chip key={amenity} compact>
              {amenity}
            </Chip>
          ))}
        </View>
      ) : null}

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Chargers
      </Text>
      {station.chargers.length === 0 ? (
        <EmptyState icon="ev-station" title="No chargers yet" message="This station has no chargers listed." />
      ) : (
        station.chargers.map((charger) => (
          <View key={charger.id} style={styles.chargerRow}>
            <View style={styles.chargerInfo}>
              <Text variant="bodyLarge">{charger.label}</Text>
              <ConnectorChip connector={charger.connector} />
              <Text variant="bodySmall">{charger.powerKw} kW</Text>
              <Text variant="bodySmall">LKR {charger.ratePerKwh} / kWh</Text>
            </View>
            <StatusBadge status={charger.status} />
          </View>
        ))
      )}

      <View style={styles.actions}>
        <Menu
          visible={directionsOpen}
          onDismiss={() => setDirectionsOpen(false)}
          anchor={
            <AppButton
              label="Directions"
              mode="outlined"
              icon="directions"
              onPress={() => setDirectionsOpen(true)}
            />
          }
        >
          <Menu.Item onPress={() => openDirections('google')} title="Google Maps" leadingIcon="google-maps" />
          <Menu.Item onPress={() => openDirections('waze')} title="Waze" leadingIcon="map-marker-path" />
        </Menu>
        <AppButton label="Charge here" onPress={chargeHere} />
      </View>

      <Text variant="titleMedium" style={styles.sectionTitle}>
        Reviews
      </Text>
      {reviews.isPending && <LoadingView message="Loading reviews" />}
      {reviews.isError && <ErrorView error={reviews.error} onRetry={() => void reviews.refetch()} />}
      {reviews.data?.length === 0 && <Text variant="bodyMedium">No reviews yet</Text>}
      {reviews.data?.slice(0, 3).map((review) => <ReviewCard key={review.id} review={review} />)}
      <AppButton
        label="See all reviews"
        mode="outlined"
        onPress={() => router.push({ pathname: '/station/[id]/reviews', params: { id: station.id } })}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  carousel: { height: 180, marginBottom: spacing.md },
  photo: { width: 320, height: 180, borderRadius: 12, marginRight: spacing.sm },
  photoPlaceholder: {
    height: 160,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.sm },
  name: { flex: 1 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  chargerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  chargerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap', flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
});
