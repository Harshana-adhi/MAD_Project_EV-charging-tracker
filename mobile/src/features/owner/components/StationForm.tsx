import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Chip, HelperText, Text } from 'react-native-paper';
import { AppButton, AppTextInput, StatusBadge } from '@/components';
import { errorMessage } from '@/lib/errors';
import { useAppTheme, spacing } from '@/lib/theme';
import type { StationDetail, StationInput } from '@/types/domain';
import type { OwnerPhotoUpload } from '../api';
import { PinPicker } from './PinPicker';

const AMENITIES = [
  'Parking',
  'WiFi',
  'Restroom',
  'Cafe',
  'Restaurant',
  'Shop',
  'Wheelchair access',
] as const;

function inRange(value: string, min: number, max: number): boolean {
  if (!value.trim()) return false;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max;
}

const schema = z.object({
  name: z.string().trim().min(3, 'Use at least 3 characters').max(80, 'Use 80 characters or fewer'),
  description: z.string().trim().max(500, 'Use 500 characters or fewer'),
  address: z.string().trim().min(5, 'Enter an address').max(200, 'Use 200 characters or fewer'),
  lat: z.string().refine((value) => inRange(value, -90, 90), 'Set a valid map pin'),
  lng: z.string().refine((value) => inRange(value, -180, 180), 'Set a valid map pin'),
  openingHours: z
    .string()
    .trim()
    .min(3, 'Enter opening hours')
    .max(40, 'Use 40 characters or fewer'),
  amenities: z.array(z.enum(AMENITIES)),
});

type FormValues = z.infer<typeof schema>;
type PendingPhoto = OwnerPhotoUpload & { previewUri: string };

type StationFormProps = {
  station?: StationDetail;
  saving?: boolean;
  submitError?: unknown;
  onSubmit: (
    input: StationInput,
    photos: OwnerPhotoUpload[],
    onPhotoUploaded: (uri: string) => void,
  ) => Promise<void>;
};

