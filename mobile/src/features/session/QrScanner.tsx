import { useEffect, useRef, useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { IconButton, Text } from 'react-native-paper';
import { AppButton, AppTextInput, LoadingView, useSnackbar } from '@/components';
import { useAppTheme, spacing } from '@/lib/theme';
import { parseQr } from './parseQr';

type Props = { onToken: (token: string) => void };

export function QrScanner({ onToken }: Props) {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [scanned, setScanned] = useState(false);
  const scannedRef = useRef(false);
  const [manualCode, setManualCode] = useState('');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  function accept(value: string) {
    if (scannedRef.current) return;
    scannedRef.current = true;
    const token = parseQr(value);
    if (!token) {
      snackbar.show('Not an EV charger QR code');
      setScanned(true);
      resetTimer.current = setTimeout(() => {
        scannedRef.current = false;
        setScanned(false);
      }, 1500);
      return;
    }
    setScanned(true);
    onToken(token);
  }

  if (!permission) return <LoadingView message="Checking camera permission" />;

  return (
    <View style={styles.container}>
      {permission?.granted ? (
        <View style={styles.cameraContainer}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            enableTorch={torch}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanned ? undefined : ({ data }) => accept(data)}
          />
          <View pointerEvents="none" style={styles.frame} />
          <View style={[styles.cameraControls, { backgroundColor: theme.colors.surface }]}>
            <Text variant="bodyMedium">Point at the QR code on the charger</Text>
            <IconButton
              icon={torch ? 'flashlight-off' : 'flashlight'}
              accessibilityLabel={torch ? 'Turn torch off' : 'Turn torch on'}
              onPress={() => setTorch((value) => !value)}
            />
          </View>
        </View>
      ) : (
        <View style={styles.permission}>
          <Text variant="titleMedium">Camera access is needed to scan a charger</Text>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            You can also enter the code printed below the QR image.
          </Text>
          <AppButton
            label={permission?.canAskAgain ? 'Allow camera' : 'Open settings'}
            mode="contained-tonal"
            onPress={() => { if (permission?.canAskAgain) requestPermission(); else Linking.openSettings(); }}
          />
        </View>
      )}
      <View style={styles.manual}>
        <Text variant="titleMedium">Enter code manually</Text>
        <AppTextInput
          label="Charger code"
          value={manualCode}
          onChangeText={setManualCode}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Charger code"
        />
        <AppButton label="Go" onPress={() => accept(manualCode)} disabled={!manualCode.trim() || scanned} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, gap: spacing.lg },
  cameraContainer: { flex: 1, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  frame: { width: '70%', aspectRatio: 1, borderWidth: 3, borderColor: '#FFFFFF', borderRadius: spacing.md },
  cameraControls: { position: 'absolute', bottom: spacing.lg, left: spacing.lg, right: spacing.lg, padding: spacing.sm, borderRadius: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  permission: { flex: 1, justifyContent: 'center', gap: spacing.md },
  manual: { gap: spacing.sm },
});
