import { StyleSheet, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

type RatingStarsProps = {
  value: number;
  onChange?: (value: number) => void;
  size?: number;
};

export function RatingStars({ value, onChange, size = 20 }: RatingStarsProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <IconButton
          key={star}
          icon={star <= value ? 'star' : 'star-outline'}
          iconColor={theme.colors.tertiary}
          size={size}
          onPress={onChange ? () => onChange(star) : undefined}
          disabled={!onChange}
          accessibilityLabel={`${star} star${star > 1 ? 's' : ''}`}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
