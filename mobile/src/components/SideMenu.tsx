import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { BlurView } from 'expo-blur';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing, useAppTheme } from '@/lib/theme';
import { LogoMark } from './Logo';

export type SideMenuItem = {
  label: string;
  hint: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  href: Href;
  // A badge, e.g. how many items are waiting. Hidden when 0 or missing.
  count?: number;
};

type SideMenuProps = {
  visible: boolean;
  onClose: () => void;
  subtitle: string; // e.g. "Owner menu"
  items: SideMenuItem[];
};

// The three-line button at the top left of a role's screens.
export function SideMenuButton({ onPress }: { onPress: () => void }) {
  return <IconButton icon="menu" accessibilityLabel="Open menu" onPress={onPress} style={styles.menuButton} />;
}

// A panel that slides in from the left over a blurred, untouchable screen. It closes with its
// close button, a tap outside, or the phone's back button; picking an item closes it and opens that screen.
export function SideMenu({ visible, onClose, subtitle, items }: SideMenuProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(320, width * 0.82);

  // Keep the modal up while the panel slides out, then unmount it.
  const [mounted, setMounted] = useState(visible);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) setMounted(true);
    Animated.timing(progress, {
      toValue: visible ? 1 : 0,
      duration: visible ? 220 : 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
  }, [visible, progress]);

  function go(href: Href) {
    onClose();
    router.push(href);
  }

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <BlurView intensity={25} tint={theme.dark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        {/* Covers the screen so nothing behind can be touched; a tap here closes the menu. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close menu"
          onPress={onClose}
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.panel,
          {
            width: panelWidth,
            paddingTop: insets.top + spacing.sm,
            paddingBottom: insets.bottom + spacing.md,
            backgroundColor: theme.colors.surface,
            transform: [{ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] }) }],
          },
        ]}
      >
        <View style={styles.header}>
          <LogoMark size={30} />
          <View style={styles.flex}>
            <Text variant="titleMedium">GreenCharge</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {subtitle}
            </Text>
          </View>
          <IconButton icon="close" mode="contained-tonal" accessibilityLabel="Close menu" onPress={onClose} />
        </View>

        <Text variant="labelLarge" style={[styles.section, { color: theme.colors.primary }]}>
          Quick actions
        </Text>
        <ScrollView contentContainerStyle={styles.items}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              accessibilityRole="button"
              onPress={() => go(item.href)}
              style={({ pressed }) => [styles.item, pressed ? { backgroundColor: theme.colors.surfaceVariant } : null]}
            >
              <View style={[styles.icon, { backgroundColor: theme.colors.primaryContainer }]}>
                <MaterialCommunityIcons name={item.icon} size={22} color={theme.colors.onPrimaryContainer} />
              </View>
              <View style={styles.flex}>
                <Text variant="titleSmall">{item.label}</Text>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  {item.hint}
                </Text>
              </View>
              {item.count ? (
                <View style={[styles.count, { backgroundColor: theme.colors.primary }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onPrimary }}>
                    {item.count}
                  </Text>
                </View>
              ) : null}
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
            </Pressable>
          ))}
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  menuButton: { marginLeft: spacing.xs, marginRight: 0 },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    paddingHorizontal: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md },
  section: { marginTop: spacing.sm, marginBottom: spacing.xs, marginLeft: spacing.xs },
  items: { gap: 2 },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderRadius: 12, padding: spacing.sm },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
});
