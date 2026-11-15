import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useAppTheme, spacing } from '@/lib/theme';

type ApprovalActionsProps = {
  approveLabel: string;
  onApprove: () => void;
  onReject: () => void;
  disabled?: boolean;
};

export function ApprovalActions({
  approveLabel,
  onApprove,
  onReject,
  disabled,
}: ApprovalActionsProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <Button
        mode="outlined"
        textColor={theme.colors.error}
        onPress={onReject}
        disabled={disabled}
      >
        Reject
      </Button>
      <Button mode="contained" onPress={onApprove} disabled={disabled}>
        {approveLabel}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
});
