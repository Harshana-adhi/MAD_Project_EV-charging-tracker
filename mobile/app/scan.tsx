import { View } from 'react-native';
import { router } from 'expo-router';
import { IconButton, Text } from 'react-native-paper';
import { Screen } from '@/components';
import { QrScanner } from '@/features/session/QrScanner';

export default function ScanQRCodeScreen() {
  return (
    <Screen>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <IconButton icon="arrow-left" accessibilityLabel="Back" onPress={() => router.back()} />
        <Text variant="titleLarge">Scan charger QR</Text>
      </View>
      <QrScanner onToken={(token) => router.replace({ pathname: '/charge/[token]', params: { token } })} />
    </Screen>
  );
}
