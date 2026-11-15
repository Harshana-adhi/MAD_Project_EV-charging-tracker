import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Text } from 'react-native-paper';
import { useAppTheme, spacing } from '@/lib/theme';

// Leaf + lightning-bolt mark from the GreenCharge brand sheet (viewBox 0 0 100 100).
const LEAF = 'M22 80 C22 40 46 17 84 17 C84 55 61 80 22 80 Z';
const STEM = 'M22 80 L11 91';
const BOLT = 'M57 30 L41 53 L51 53 L46 69 L63 45 L53 45 Z';

type LogoMarkProps = {
  size?: number;
  /** Fixed colors override the theme (e.g. always-white mark on a colored background). */
  leafColor?: string;
  boltColor?: string;
};

export function LogoMark({ size = 40, leafColor, boltColor }: LogoMarkProps) {
  const theme = useAppTheme();
  const leaf = leafColor ?? theme.colors.primary;
  const bolt = boltColor ?? theme.colors.onPrimary;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="GreenCharge">
      <Path d={LEAF} fill={leaf} />
      <Path d={STEM} stroke={leaf} strokeWidth={6} strokeLinecap="round" fill="none" />
      <Path d={BOLT} fill={bolt} />
    </Svg>
  );
}

type LogoProps = LogoMarkProps & {
  /** Shows the "GreenCharge" wordmark next to the mark. */
  withWordmark?: boolean;
  wordmarkColor?: string;
};

export function Logo({ withWordmark = true, wordmarkColor, ...markProps }: LogoProps) {
  const theme = useAppTheme();

  if (!withWordmark) return <LogoMark {...markProps} />;

  return (
    <View style={styles.row}>
      <LogoMark {...markProps} />
      <Text
        variant="headlineSmall"
        style={[styles.wordmark, { color: wordmarkColor ?? theme.colors.onBackground }]}
      >
        Green<Text style={{ color: markProps.leafColor ?? theme.colors.primary, fontWeight: '800' }}>Charge</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wordmark: { fontWeight: '800', letterSpacing: -0.5 },
});
