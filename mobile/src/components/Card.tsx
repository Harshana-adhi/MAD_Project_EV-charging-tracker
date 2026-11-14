import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { Card as PaperCard } from 'react-native-paper';
import { spacing } from '@/lib/theme';

export function Card({ children }: { children: ReactNode }) {
  return (
    <PaperCard style={styles.card}>
      <PaperCard.Content>{children}</PaperCard.Content>
    </PaperCard>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
});
