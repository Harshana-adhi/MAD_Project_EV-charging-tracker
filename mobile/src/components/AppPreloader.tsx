import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { LogoMark } from './Logo';
import { spacing } from '@/lib/theme';
import { MIN_PRELOADER_MS } from '@/lib/preloader';

// Fixed brand colors (not theme-dependent): this must match app.json's native splash screen
// exactly, light or dark mode, so there is no color flash when the JS preloader takes over.
const BRAND_GREEN = '#15803D';
const LIGHT_GREEN = '#DCFCE7';

const BAR_WIDTH = 140;

function FillingBar() {
  const fill = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // A single pass, timed to the preloader's guaranteed minimum display time – never loops,
    // so it can't look like it "restarted" even if the real session check takes a little longer.
    const animation = Animated.timing(fill, {
      toValue: 1,
      duration: MIN_PRELOADER_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [fill]);

  return (
    <View style={styles.barTrack}>
      <Animated.View
        style={[
          styles.barFill,
          {
            width: fill.interpolate({ inputRange: [0, 1], outputRange: [0, BAR_WIDTH] }),
          },
        ]}
      />
    </View>
  );
}

// Shown once at app start while the stored session is being resolved.
export function AppPreloader() {
  return (
    <View style={styles.container}>
      <View style={styles.center}>
        <LogoMark size={88} leafColor="#FFFFFF" boltColor={BRAND_GREEN} />
        <Text variant="headlineMedium" style={[styles.wordmark, { color: '#FFFFFF' }]}>
          Green<Text style={[styles.wordmark, { color: LIGHT_GREEN }]}>Charge</Text>
        </Text>
        <Text variant="labelMedium" style={[styles.tagline, { color: LIGHT_GREEN }]}>
          FIND. CHARGE. GO GREEN.
        </Text>
      </View>
      <FillingBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND_GREEN },
  center: { alignItems: 'center', gap: spacing.sm },
  wordmark: { fontWeight: '800', letterSpacing: -0.5 },
  tagline: { letterSpacing: 2 },
  barTrack: {
    position: 'absolute',
    bottom: 72,
    width: BAR_WIDTH,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#FFFFFF',
  },
});
