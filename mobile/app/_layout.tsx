import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, ThemeProvider } from 'expo-router';
import { queryClient } from '@/lib/queryClient';
import { lightTheme, darkTheme, navLightTheme, navDarkTheme } from '@/lib/theme';
import { AuthProvider } from '@/features/auth';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <PaperProvider theme={isDark ? darkTheme : lightTheme}>
          <ThemeProvider value={isDark ? navDarkTheme : navLightTheme}>
            <Stack screenOptions={{ headerShown: false }} />
          </ThemeProvider>
        </PaperProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
