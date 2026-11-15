import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { HelperText } from 'react-native-paper';
import {
  AppButton,
  AppTextInput,
  ErrorView,
  LoadingView,
  Screen,
  useSnackbar,
} from '@/components';
import { useProfile, useUpdateProfile } from '@/features/profile/hooks';
import { errorMessage } from '@/lib/errors';
import { spacing } from '@/lib/theme';
import type { User } from '@/types/domain';

const schema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(60, 'Name must be 60 characters or fewer'),
  phone: z
    .string()
    .trim()
    .regex(/^(0\d{9})?$/, 'Enter 10 digits starting with 0'),
});

type FormValues = z.infer<typeof schema>;

function EditProfileForm({ profile }: { profile: User }) {
  const snackbar = useSnackbar();
  const updateProfile = useUpdateProfile();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: profile.fullName, phone: profile.phone ?? '' },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await updateProfile.mutateAsync({
        fullName: values.fullName,
        phone: values.phone === '' ? null : values.phone,
      });
      snackbar.show('Profile updated');
      router.back();
    } catch (err) {
      setSubmitError(err);
    }
  }

  return (
    <View style={styles.form}>
      <AppTextInput label="Email" value={profile.email} disabled />
      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <AppTextInput
            label="Full name"
            value={field.value}
            onChangeText={field.onChange}
            disabled={isSubmitting}
            error={errors.fullName?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="phone"
        render={({ field }) => (
          <AppTextInput
            label="Phone (optional)"
            keyboardType="phone-pad"
            value={field.value}
            onChangeText={(text) => field.onChange(text.replace(/\D/g, '').slice(0, 10))}
            disabled={isSubmitting}
            error={errors.phone?.message}
          />
        )}
      />
      {submitError ? <HelperText type="error">{errorMessage(submitError)}</HelperText> : null}
      <AppButton
        label="Save"
        onPress={handleSubmit(onSubmit)}
        loading={isSubmitting}
        disabled={!isDirty}
      />
    </View>
  );
}

export default function EditProfileScreen() {
  const { data: profile, isLoading, isError, error, refetch } = useProfile();

  return (
    <Screen title="Edit profile" back scroll>
      {isLoading ? (
        <LoadingView />
      ) : isError || !profile ? (
        <ErrorView error={error} onRetry={refetch} />
      ) : (
        <EditProfileForm profile={profile} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});
