import { Redirect } from 'expo-router';
import { useAuth } from '@/features/auth';
import { AppPreloader } from '@/components';

export default function Index() {
  const { user, role, loading } = useAuth();

  if (loading) return <AppPreloader />;
  if (!user) return <Redirect href="/(customer)/map" />;
  if (role === 'owner') return <Redirect href="/(owner)/dashboard" />;
  if (role === 'admin') return <Redirect href="/(admin)/dashboard" />;
  return <Redirect href="/(customer)/map" />;
}
