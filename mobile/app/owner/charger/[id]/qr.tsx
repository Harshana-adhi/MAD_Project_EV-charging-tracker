import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { Button, Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import QR from 'qrcode';
import { AppButton, EmptyState, ErrorView, LoadingView, Screen, useSnackbar } from '@/components';
import { api, useEmailChargerQr, useOwnerStations } from '@/features/owner';
import { buildQrSheetHtml } from '@/features/owner/qrSheet';
import { errorMessage } from '@/lib/errors';
import { spacing, useAppTheme } from '@/lib/theme';

type Busy = 'print' | 'save' | null;

export default function ChargerQRCodeScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { id: routeId } = useLocalSearchParams<{ id: string }>();
  const id = Array.isArray(routeId) ? routeId[0] : routeId;
  const stations = useOwnerStations();
  const emailQr = useEmailChargerQr();
  const [busy, setBusy] = useState<Busy>(null);
  const station = stations.data?.find((item) => item.chargers.some((charger) => charger.id === id));
  const charger = station?.chargers.find((item) => item.id === id);

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
  const details = `${charger.connector} · ${charger.powerKw} kW · LKR ${charger.ratePerKwh} / kWh`;
  const sheet = () =>
    buildQrSheetHtml({ value, qrToken: charger.qrToken, stationName: station.name, chargerLabel: charger.label, details });
  const fileName = `GreenCharge-${station.name}-${charger.label}-QR`.replace(/[^a-zA-Z0-9]+/g, '-');

  async function printSheet() {
    setBusy('print');
    try {
      const html = await sheet();
      if (Platform.OS === 'web') {
        // The browser's print dialog also offers "Save as PDF".
        const win = window.open('', '_blank');
        if (!win) throw new Error('Allow pop-ups to print the QR sheet.');
        win.document.write(html);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 300);
      } else {
        await Print.printAsync({ html });
      }
    } catch (error) {
      snackbar.show(error instanceof Error && error.message.includes('pop-ups') ? error.message : errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function saveSheet() {
    setBusy('save');
    try {
      if (Platform.OS === 'web') {
        const url = await QR.toDataURL(value, { width: 900, margin: 2 });
        const link = document.createElement('a');
        link.href = url;
        link.download = `${fileName}.png`;
        link.click();
        snackbar.show('QR image downloaded');
      } else {
        const { uri } = await Print.printToFileAsync({ html: await sheet() });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: 'Save or share the QR sheet' });
        } else {
          snackbar.show('PDF saved, but sharing is not available on this device.');
        }
      }
    } catch (error) {
      snackbar.show(errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  async function emailSheet() {
    try {
      const { sentTo } = await emailQr.mutateAsync(charger!.id);
      snackbar.show(`QR sent to ${sentTo}`);
    } catch (error) {
      snackbar.show(errorMessage(error));
    }
  }

  return (
    <Screen title="Charger QR" back scroll>
      <View style={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}>
          <Text variant="labelLarge" style={{ color: theme.colors.primary }}>
            Scan to start charging
          </Text>
          <View style={styles.qr}>
            <QRCode value={value} size={220} color="#000000" backgroundColor="#FFFFFF" quietZone={12} />
          </View>
          <Text variant="headlineSmall" style={styles.center}>
            {charger.label}
          </Text>
          <Text variant="bodyMedium" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
            {station.name}
          </Text>
          <Text variant="bodySmall" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
            {details}
          </Text>
        </View>

        <View style={[styles.note, { backgroundColor: theme.colors.surfaceVariant }]}>
          <MaterialCommunityIcons name="printer-outline" size={20} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={[styles.flex, { color: theme.colors.onSurfaceVariant }]}>
            Print this on A4 and fix it on or next to the charger at eye level, where customers can scan it easily.
          </Text>
        </View>

        <View style={styles.actions}>
          <AppButton
            label="Print QR sheet"
            icon="printer"
            onPress={() => void printSheet()}
            loading={busy === 'print'}
            disabled={busy !== null}
          />
          <AppButton
            label={Platform.OS === 'web' ? 'Download QR image' : 'Save as PDF'}
            icon="download"
            mode="contained-tonal"
            onPress={() => void saveSheet()}
            loading={busy === 'save'}
            disabled={busy !== null}
          />
          <AppButton
            label="Email it to me"
            icon="email-outline"
            mode="outlined"
            onPress={() => void emailSheet()}
            loading={emailQr.isPending}
            disabled={emailQr.isPending}
          />
        </View>

        <Text variant="bodySmall" style={[styles.center, { color: theme.colors.onSurfaceVariant }]}>
          We also emailed this QR to you when the charger was added.
        </Text>
        <Button compact disabled style={styles.ref} labelStyle={styles.refLabel}>
          Reference {charger.qrToken}
        </Button>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  card: { alignItems: 'center', gap: spacing.xs, borderWidth: 1, borderRadius: 20, padding: spacing.lg },
  qr: { backgroundColor: '#FFFFFF', padding: spacing.sm, borderRadius: 16, marginVertical: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: 12, padding: spacing.md },
  actions: { gap: spacing.sm },
  ref: { alignSelf: 'center' },
  refLabel: { fontFamily: 'monospace', fontSize: 12 },
});
