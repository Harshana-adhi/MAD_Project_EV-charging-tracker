import { StyleSheet } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useSnackbar } from '@/components';
import { errorMessage } from '@/lib/errors';
import { useAppTheme } from '@/lib/theme';
import type { StationSummary } from '@/types/domain';
import { useToggleFavourite } from './hooks';

export function FavouriteButton({ station, saved }: { station: StationSummary; saved: boolean }) {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const toggle = useToggleFavourite();

  return (
    <IconButton
      icon={saved ? 'heart' : 'heart-outline'}
      iconColor={saved ? theme.colors.primary : theme.colors.onSurface}
      accessibilityLabel={saved ? 'Remove from favourites' : 'Add to favourites'}
      accessibilityState={{ selected: saved, disabled: toggle.isPending }}
      style={styles.button}
      disabled={toggle.isPending}
      onPress={async (event) => {
        event.stopPropagation();
        try {
          const { favourite } = await toggle.mutateAsync(station);
          snackbar.show(favourite ? 'Added to favourites' : 'Removed from favourites');
        } catch (error) {
          snackbar.show(errorMessage(error));
        }
      }}
    />
  );
}

const styles = StyleSheet.create({
  button: { width: 48, height: 48, margin: 0 },
});
