import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { HelperText, Text } from 'react-native-paper';
import { AppButton, AppTextInput, Screen, useSnackbar } from '@/components';
import { useChangePassword } from '@/features/profile/hooks';
import { PASSWORD_RULE, passwordErrorMessage } from '@/features/profile/passwordErrors';
import { useAppTheme, spacing } from '@/lib/theme';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: z.string().min(8, PASSWORD_RULE).max(64, PASSWORD_RULE),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "The passwords don't match",
    path: ['confirmPassword'],
  })
  .refine((value) => value.newPassword !== value.currentPassword, {
    message: 'Choose a password you are not using now',
    path: ['newPassword'],
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const changePassword = useChangePassword();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await changePassword.mutateAsync({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      snackbar.show('Password changed');
      router.back();
    } catch (err) {
      setSubmitError(err);
    }
  }

  const fields: { name: keyof FormValues; label: string }[] = [
    { name: 'currentPassword', label: 'Current password' },
    { name: 'newPassword', label: 'New password' },
    { name: 'confirmPassword', label: 'Confirm new password' },
  ];

  return (
    <Screen title="Change password" back scroll>
      <View style={styles.form}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {PASSWORD_RULE}. We'll email you to confirm the change.
        </Text>
        {fields.map((item) => (
          <Controller
            key={item.name}
            control={control}
            name={item.name}
            render={({ field }) => (
              <AppTextInput
                label={item.label}
                secureTextEntry
                autoCapitalize="none"
                value={field.value}
                onChangeText={field.onChange}
                disabled={isSubmitting}
                error={errors[item.name]?.message}
              />
            )}
          />
        ))}
        {submitError ? (
          <HelperText type="error">{passwordErrorMessage(submitError)}</HelperText>
        ) : null}
        <AppButton label="Change password" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
        <AppButton
          label="Forgot your current password?"
          mode="text"
          onPress={() => router.push('/password/forgot')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
});
