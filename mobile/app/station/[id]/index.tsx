import { useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Chip, IconButton, Menu, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '@/features/auth';
import { slotCost } from '@/features/bookings/slots';
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
import { formatClock, formatTime } from '@/lib/format';

export default function StationDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const theme = useAppTheme();
  const [directionsOpen, setDirectionsOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const { data: station, isLoading, isError, error, refetch } = useStation(id);
  const favourites = useFavourites();
  const reviews = useReviews(id);
  const isCustomer = user?.role === 'customer';
  const vehicles = useVehicles(isCustomer);
  const hasVehicles = (vehicles.data?.length ?? 0) > 0;
  const reviewCount = reviews.data?.length ?? 0;

  if (isLoading) return <LoadingView />;
  if (isError || !station) return <ErrorView error={error} onRetry={refetch} />;

  // Customers pick a charger by tapping its card. Until they do, the first one that fits their car is picked.
  const picked =
    station.chargers.find((charger) => charger.id === pickedId) ??
    station.chargers.find((charger) => vehicleForConnector(vehicles.data, charger.connector)) ??
    station.chargers[0] ??
    null;
  const pickedFits = !!picked && (!hasVehicles || !!vehicleForConnector(vehicles.data, picked.connector));
  const availability =
    station.availableCount > 0 ? 'available' : station.onlineCount === 0 ? 'offline' : 'busy';

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
    router.push({
      pathname: '/booking/new',
      params: pickedFits && picked ? { stationId: station!.id, chargerId: picked.id } : { stationId: station!.id },
    });
  }

  const footer = (
    <View style={styles.footer}>
      <Menu
        visible={directionsOpen}
        onDismiss={() => setDirectionsOpen(false)}
        anchor={
          <IconButton
            icon="directions"
            mode="outlined"
            accessibilityLabel="Directions"
            iconColor={theme.colors.primary}
            style={styles.directionsButton}
            onPress={() => setDirectionsOpen(true)}
          />
        }
      >
        <Menu.Item onPress={openDirectionsInApp} title="In GreenCharge" leadingIcon="map" />
        <Menu.Item onPress={() => openDirections('google')} title="Google Maps" leadingIcon="google-maps" />
        <Menu.Item onPress={() => openDirections('waze')} title="Waze" leadingIcon="map-marker-path" />
      </Menu>
      <AppButton
        label="Charge now"
        icon="qrcode-scan"
        mode={isCustomer ? 'outlined' : 'contained'}
        onPress={chargeHere}
        style={styles.footerButton}
      />
      {isCustomer ? (
        <AppButton
          label={pickedFits && picked ? `Book ${picked.label}` : 'Book'}
          icon="calendar-plus"
          onPress={bookCharger}
          style={styles.footerButton}
        />
      ) : null}
    </View>
  );

  return (
    <Screen scroll title={station.name} back footer={footer}>
      <View>
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
        <View style={[styles.freeBadge, { backgroundColor: theme.colors.status[availability].bg }]}>
          <MaterialCommunityIcons
            name={availability === 'available' ? 'check-circle' : availability === 'busy' ? 'clock-outline' : 'power-plug-off'}
            size={14}
            color={theme.colors.status[availability].text}
          />
          <Text variant="labelMedium" style={{ color: theme.colors.status[availability].text }}>
            {availability === 'offline'
              ? 'Offline'
              : `${station.availableCount} of ${station.chargerCount} free now`}
          </Text>
        </View>
      </View>

      <View style={styles.headerRow}>
        <Text variant="titleLarge" style={styles.name}>
          {station.name}
        </Text>
        {isCustomer && favourites.data ? (
          <FavouriteButton
            station={station}
            saved={favourites.data.some((favourite) => favourite.id === station.id)}
          />
        ) : null}
      </View>
      {isCustomer && favourites.isError && !favourites.data ? (
        <AppButton label="Retry loading favourites" mode="text" onPress={() => void favourites.refetch()} />
      ) : null}
      <View style={styles.metaRow}>
        <MaterialCommunityIcons name="map-marker-outline" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
          {station.address}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <MaterialCommunityIcons name="clock-outline" size={16} color={theme.colors.onSurfaceVariant} />
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {station.openingHours}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <RatingStars value={Math.round(station.avgRating ?? 0)} size={16} />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {station.avgRating !== null ? `${station.avgRating.toFixed(1)} (${station.reviewCount})` : 'No ratings yet'}
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
        {isCustomer ? 'Pick a charger' : 'Chargers'}
      </Text>
      {station.chargers.length === 0 ? (
        <EmptyState icon="ev-station" title="No chargers yet" message="This station has no chargers listed." />
      ) : (
        <View style={styles.chargerList}>
          {station.chargers.map((charger) => {
            const fits = vehicleForConnector(vehicles.data, charger.connector);
            const selected = isCustomer && picked?.id === charger.id;
            return (
              <Pressable
                key={charger.id}
                disabled={!isCustomer}
                onPress={() => setPickedId(charger.id)}
                accessibilityRole={isCustomer ? 'radio' : undefined}
                accessibilityState={isCustomer ? { selected } : undefined}
                style={[
                  styles.chargerCard,
                  {
                    backgroundColor: selected ? theme.colors.primaryContainer + '55' : theme.colors.surface,
                    borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                    borderWidth: selected ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.chargerTop}>
                  <View style={styles.chargerTitle}>
                    <Text variant="titleMedium">{charger.label}</Text>
                    <ConnectorChip connector={charger.connector} />
                  </View>
                  {charger.status === 'walkin' ? (
                    <StatusBadge
                      status="walkin"
                      label={
                        charger.busyUntil
                          ? `Marked busy by owner until ${formatClock(charger.busyUntil)}`
                          : 'Marked busy by owner'
                      }
                    />
                  ) : charger.reservedUntil ? (
                    <StatusBadge status="reserved" label={`Booked until ${formatTime(charger.reservedUntil)}`} />
                  ) : (
                    <StatusBadge status={charger.status} />
                  )}
                </View>
                <View style={styles.specRow}>
                  <Spec icon="lightning-bolt" text={`${charger.powerKw} kW`} />
                  <Spec icon="cash" text={`LKR ${charger.ratePerKwh} / kWh`} />
                  <Spec icon="timer-outline" text={`≈ LKR ${slotCost(charger.powerKw, charger.ratePerKwh, 30)} / 30 min`} />
                </View>
                {hasVehicles ? (
                  <View style={styles.fitRow}>
                    <MaterialCommunityIcons
                      name={fits ? 'check-circle-outline' : 'alert-circle-outline'}
                      size={16}
                      color={fits ? theme.colors.primary : theme.colors.error}
                    />
                    <Text variant="bodySmall" style={{ color: fits ? theme.colors.primary : theme.colors.error }}>
                      {fits ? `Fits your ${fits.makeModel}` : "Doesn't fit your saved vehicles"}
                    </Text>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
      {station.chargers.length > 1 ? (
        <View style={[styles.hintRow]}>
          <MaterialCommunityIcons name="qrcode" size={16} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
            Each charger has its own QR code. To charge now, scan the one on the charger you plug into.
          </Text>
        </View>
      ) : null}

      <View style={[styles.reviewsHeader, styles.sectionTitle]}>
        <Text variant="titleMedium">Reviews{reviewCount > 0 ? ` (${reviewCount})` : ''}</Text>
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
          <MaterialCommunityIcons name="star-outline" size={22} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
            No reviews yet. Customers can rate this station after charging here.
          </Text>
        </View>
      ) : null}
      <View style={styles.reviewList}>
        {reviews.data?.slice(0, 3).map((review) => <ReviewCard key={review.id} review={review} />)}
      </View>
    </Screen>
  );
}

function Spec({ icon, text }: { icon: string; text: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.spec}>
      <MaterialCommunityIcons
        name={icon as keyof typeof MaterialCommunityIcons.glyphMap}
        size={14}
        color={theme.colors.onSurfaceVariant}
      />
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  carousel: { height: 180, marginBottom: spacing.md },
  photo: { width: 320, height: 180, borderRadius: 12, marginRight: spacing.sm },
  photoPlaceholder: {
    height: 140,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  freeBadge: {
    position: 'absolute',
    left: spacing.md,
    bottom: spacing.md + spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: 999,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  sectionTitle: { marginTop: spacing.xl, marginBottom: spacing.sm },
  chargerList: { gap: spacing.sm },
  chargerCard: { borderRadius: 16, padding: spacing.md, gap: spacing.sm },
  chargerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm },
  chargerTitle: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  specRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs },
  spec: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  reviewsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  reviewsEmpty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  reviewList: { gap: spacing.sm, marginBottom: spacing.lg },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  directionsButton: { margin: 0, borderRadius: 12 },
  footerButton: { flex: 1 },
});