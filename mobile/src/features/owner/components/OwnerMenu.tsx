import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { router, type Href } from 'expo-router';
import { BlurView } from 'expo-blur';
import { IconButton, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogoMark } from '@/components';
import { useOwnerBookings } from '@/features/bookings/hooks';
import { spacing, useAppTheme } from '@/lib/theme';

type MenuItem = {
  label: string;
  hint: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  href: Href;
};

const ITEMS: MenuItem[] = [
  { label: 'Bookings', hint: 'Who booked your chargers', icon: 'calendar-clock', href: '/owner/bookings' },
  { label: 'Add station', hint: 'Set up a new charging point', icon: 'plus-circle-outline', href: '/owner/station/new' },
  { label: 'My stations', hint: 'Edit stations and chargers', icon: 'ev-station', href: '/(owner)/stations' },
  { label: 'Sessions', hint: 'Charging sessions and disputes', icon: 'lightning-bolt', href: '/owner/sessions' },
  { label: 'Reviews', hint: 'What customers said', icon: 'star-outline', href: '/owner/reviews' },
  { label: 'Earnings', hint: 'Daily and per-station totals', icon: 'chart-bar', href: '/(owner)/earnings' },
  { label: 'Wallet', hint: 'Balance and withdrawals', icon: 'wallet-outline', href: '/owner/wallet' },
];

// The three-line button at the top left of the owner screens, and the menu it opens.
export function OwnerMenuButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton icon="menu" accessibilityLabel="Open menu" onPress={() => setOpen(true)} style={styles.menuButton} />
      <OwnerMenu visible={open} onClose={() => setOpen(false)} />
    </>
  );
}

function OwnerMenu({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(320, width * 0.82);
  const bookings = useOwnerBookings();
  const upcomingCount = (bookings.data ?? []).filter((booking) => new Date(booking.endAt).getTime() > Date.now()).length;

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
        {/* Covers the dashboard so nothing behind can be touched; a tap here closes the menu. */}
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
              Owner menu
            </Text>
          </View>
          <IconButton icon="close" mode="contained-tonal" accessibilityLabel="Close menu" onPress={onClose} />
        </View>

        <Text variant="labelLarge" style={[styles.section, { color: theme.colors.primary }]}>
          Quick actions
        </Text>
        <ScrollView contentContainerStyle={styles.items}>
          {ITEMS.map((item) => (
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
              {item.label === 'Bookings' && upcomingCount > 0 ? (
                <View style={[styles.count, { backgroundColor: theme.colors.primary }]}>
                  <Text variant="labelSmall" style={{ color: theme.colors.onPrimary }}>
                    {upcomingCount}
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
