import { router } from 'expo-router';
import { EmptyState, ErrorView, LoadingView, Screen } from '@/components';
import { useAuth } from '@/features/auth';
import { StationCard } from '@/features/map/components/StationCard';
import { FavouriteButton } from '@/features/reviews/FavouriteButton';
import { useFavourites } from '@/features/reviews/hooks';

export default function FavouritesScreen() {
  const { role, loading } = useAuth();
  const favourites = useFavourites();

  if (loading) {
    return (
      <Screen title="Favourites" back>
        <LoadingView />
      </Screen>
    );
  }
  if (role !== 'customer') {
    return (
      <Screen title="Favourites" back>
        <EmptyState
          icon="heart-outline"
          title="Customer account required"
          message="Sign in as a customer to save your favourite charging stations."
        />
      </Screen>
    );
  }

  return (
    <Screen
      title="Favourites"
      back
      scroll
      refreshing={favourites.isRefetching}
      onRefresh={() => void favourites.refetch()}
    >
      {favourites.isPending && <LoadingView />}
      {favourites.isError && (
        <ErrorView error={favourites.error} onRetry={() => void favourites.refetch()} />
      )}
      {favourites.isSuccess && favourites.data.length === 0 && (
        <EmptyState
          icon="heart-outline"
          title="No favourites yet"
          message="Tap the heart on a station to save it."
        />
      )}
      {favourites.data?.map((station) => (
        <StationCard
          key={station.id}
          station={station}
          onPress={() => router.push({ pathname: '/station/[id]', params: { id: station.id } })}
          actions={<FavouriteButton station={station} saved />}
        />
      ))}
    </Screen>
  );
}
