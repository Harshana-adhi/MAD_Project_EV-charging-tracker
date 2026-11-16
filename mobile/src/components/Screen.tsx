import { useContext, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { HeaderShownContext } from 'expo-router/react-navigation';
import { Appbar } from 'react-native-paper';
import { router } from 'expo-router';
import { useAppTheme, spacing } from '@/lib/theme';
import { AppRefreshControl } from './AppRefreshControl';

type ScreenProps = {
  children: ReactNode;
  title?: string;
  back?: boolean;
  scroll?: boolean;
  refreshing?: boolean;
  // May return a promise; the pull spinner stops when it settles and the data is back.
  onRefresh?: () => unknown;
  // Stays pinned under the content, for a screen's main actions.
  footer?: ReactNode;
};

export function Screen({ children, title, back, scroll, refreshing, onRefresh, footer }: ScreenProps) {
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
            onRefresh ? <AppRefreshControl refreshing={!!refreshing} onRefresh={onRefresh} /> : undefined
          }
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, background]}>{children}</View>
      )}
      {footer ? (
        <View
          style={[
            styles.footer,
            { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.outlineVariant },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, padding: spacing.lg },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
