import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';
import { DarkTheme as NavDarkTheme, DefaultTheme as NavDefaultTheme } from 'expo-router';

export const colors = {
  primary: '#0F766E',
  available: '#16A34A',
  busy: '#F59E0B',
  offline: '#6B7280',
  error: '#DC2626',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24 };

export const lightTheme = {
  ...MD3LightTheme,
  colors: { ...MD3LightTheme.colors, primary: colors.primary, error: colors.error },
};

export const darkTheme = {
  ...MD3DarkTheme,
  colors: { ...MD3DarkTheme.colors, primary: colors.primary, error: colors.error },
};

export const navLightTheme = {
  ...NavDefaultTheme,
  colors: {
    ...NavDefaultTheme.colors,
    primary: colors.primary,
    background: lightTheme.colors.background,
    card: lightTheme.colors.elevation.level2,
    text: lightTheme.colors.onSurface,
  },
};

export const navDarkTheme = {
  ...NavDarkTheme,
  colors: {
    ...NavDarkTheme.colors,
    primary: colors.primary,
    background: darkTheme.colors.background,
    card: darkTheme.colors.elevation.level2,
    text: darkTheme.colors.onSurface,
  },
};
