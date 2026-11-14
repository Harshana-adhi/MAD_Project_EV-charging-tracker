import { Text } from 'react-native-paper';
import { formatCredits } from '@/lib/format';

export function Credits({ amount }: { amount: number }) {
  return <Text variant="titleMedium">{formatCredits(amount)}</Text>;
}
