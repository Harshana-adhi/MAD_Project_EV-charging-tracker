import { Redirect, Stack } from 'expo-router';
import { LoadingView } from '@/components';
import { useAuth } from '@/features/auth';

export default function StandaloneOwnerLayout() {
  const { role, loading } = useAuth();

  if (loading) return <LoadingView />;
  if (role !== 'owner') return <Redirect href="/" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
