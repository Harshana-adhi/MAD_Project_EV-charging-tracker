import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { QueryClientProvider } from '@tanstack/react-query';
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { queryClient } from '@/lib/queryClient';
import { lightTheme, darkTheme } from '@/lib/theme';
import { ThemePreferenceProvider, useThemePreference } from '@/lib/themePreference';
import { AuthProvider } from '@/features/auth';
import { useNotificationEvents } from '@/features/notifications/hooks';
import { SnackbarProvider } from '@/components';

// Keep the native splash on screen until our own branded AppPreloader has actually
// painted, instead of Expo's default auto-hide – that default can hide the native
// splash a frame early, showing a blank flash before our preloader appears.
SplashScreen.preventAutoHideAsync().catch(() => {});

function ThemedApp() {
  useNotificationEvents();

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => {});
  }, []);

  const scheme = useColorScheme();
  const { preference } = useThemePreference();
  const isDark = preference === 'dark' || (preference === 'system' && scheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };

  return (
    <PaperProvider theme={theme}>
      <ThemeProvider value={navTheme}>
        <SnackbarProvider>
          <StatusBar style={isDark ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false, headerShadowVisible: false }} />
        </SnackbarProvider>
      </ThemeProvider>
    </PaperProvider>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemePreferenceProvider>
          <ThemedApp />
        </ThemePreferenceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
