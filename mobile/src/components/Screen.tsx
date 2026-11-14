import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from 'react-native-paper';
import { spacing } from '@/lib/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll }: ScreenProps) {
  const theme = useTheme();
  const background = { backgroundColor: theme.colors.background };

  return (
    <SafeAreaView style={[styles.safeArea, background]}>
      {scroll ? (
        <ScrollView style={[styles.content, background]} contentContainerStyle={styles.scrollContent}>
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, background]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, padding: spacing.md },
  scrollContent: { padding: spacing.md },
});
