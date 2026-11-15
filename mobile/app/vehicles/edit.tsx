import { useLocalSearchParams } from 'expo-router';
import { ErrorView, LoadingView, Screen } from '@/components';
import { VehicleForm } from '@/features/profile/components/VehicleForm';
import { useVehicles } from '@/features/profile/hooks';

export default function EditVehicleScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data: vehicles, isLoading, isError, error, refetch } = useVehicles();
  const vehicle = vehicles?.find((item) => item.id === id);

  function renderContent() {
    if (!id) return <VehicleForm />;
    if (isLoading) return <LoadingView />;
    if (isError) return <ErrorView error={error} onRetry={refetch} />;
    if (!vehicle) return <ErrorView error={new Error('NOT_FOUND')} />;
    return <VehicleForm vehicle={vehicle} />;
  }

  return (
    <Screen title={id ? 'Edit vehicle' : 'Add vehicle'} back scroll>
      {renderContent()}
    </Screen>
  );
}
