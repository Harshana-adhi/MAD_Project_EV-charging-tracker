import { Text } from 'react-native-paper';
import type { VariantProp } from 'react-native-paper/lib/typescript/components/Typography/types';
import { useAppTheme } from '@/lib/theme';
import { formatCredits } from '@/lib/format';

type CreditsProps = {
  amount: number;
  variant?: VariantProp<never>;
  signed?: boolean;
};

export function Credits({ amount, variant = 'titleMedium', signed }: CreditsProps) {
  const theme = useAppTheme();
  const color = signed
    ? amount >= 0
      ? theme.colors.money.credit
      : theme.colors.money.debit
    : theme.colors.onSurface;
  const sign = signed ? (amount >= 0 ? '+' : '−') : '';
  const text = `${sign}${formatCredits(amount)}`;

  return (
    <Text variant={variant} style={[{ color }, styles.tabular]}>
      {text}
    </Text>
  );
}

const styles = { tabular: { fontVariant: ['tabular-nums'] as const } };
