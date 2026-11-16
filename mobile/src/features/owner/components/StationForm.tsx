import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Button, Checkbox, Chip, Dialog, HelperText, Portal, Text, TextInput } from 'react-native-paper';
import { AppButton, AppTextInput, StatusBadge } from '@/components';
import { errorMessage } from '@/lib/errors';
import { useAppTheme, spacing } from '@/lib/theme';
import type { StationDetail, StationInput } from '@/types/domain';
import type { OwnerPhotoUpload } from '../api';
import { PinPicker } from './PinPicker';
import {
  DEFAULT_CLOSING_TIME,
  DEFAULT_OPENING_TIME,
  formatTimeLabel,
  hasDistinctOpeningAndClosingTimes,
  parseOpeningHours,
  serializeOpeningHours,
  TIME_OPTIONS,
} from './openingHours';

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
    .max(40, 'Use 40 characters or fewer')
    .refine(hasDistinctOpeningAndClosingTimes, {
      message: 'Opening and closing times must differ unless the station is open 24 hours.',
    }),
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

type OpeningHoursFieldProps = {
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  error?: string;
};

function OpeningHoursField({ value, onChange, disabled, error }: OpeningHoursFieldProps) {
  const theme = useAppTheme();
  const parsedInitial = parseOpeningHours(value);
  const [selectorMode, setSelectorMode] = useState(() => !value || parsedInitial !== null);
  const [openingTime, setOpeningTime] = useState(parsedInitial?.openingTime ?? '');
  const [closingTime, setClosingTime] = useState(parsedInitial?.closingTime ?? '');
  const [open24Hours, setOpen24Hours] = useState(parsedInitial?.open24Hours ?? false);
  const [activeTime, setActiveTime] = useState<'opening' | 'closing' | null>(null);

  const sameTimeError =
    !open24Hours && openingTime && openingTime === closingTime
      ? 'Choose different opening and closing times, or select Open 24 Hours.'
      : undefined;

  function updateSelectedHours(nextOpening: string, nextClosing: string, nextOpen24Hours: boolean) {
    onChange(
      nextOpen24Hours || (nextOpening && nextClosing)
        ? serializeOpeningHours(nextOpening, nextClosing, nextOpen24Hours)
        : '',
    );
  }

  function selectTime(time: string) {
    const nextOpening = activeTime === 'opening' ? time : openingTime;
    const nextClosing = activeTime === 'closing' ? time : closingTime;
    if (activeTime === 'opening') setOpeningTime(time);
    else setClosingTime(time);
    updateSelectedHours(nextOpening, nextClosing, open24Hours);
    setActiveTime(null);
  }

  function toggleOpen24Hours() {
    const nextValue = !open24Hours;
    setOpen24Hours(nextValue);
    updateSelectedHours(openingTime, closingTime, nextValue);
  }

  function switchToSelectors() {
    const parsed = parseOpeningHours(value);
    const nextOpening = parsed?.openingTime ?? DEFAULT_OPENING_TIME;
    const nextClosing = parsed?.closingTime ?? DEFAULT_CLOSING_TIME;
    const nextOpen24Hours = parsed?.open24Hours ?? false;
    setOpeningTime(nextOpening);
    setClosingTime(nextClosing);
    setOpen24Hours(nextOpen24Hours);
    setSelectorMode(true);
    updateSelectedHours(nextOpening, nextClosing, nextOpen24Hours);
  }

  if (!selectorMode) {
    return (
      <View style={styles.section}>
        <AppTextInput
          label="Opening hours (custom)"
          placeholder="For example: By appointment"
          value={value}
          onChangeText={onChange}
          disabled={disabled}
          error={error}
        />
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          This custom value will be saved as entered. Switch to time selectors only if you want to replace it.
        </Text>
        <AppButton
          label="Replace custom hours with time selectors"
          mode="outlined"
          onPress={switchToSelectors}
          disabled={disabled}
        />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.timeField}>
        <Text variant="labelLarge">Opening Time</Text>
        <Button
          mode="outlined"
          icon="clock-time-four-outline"
          contentStyle={styles.timeButtonContent}
          style={styles.timeButton}
          accessibilityLabel={`Opening time: ${openingTime ? formatTimeLabel(openingTime) : 'not selected'}`}
          onPress={() => setActiveTime('opening')}
          disabled={disabled || open24Hours}
        >
          {openingTime ? formatTimeLabel(openingTime) : 'Select opening time'}
        </Button>
      </View>
      <View style={styles.timeField}>
        <Text variant="labelLarge">Closing Time</Text>
        <Button
          mode="outlined"
          icon="clock-time-four-outline"
          contentStyle={styles.timeButtonContent}
          style={styles.timeButton}
          accessibilityLabel={`Closing time: ${closingTime ? formatTimeLabel(closingTime) : 'not selected'}`}
          onPress={() => setActiveTime('closing')}
          disabled={disabled || open24Hours}
        >
          {closingTime ? formatTimeLabel(closingTime) : 'Select closing time'}
        </Button>
      </View>
      <Checkbox.Item
        label="Open 24 Hours"
        status={open24Hours ? 'checked' : 'unchecked'}
        position="leading"
        onPress={toggleOpen24Hours}
        disabled={disabled}
        style={styles.hoursCheckbox}
      />
      {!open24Hours ? (
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          If closing is earlier than opening, it is treated as the following day.
        </Text>
      ) : null}
      {sameTimeError || error ? <HelperText type="error">{sameTimeError ?? error}</HelperText> : null}
      <AppButton
        label="Enter custom hours"
        mode="text"
        onPress={() => setSelectorMode(false)}
        disabled={disabled}
      />
      <Portal>
        <Dialog visible={activeTime !== null} onDismiss={() => setActiveTime(null)}>
          <Dialog.Title>Select {activeTime === 'opening' ? 'opening' : 'closing'} time</Dialog.Title>
          <Dialog.ScrollArea style={styles.timeScrollArea}>
            <ScrollView contentContainerStyle={styles.timeOptions}>
              {TIME_OPTIONS.map((time) => {
                const selected = (activeTime === 'opening' ? openingTime : closingTime) === time;
                const otherTime = activeTime === 'opening' ? closingTime : openingTime;
                return (
                  <Button
                    key={time}
                    mode={selected ? 'contained-tonal' : 'outlined'}
                    compact
                    style={styles.timeOption}
                    disabled={!open24Hours && otherTime === time}
                    onPress={() => selectTime(time)}
                  >
                    {formatTimeLabel(time)}
                  </Button>
                );
              })}
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setActiveTime(null)}>Cancel</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

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
            // An address is one line of data: the Enter key finishes typing instead of adding a line.
            onChangeText={(text) => field.onChange(text.replace(/\s*\n+\s*/g, ', '))}
            disabled={isBusy}
            error={errors.address?.message}
            // Grows to show the whole address instead of clipping it.
            multiline
            scrollEnabled={false}
            submitBehavior="blurAndSubmit"
            returnKeyType="done"
            left={<TextInput.Icon icon="map-marker-outline" />}
            contentStyle={styles.addressText}
            // Phones grow the box with the text; the web preview needs a row count instead.
            numberOfLines={Platform.OS === 'web' ? 3 : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="openingHours"
        render={({ field }) => (
          <OpeningHoursField
            value={field.value}
            onChange={field.onChange}
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
  addressText: { paddingTop: 14, paddingBottom: 14, lineHeight: 22 },
  form: { gap: spacing.lg },
  section: { gap: spacing.sm },
  timeField: { gap: spacing.xs },
  timeButton: { alignSelf: 'stretch', minHeight: 48, justifyContent: 'center' },
  timeButtonContent: { minHeight: 48, justifyContent: 'flex-start' },
  hoursCheckbox: { marginHorizontal: -spacing.sm },
  timeScrollArea: { maxHeight: 360 },
  timeOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, paddingBottom: spacing.xs },
  timeOption: { flexGrow: 1, flexBasis: '30%', minWidth: 100 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  photoHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  photoList: { gap: spacing.sm },
  photo: { width: 112, height: 88, borderRadius: 8 },
  pendingPhoto: { position: 'relative' },
  removePhoto: { position: 'absolute', right: spacing.xs, top: spacing.xs, borderRadius: 999 },
});
