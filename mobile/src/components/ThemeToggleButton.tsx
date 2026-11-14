import { IconButton } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';
import { useThemePreference } from '@/lib/themePreference';

type ThemeToggleButtonProps = {
  contained?: boolean;
};

export function ThemeToggleButton({ contained }: ThemeToggleButtonProps) {
  const theme = useAppTheme();
  const { setPreference } = useThemePreference();

  return (
    <IconButton
      icon={theme.dark ? 'weather-sunny' : 'weather-night'}
      mode={contained ? 'contained' : undefined}
      containerColor={contained ? theme.colors.surface : undefined}
      iconColor={theme.colors.onSurface}
      accessibilityLabel={theme.dark ? 'Switch to light theme' : 'Switch to dark theme'}
      onPress={() => setPreference(theme.dark ? 'light' : 'dark')}
    />
  );
}
