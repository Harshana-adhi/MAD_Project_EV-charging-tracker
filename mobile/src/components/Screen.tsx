import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar } from 'react-native-paper';
import { useAppTheme, spacing } from '@/lib/theme';

type ScreenProps = {
  children: ReactNode;
  title?: string;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({ children, title, scroll, refreshing, onRefresh }: ScreenProps) {
  const theme = useAppTheme();
  const background = { backgroundColor: theme.colors.background };

  return (
    <SafeAreaView style={[styles.safeArea, background]}>
      {title ? (
        <Appbar.Header elevated={false} style={{ backgroundColor: theme.colors.surface }}>
          <Appbar.Content title={title} titleStyle={{ color: theme.colors.onSurface }} />
        </Appbar.Header>
      ) : null}
      {scroll ? (
        <ScrollView
          style={[styles.content, background]}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            ) : undefined
          }
        >
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
  content: { flex: 1, padding: spacing.lg },
  scrollContent: { padding: spacing.lg },
});
