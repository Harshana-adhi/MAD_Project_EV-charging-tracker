import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Share, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Text } from 'react-native-paper';
import { AppButton, EmptyState, ErrorView, LoadingView, Screen, useSnackbar } from '@/components';
import { api, useOwnerStations } from '@/features/owner';
import { spacing, useAppTheme } from '@/lib/theme';

export default function ChargerQRCodeScreen() {
  const snackbar = useSnackbar();
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const stations = useOwnerStations();
  const [shareError, setShareError] = useState(false);
  const station = stations.data?.find((item) => item.chargers.some((charger) => charger.id === id));
  const charger = station?.chargers.find((item) => item.id === id);

  async function shareQr() {
    if (!charger) return;
    setShareError(false);
    try {
      const value = api.chargerQrValue(charger.qrToken);
      await Share.share({ message: `${value}\nQR token: ${charger.qrToken}` });
      snackbar.show('Share options opened');
    } catch {
      setShareError(true);
    }
  }

  if (stations.isLoading) {
    return <Screen title="Charger QR" back><LoadingView message="Loading charger…" /></Screen>;
  }
  if (stations.isError) {
    return (
      <Screen title="Charger QR" back>
        <ErrorView error={stations.error} onRetry={() => void stations.refetch()} />
      </Screen>
    );
  }
  if (!charger || !station) {
    return (
      <Screen title="Charger QR" back>
        <EmptyState icon="qrcode" title="Charger not found" message="This charger may have been removed." />
      </Screen>
    );
  }

  const value = api.chargerQrValue(charger.qrToken);

  return (
    <Screen title="Charger QR" back scroll>
      <View style={styles.content}>
        <View style={styles.heading}>
          <TextBlock title={station.name} subtitle={charger.label} />
        </View>
        <View style={[styles.qrCard, { backgroundColor: '#FFFFFF' }]}>
          <QRCode value={value} size={240} color="#000000" backgroundColor="#FFFFFF" quietZone={16} />
        </View>
        <TextBlock title={charger.qrToken} monospace />
        <TextBlock title="Print or display this QR code at the charger." subtitle={value} />
        {shareError ? <TextBlock title="Could not open the share sheet. Try again." error /> : null}
        <AppButton label="Share QR link" icon="share-variant" mode="contained-tonal" onPress={() => void shareQr()} />
      </View>
    </Screen>
  );
}

function TextBlock({
  title,
  subtitle,
  monospace,
  error,
}: {
  title: string;
  subtitle?: string;
  monospace?: boolean;
  error?: boolean;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.textBlock}>
      <Text variant={monospace ? 'titleMedium' : 'titleLarge'} style={{
        color: error ? theme.colors.error : theme.colors.onSurface,
        ...(monospace ? { fontFamily: 'monospace', textAlign: 'center' as const } : {}),
      }}>
        {title}
      </Text>
      {subtitle ? <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: spacing.lg },
  heading: { alignItems: 'center' },
  qrCard: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, borderRadius: 16 },
  textBlock: { alignItems: 'center', gap: spacing.xs },
});
