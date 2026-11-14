import { MD3LightTheme, MD3DarkTheme } from 'react-native-paper';

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
