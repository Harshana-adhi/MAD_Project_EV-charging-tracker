import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { HelperText, Text } from 'react-native-paper';
import {
  AppButton,
  AppTextInput,
  Card,
  EmptyState,
  ErrorView,
  LoadingView,
  Screen,
  StatusBadge,
  useSnackbar,
} from '@/components';
import { useAuth } from '@/features/auth';
import { useMyTopups, useRequestSlipTopUp } from '@/features/payments/hooks';
import { errorMessage } from '@/lib/errors';
import { formatCredits, formatDate } from '@/lib/format';
import { spacing } from '@/lib/theme';

export default function BankSlipTopupScreen() {
  const { user, loading } = useAuth();

  if (user?.role === 'customer') {
    return <BankSlipForm key={user.id} userId={user.id} />;
  }

  return (
    <Screen title="Bank slip top-up" back>
      {loading ? (
        <LoadingView />
      ) : (
        <EmptyState
          icon="bank-outline"
          title="Customer account required"
          message="Sign in as a customer to request a bank slip top-up."
        />
      )}
    </Screen>
  );
}

function BankSlipForm({ userId }: { userId: string }) {
  const [amount, setAmount] = useState('');
  const [imageUri, setImageUri] = useState<string>();
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [choosingPhoto, setChoosingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const snackbar = useSnackbar();
  const topups = useMyTopups(userId);
  const submitRequest = useRequestSlipTopUp(userId);
  const busy = choosingPhoto || submitRequest.isPending;
  const amountValue = Number(amount.trim());
  const validAmount = /^\d+$/.test(amount.trim()) && amountValue >= 100 && amountValue <= 50000;

  async function choosePhoto(source: 'camera' | 'gallery') {
    setChoosingPhoto(true);
    setPhotoError(undefined);

    try {
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'] };
      if (source === 'camera') {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) {
          setPhotoError('Allow camera access in your phone settings or choose a photo from your gallery.');
          return;
        }
      }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (!result.canceled) {
        setImageUri(result.assets[0]?.uri);
        submitRequest.reset();
      }
    } catch {
      setPhotoError('Could not open the photo picker. Try again or use the other photo option.');
    } finally {
      setChoosingPhoto(false);
    }
  }

  async function submit() {
    setAttemptedSubmit(true);
    if (!validAmount || !imageUri) return;
    try {
      await submitRequest.mutateAsync({ amount: amountValue, imageUri });
      setAmount('');
      setImageUri(undefined);
      setPhotoError(undefined);
      setAttemptedSubmit(false);
      snackbar.show('Bank slip submitted for review.');
    } catch {
      // Keep the amount and photo available for retry.
    }
  }

  return (
    <Screen
      title="Bank slip top-up"
      back
      scroll
      refreshing={topups.isRefetching}
      onRefresh={() => void topups.refetch()}
    >
      <Card title="Sample bank details">
        <Text variant="bodyMedium">Account name: EV Charge Tracker Demo</Text>
        <Text variant="bodyMedium">Account number: 0000000000</Text>
        <Text variant="bodySmall">For testing only. Use a sample slip photo.</Text>
      </Card>
      <View style={styles.form}>
        <AppTextInput
          label="Amount (LKR)"
          value={amount}
          onChangeText={setAmount}
          keyboardType="number-pad"
          editable={!busy}
          error={
            attemptedSubmit && !validAmount ? 'Enter a whole amount from LKR 100 to 50,000.' : undefined
          }
        />
        <Text variant="titleSmall">Bank slip photo</Text>
        <View style={styles.photoActions}>
          <AppButton
            label="Take photo"
            mode="outlined"
            disabled={busy}
            onPress={() => void choosePhoto('camera')}
          />
          <AppButton
            label="Choose photo"
            mode="outlined"
            disabled={busy}
            onPress={() => void choosePhoto('gallery')}
          />
        </View>
        {imageUri ? (
          <Image source={{ uri: imageUri }} accessibilityLabel="Bank slip preview" style={styles.preview} />
        ) : null}
        {photoError || (attemptedSubmit && !imageUri) ? (
          <HelperText type="error">{photoError ?? 'Take or select a photo of the slip.'}</HelperText>
        ) : null}
        {submitRequest.isError ? (
          <HelperText type="error">{errorMessage(submitRequest.error)}</HelperText>
        ) : null}
        <AppButton
          label="Submit for review"
          disabled={busy}
          loading={submitRequest.isPending}
          onPress={() => void submit()}
        />
      </View>

      <Text variant="titleLarge" style={styles.heading}>
        My top-up requests
      </Text>
      {topups.isPending ? <LoadingView /> : null}
      {topups.isError ? <ErrorView error={topups.error} onRetry={() => void topups.refetch()} /> : null}
      {topups.data?.length === 0 && !topups.isError ? (
        <EmptyState
          icon="receipt-text-outline"
          title="No top-up requests yet"
          message="Your top-up requests will appear here."
        />
      ) : null}
      {topups.data?.map((request) => (
        <Card
          key={request.id}
          title={formatCredits(request.amount)}
          subtitle={request.method === 'slip' ? 'Bank slip' : 'Card'}
          right={<StatusBadge status={request.status} />}
        >
          <Text variant="bodySmall">{formatDate(request.createdAt)}</Text>
          {request.reason ? <Text variant="bodyMedium">{request.reason}</Text> : null}
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.sm },
  photoActions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  preview: { width: '100%', height: 180, resizeMode: 'contain' },
  heading: { marginTop: spacing.xl, marginBottom: spacing.md },
});
