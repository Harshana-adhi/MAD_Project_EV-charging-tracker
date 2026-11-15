import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate } from '@/lib/format';
import { useAppTheme, spacing } from '@/lib/theme';
import type { User } from '@/types/domain';
import { ROLE_LABEL } from '../userRoles';

type UserDetailsDialogProps = {
  user: User;
  canBlock: boolean;
  onBlock: () => void;
  onResetPassword: () => void;
  onDismiss: () => void;
};

export function UserDetailsDialog({
  user,
  canBlock,
  onBlock,
  onResetPassword,
  onDismiss,
}: UserDetailsDialogProps) {
  const theme = useAppTheme();
  const secondary = { color: theme.colors.onSurfaceVariant };

  const details: { icon: keyof typeof MaterialCommunityIcons.glyphMap; text: string }[] = [
    { icon: 'email-outline', text: user.email },
    { icon: 'phone-outline', text: user.phone ?? 'No phone number' },
    { icon: 'account-outline', text: ROLE_LABEL[user.role] },
    { icon: 'calendar-outline', text: `Joined ${formatDate(user.createdAt)}` },
  ];

  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss}>
        <Dialog.Title>{user.fullName}</Dialog.Title>
        <Dialog.Content style={styles.content}>
          {user.isBlocked ? (
            <Text variant="labelLarge" style={{ color: theme.colors.error }}>
              This account is blocked
            </Text>
          ) : null}
          {details.map((detail) => (
            <View key={detail.icon} style={styles.detail}>
              <MaterialCommunityIcons
                name={detail.icon}
                size={20}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium" style={secondary}>
                {detail.text}
              </Text>
            </View>
          ))}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onResetPassword}>Reset password</Button>
          {canBlock ? (
            <Button
              onPress={onBlock}
              textColor={user.isBlocked ? theme.colors.primary : theme.colors.error}
            >
              {user.isBlocked ? 'Unblock' : 'Block'}
            </Button>
          ) : null}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  detail: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
