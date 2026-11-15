import { useContext, type ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { HeaderShownContext } from 'expo-router/react-navigation';
import { Appbar } from 'react-native-paper';
import { router } from 'expo-router';
import { useAppTheme, spacing } from '@/lib/theme';

type ScreenProps = {
  children: ReactNode;
  title?: string;
  back?: boolean;
  scroll?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({ children, title, back, scroll, refreshing, onRefresh }: ScreenProps) {
  const theme = useAppTheme();
  const background = { backgroundColor: theme.colors.background };
  const navigatorHeaderShown = useContext(HeaderShownContext);

  // The tab or stack header and Appbar.Header already handle the top inset.
  const edges: Edge[] = navigatorHeaderShown
    ? ['left', 'right']
    : title
      ? ['left', 'right', 'bottom']
      : ['top', 'left', 'right', 'bottom'];

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, background]}>
      {title ? (
        <Appbar.Header elevated={false} style={{ backgroundColor: theme.colors.surface }}>
          {back && router.canGoBack() ? <Appbar.BackAction onPress={() => router.back()} /> : null}
          <Appbar.Content title={title} titleStyle={{ color: theme.colors.onSurface }} />
        </Appbar.Header>
      ) : null}
      {scroll ? (
        <ScrollView
          style={[styles.scroll, background]}
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
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
});
