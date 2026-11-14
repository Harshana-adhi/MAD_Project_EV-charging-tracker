import { StyleSheet, View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { colors } from '@/lib/theme';

type RatingStarsProps = {
  rating: number;
  onChange?: (rating: number) => void;
};

export function RatingStars({ rating, onChange }: RatingStarsProps) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((value) => (
        <IconButton
          key={value}
          icon={value <= rating ? 'star' : 'star-outline'}
          iconColor={colors.busy}
          size={20}
          onPress={onChange ? () => onChange(value) : undefined}
          disabled={!onChange}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
});
