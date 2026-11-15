import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { LogoMark } from './Logo';
import { spacing } from '@/lib/theme';

// Fixed brand colors (not theme-dependent): this must match app.json's native splash screen
// exactly, light or dark mode, so there is no color flash when the JS preloader takes over.
const BRAND_GREEN = '#15803D';
const LIGHT_GREEN = '#DCFCE7';

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
      <ActivityIndicator style={styles.spinner} size="small" color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: BRAND_GREEN },
  center: { alignItems: 'center', gap: spacing.sm },
  wordmark: { fontWeight: '800', letterSpacing: -0.5 },
  tagline: { letterSpacing: 2 },
  spinner: { position: 'absolute', bottom: 64 },
});
