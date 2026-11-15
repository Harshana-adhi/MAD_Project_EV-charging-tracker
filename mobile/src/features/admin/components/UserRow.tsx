import { StyleSheet, View } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { useAppTheme, spacing } from '@/lib/theme';
import type { User } from '@/types/domain';
import { ROLE_LABEL, initials, userColors } from '../userRoles';

type UserRowProps = {
  user: User;
  onPress: () => void;
};

const AVATAR_SIZE = 40;

export function UserRow({ user, onPress }: UserRowProps) {
  const theme = useAppTheme();
  const colors = userColors(user, theme);
  const badge = user.isBlocked ? 'Blocked' : ROLE_LABEL[user.role];

  return (
    <TouchableRipple
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${user.fullName}, ${badge}. Open actions`}
    >
      <View style={styles.row}>
        <View style={[styles.avatar, { backgroundColor: colors.bg }]}>
          <Text variant="labelLarge" style={{ color: colors.text }}>
            {initials(user.fullName)}
          </Text>
        </View>
        <View style={styles.text}>
          <Text variant="bodyLarge" numberOfLines={1}>
            {user.fullName}
          </Text>
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {user.email}
          </Text>
        </View>
        <View style={[styles.badge, { backgroundColor: colors.bg }]}>
          <Text variant="labelMedium" style={{ color: colors.text }}>
            {badge}
          </Text>
        </View>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, minWidth: 0 },
  badge: {
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
});
