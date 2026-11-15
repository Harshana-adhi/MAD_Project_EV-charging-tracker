import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { IconButton } from 'react-native-paper';
import { useAppTheme } from '@/lib/theme';

type RatingStarsProps = {
  value: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  size?: number;
};

const stars = [1, 2, 3, 4, 5];

export function RatingStars({ value, onChange, disabled, size = 20 }: RatingStarsProps) {
  const theme = useAppTheme();

  if (!onChange) {
    return (
      <View style={styles.display} accessible accessibilityLabel={`${value} out of 5 stars`}>
        {stars.map((star) => (
          <MaterialCommunityIcons
            key={star}
            name={star <= value ? 'star' : 'star-outline'}
            size={size}
            color={theme.colors.tertiary}
          />
        ))}
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {stars.map((star) => (
        <IconButton
          key={star}
          icon={star <= value ? 'star' : 'star-outline'}
          iconColor={theme.colors.tertiary}
          size={size}
          onPress={() => onChange(star)}
          disabled={disabled}
          accessibilityLabel={`Rate ${star} star${star > 1 ? 's' : ''}`}
          accessibilityState={{ selected: star === value, disabled }}
          style={styles.button}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  display: { flexDirection: 'row', gap: 4, paddingVertical: 4 },
  button: { width: 48, height: 48, margin: 0 },
});
