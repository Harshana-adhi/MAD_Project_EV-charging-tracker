import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';
import { api } from '@/lib/api';
import type { TopupRequest, Transaction, TxnType } from '@/types/domain';

export function listTransactions(type?: TxnType): Promise<Transaction[]> {
  return api.get('/transactions', { params: { type } }) as unknown as Promise<Transaction[]>;
}

export function listMyTopups(): Promise<TopupRequest[]> {
  return api.get('/topups') as unknown as Promise<TopupRequest[]>;
}

export async function requestSlipTopUp(amount: number, imageUri: string): Promise<TopupRequest> {
  const context = ImageManipulator.manipulate(imageUri);
  context.resize({ width: 1000 });
  const image = await context.renderAsync();
  const { uri } = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.7 });

  const form = new FormData();
  form.append('amount', String(amount));
  if (Platform.OS === 'web') {
    const imageResponse = await fetch(uri);
    form.append('image', await imageResponse.blob(), 'bank-slip.jpg');
  } else {
    // React Native accepts a URI descriptor as a multipart file.
    form.append('image', { uri, name: 'bank-slip.jpg', type: 'image/jpeg' } as unknown as Blob);
  }
  return api.postForm('/topups/slip', form) as unknown as Promise<TopupRequest>;
}
