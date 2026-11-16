import { useState } from 'react';
import { Image, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Chip, Menu, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { useStation } from '@/features/map/hooks';
import { useVehicles } from '@/features/profile/hooks';
import { vehicleForConnector } from '@/features/profile/vehicleFit';
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
import { formatTime } from '@/lib/format';

export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useAppTheme();
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const { data: station, isLoading, isError, error, refetch } = useStation(id);
  const favourites = useFavourites();
  const reviews = useReviews(id);
  const isCustomer = user?.role === 'customer';
  const vehicles = useVehicles(isCustomer);
  const hasVehicles = (vehicles.data?.length ?? 0) > 0;
  const reviewCount = reviews.data?.length ?? 0;

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

  function openDirectionsInApp() {
    setDirectionsOpen(false);
    router.push({ pathname: '/(customer)/map', params: { routeToId: station!.id } });
  }

  function chargeHere() {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    router.push('/scan');
  }

  function bookCharger() {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }
    router.push({ pathname: '/booking/new', params: { stationId: station!.id } });
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
          status={
            station.availableCount > 0
              ? 'available'
              : station.onlineCount === 0
                ? 'offline'
                : 'busy'
          }
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
        station.chargers.map((charger) => {
          const fits = vehicleForConnector(vehicles.data, charger.connector);
          return (
            <View key={charger.id} style={styles.chargerRow}>
              <View style={styles.chargerMain}>
                <View style={styles.chargerInfo}>
                  <Text variant="bodyLarge">{charger.label}</Text>
                  <ConnectorChip connector={charger.connector} />
                  <Text variant="bodySmall">{charger.powerKw} kW</Text>
                  <Text variant="bodySmall">LKR {charger.ratePerKwh} / kWh</Text>
                </View>
                {hasVehicles ? (
                  <View style={styles.fitRow}>
                    <MaterialCommunityIcons
                      name={fits ? 'check-circle-outline' : 'close-circle-outline'}
                      size={14}
                      color={fits ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    />
                    <Text
                      variant="bodySmall"
                      style={{ color: fits ? theme.colors.primary : theme.colors.onSurfaceVariant }}
                    >
                      {fits ? `Fits your ${fits.makeModel}` : "Doesn't fit your saved vehicles"}
                    </Text>
                  </View>
                ) : null}
              </View>
              {charger.reservedUntil ? (
                <StatusBadge status="reserved" label={`Reserved until ${formatTime(charger.reservedUntil)}`} />
              ) : (
                <StatusBadge status={charger.status} />
              )}
            </View>
          );
        })
      )}
      {station.chargers.length > 1 ? (
        <Text variant="bodySmall" style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
          Each charger has its own QR code. Scan the one on the charger you plug into.
        </Text>
      ) : null}

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
          <Menu.Item onPress={openDirectionsInApp} title="In GreenCharge" leadingIcon="map" />
          <Menu.Item onPress={() => openDirections('google')} title="Google Maps" leadingIcon="google-maps" />
          <Menu.Item onPress={() => openDirections('waze')} title="Waze" leadingIcon="map-marker-path" />
        </Menu>
        <AppButton label="Charge here" onPress={chargeHere} />
      </View>
      {isCustomer ? (
        <AppButton
          label="Book a charger"
          mode="outlined"
          icon="calendar-clock"
          onPress={bookCharger}
          style={styles.bookButton}
        />
      ) : null}

      <View style={[styles.reviewsHeader, styles.sectionTitle]}>
        <Text variant="titleMedium">
          Reviews{reviewCount > 0 ? ` (${reviewCount})` : ''}
        </Text>
        {reviewCount > 0 ? (
          <AppButton
            label="See all"
            mode="text"
            onPress={() => router.push({ pathname: '/station/[id]/reviews', params: { id: station.id } })}
          />
        ) : null}
      </View>
      {reviews.isPending && <LoadingView message="Loading reviews" />}
      {reviews.isError && <ErrorView error={reviews.error} onRetry={() => void reviews.refetch()} />}
      {reviewCount === 0 && reviews.isSuccess ? (
        <View style={[styles.reviewsEmpty, { borderColor: theme.colors.outlineVariant }]}>
          <MaterialCommunityIcons name="star-outline" size={28} color={theme.colors.onSurfaceVariant} />
          <Text variant="titleSmall">No reviews yet</Text>
          <Text variant="bodySmall" style={[styles.centerText, { color: theme.colors.onSurfaceVariant }]}>
            Customers can rate this station after a charging session here.
          </Text>
        </View>
      ) : null}
      <View style={styles.reviewList}>
        {reviews.data?.slice(0, 3).map((review) => <ReviewCard key={review.id} review={review} />)}
      </View>
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
  chargerMain: { flex: 1, gap: spacing.xs },
  chargerInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  fitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hint: { marginTop: spacing.xs },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewsEmpty: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  centerText: { textAlign: 'center' },
  reviewList: { gap: spacing.sm, marginBottom: spacing.lg },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  bookButton: { marginTop: spacing.sm },
});