export function StationForm({ station, saving, submitError, onSubmit }: StationFormProps) {
  const theme = useAppTheme();
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [processingPhotos, setProcessingPhotos] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: station?.name ?? '',
      description: station?.description ?? '',
      address: station?.address ?? '',
      lat: station ? String(station.lat) : '',
      lng: station ? String(station.lng) : '',
      openingHours: station?.openingHours ?? '',
      amenities: station?.amenities.filter((item): item is (typeof AMENITIES)[number] =>
        AMENITIES.includes(item as (typeof AMENITIES)[number]),
      ) ?? [],
    },
  });

  const values = watch();
  const latitude = values.lat.trim() && Number.isFinite(Number(values.lat)) ? Number(values.lat) : null;
  const longitude = values.lng.trim() && Number.isFinite(Number(values.lng)) ? Number(values.lng) : null;
  const pin = latitude !== null && longitude !== null ? { lat: latitude, lng: longitude } : null;
  const photoCount = (station?.photos.length ?? 0) + pendingPhotos.length;
  const isBusy = !!saving || processingPhotos;

  async function choosePhotos() {
    const remaining = Math.max(0, 3 - photoCount);
    if (!remaining) return;
    setPhotoError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: remaining,
        quality: 1,
      });
      if (result.canceled) return;

      setProcessingPhotos(true);
      const processed: PendingPhoto[] = [];
      for (const [index, asset] of result.assets.entries()) {
        const context = ImageManipulator.ImageManipulator.manipulate(asset.uri, { maxWidth: 1000 });
        const image = await context.renderAsync();
        const saved = await image.saveAsync({
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
        });
        processed.push({
          uri: saved.uri,
          previewUri: saved.uri,
          name: `station-${Date.now()}-${index}.jpg`,
          type: 'image/jpeg',
        });
      }
      setPendingPhotos((current) => [...current, ...processed].slice(0, remaining + current.length));
    } catch {
      setPhotoError('Could not prepare that photo. Try another image.');
    } finally {
      setProcessingPhotos(false);
    }
  }

  function removePendingPhoto(uri: string) {
    setPendingPhotos((current) => current.filter((photo) => photo.uri !== uri));
  }

  async function submit(formValues: FormValues) {
    await onSubmit(
      {
        name: formValues.name.trim(),
        description: formValues.description.trim() || null,
        address: formValues.address.trim(),
        lat: Number(formValues.lat),
        lng: Number(formValues.lng),
        openingHours: formValues.openingHours.trim(),
        amenities: formValues.amenities,
      },
      pendingPhotos,
      removePendingPhoto,
    );
  }

  return (
    <View style={styles.form}>
      {station ? <StatusBadge status={station.status} /> : null}
      <Controller
        control={control}
        name="name"
        render={({ field }) => (
          <AppTextInput
            label="Station name"
            value={field.value}
            onChangeText={field.onChange}
            disabled={isBusy}
            error={errors.name?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="description"
        render={({ field }) => (
          <AppTextInput
            label="Description (optional)"
            multiline
            value={field.value}
            onChangeText={field.onChange}
            disabled={isBusy}
            error={errors.description?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="address"
        render={({ field }) => (
          <AppTextInput
            label="Address"
            value={field.value}
            onChangeText={field.onChange}
            disabled={isBusy}
            error={errors.address?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="openingHours"
        render={({ field }) => (
          <AppTextInput
            label="Opening hours"
            placeholder="08:00 – 22:00 or 24 hours"
            value={field.value}
            onChangeText={field.onChange}
            disabled={isBusy}
            error={errors.openingHours?.message}
          />
        )}
      />
      <PinPicker
        value={pin}
        address={values.address}
        onAddressChange={(address) =>
          setValue('address', address, { shouldDirty: true, shouldValidate: true })
        }
        onChange={(coordinates, displayName) => {
          setValue('lat', String(coordinates.lat), { shouldDirty: true, shouldValidate: true });
          setValue('lng', String(coordinates.lng), { shouldDirty: true, shouldValidate: true });
          if (displayName) {
            setValue('address', displayName.slice(0, 200), {
              shouldDirty: true,
              shouldValidate: true,
            });
          }
        }}
      />
      {errors.lat || errors.lng ? <HelperText type="error">Set a location pin on the map.</HelperText> : null}
      <View style={styles.section}>
        <Text variant="titleMedium">Amenities</Text>
        <View style={styles.chips}>
          {AMENITIES.map((amenity) => {
            const selected = values.amenities.includes(amenity);
            return (
              <Chip
                key={amenity}
                selected={selected}
                disabled={isBusy}
                onPress={() =>
                  setValue(
                    'amenities',
                    selected
                      ? values.amenities.filter((item) => item !== amenity)
                      : [...values.amenities, amenity],
                    { shouldDirty: true, shouldValidate: true },
                  )
                }
              >
                {amenity}
              </Chip>
            );
          })}
        </View>
      </View>
      <View style={styles.section}>
        <View style={styles.photoHeading}>
          <Text variant="titleMedium">Photos</Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {photoCount}/3
          </Text>
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          Photos are resized to about 1000 px and saved as JPEG before upload.
        </Text>
        <ScrollView horizontal contentContainerStyle={styles.photoList}>
          {station?.photos.map((photo, index) => (
            <Image key={`${photo}-${index}`} source={{ uri: photo }} style={styles.photo} />
          ))}
          {pendingPhotos.map((photo) => (
            <View key={photo.uri} style={styles.pendingPhoto}>
              <Image source={{ uri: photo.previewUri }} style={styles.photo} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove selected photo"
                onPress={() => removePendingPhoto(photo.uri)}
                style={[styles.removePhoto, { backgroundColor: theme.colors.surface }]}
              >
                <MaterialCommunityIcons name="close-circle" size={24} color={theme.colors.error} />
              </Pressable>
            </View>
          ))}
        </ScrollView>
        <AppButton
          label="Add photos"
          mode="outlined"
          icon="image-plus"
          onPress={choosePhotos}
          disabled={photoCount >= 3 || isBusy}
          loading={processingPhotos}
        />
        {photoError ? <HelperText type="error">{photoError}</HelperText> : null}
      </View>
      {submitError ? <HelperText type="error">{errorMessage(submitError)}</HelperText> : null}
      <AppButton
        label={station ? 'Save station' : 'Submit for approval'}
        onPress={handleSubmit(submit)}
        loading={!!saving}
        disabled={processingPhotos}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  section: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  photoHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoList: { gap: spacing.sm },
  photo: { width: 112, height: 88, borderRadius: 8 },
  pendingPhoto: { position: 'relative' },
  removePhoto: { position: 'absolute', right: spacing.xs, top: spacing.xs, borderRadius: 999 },
});
