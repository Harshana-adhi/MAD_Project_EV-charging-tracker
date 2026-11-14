import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Card as PaperCard, Text } from 'react-native-paper';
import { spacing } from '@/lib/theme';

type CardProps = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
};

export function Card({ children, title, subtitle, right, onPress }: CardProps) {
  return (
    <PaperCard mode="elevated" style={styles.card} onPress={onPress}>
      <PaperCard.Content>
        {title ? (
          <View style={styles.header}>
            <View style={styles.titleColumn}>
              <Text variant="titleMedium">{title}</Text>
              {subtitle ? <Text variant="bodySmall">{subtitle}</Text> : null}
            </View>
            {right}
          </View>
        ) : null}
        {children}
      </PaperCard.Content>
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  titleColumn: { flex: 1 },
});
