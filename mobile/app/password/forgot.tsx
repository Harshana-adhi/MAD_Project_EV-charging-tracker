import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { HelperText, Text } from 'react-native-paper';
import { AppButton, AppTextInput, Screen, useSnackbar } from '@/components';
import { useAuth } from '@/features/auth';
import { useRequestPasswordReset, useResetPassword } from '@/features/profile/hooks';
import { PASSWORD_RULE, passwordErrorMessage } from '@/features/profile/passwordErrors';
import { useAppTheme, spacing } from '@/lib/theme';

const emailSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
});

const resetSchema = z
  .object({
    otp: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code from the email'),
    newPassword: z.string().min(8, PASSWORD_RULE).max(64, PASSWORD_RULE),
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "The passwords don't match",
    path: ['confirmPassword'],
  });

type EmailValues = z.infer<typeof emailSchema>;
type ResetValues = z.infer<typeof resetSchema>;

export default function ForgotPasswordScreen() {
  const theme = useAppTheme();
  const snackbar = useSnackbar();
  const { user, signOut } = useAuth();
  const requestReset = useRequestPasswordReset();
  const resetPassword = useResetPassword();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<unknown>(null);
  const secondary = { color: theme.colors.onSurfaceVariant };

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: user?.email ?? '' },
  });
  const resetForm = useForm<ResetValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { otp: '', newPassword: '', confirmPassword: '' },
  });

  async function sendCode(values: EmailValues): Promise<boolean> {
    setSubmitError(null);
    try {
      const result = await requestReset.mutateAsync(values.email);
      setResetToken(result.resetToken);
      setSentTo(values.email);
      resetForm.reset({ otp: '', newPassword: '', confirmPassword: '' });
      return true;
    } catch (err) {
      setSubmitError(err);
      return false;
    }
  }

  async function resendCode() {
    if (sentTo && (await sendCode({ email: sentTo }))) snackbar.show('New code sent');
  }

  async function reset(values: ResetValues) {
    if (!resetToken) return;
    setSubmitError(null);
    try {
      await resetPassword.mutateAsync({
        resetToken,
        otp: values.otp,
        newPassword: values.newPassword,
      });
      // A signed-in user is logged out so they come back in with the new password.
      if (user) await signOut();
      snackbar.show('Password reset. Log in with your new password.');
      router.replace('/login');
    } catch (err) {
      setSubmitError(err);
    }
  }

  function changeEmail() {
    setSentTo(null);
    setResetToken(null);
    setSubmitError(null);
  }

  const errorText = submitError ? (
    <HelperText type="error">{passwordErrorMessage(submitError)}</HelperText>
  ) : null;

  if (!sentTo) {
    return (
      <Screen title="Forgot password" back scroll>
        <View style={styles.form}>
          <Text variant="bodyMedium" style={secondary}>
            Enter the email you use for GreenCharge. We'll send you a 6-digit code to reset your
            password.
          </Text>
          <Controller
            control={emailForm.control}
            name="email"
            render={({ field }) => (
              <AppTextInput
                label="Email"
                autoCapitalize="none"
                keyboardType="email-address"
                value={field.value}
                onChangeText={field.onChange}
                disabled={emailForm.formState.isSubmitting}
                error={emailForm.formState.errors.email?.message}
              />
            )}
          />
          {errorText}
          <AppButton
            label="Send code"
            onPress={emailForm.handleSubmit(sendCode)}
            loading={emailForm.formState.isSubmitting}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen title="Forgot password" back scroll>
      <View style={styles.form}>
        <Text variant="bodyMedium" style={secondary}>
          If {sentTo} has a GreenCharge account, we've sent it a 6-digit code. It expires in 10
          minutes. Check your spam folder too.
        </Text>
        <Controller
          control={resetForm.control}
          name="otp"
          render={({ field }) => (
            <AppTextInput
              label="6-digit code"
              keyboardType="number-pad"
              textContentType="oneTimeCode"
              autoComplete="one-time-code"
              maxLength={6}
              value={field.value}
              onChangeText={(text) => field.onChange(text.replace(/\D/g, ''))}
              disabled={resetForm.formState.isSubmitting}
              error={resetForm.formState.errors.otp?.message}
            />
          )}
        />
        <Controller
          control={resetForm.control}
          name="newPassword"
          render={({ field }) => (
            <AppTextInput
              label="New password"
              secureTextEntry
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              disabled={resetForm.formState.isSubmitting}
              error={resetForm.formState.errors.newPassword?.message}
            />
          )}
        />
        <Controller
          control={resetForm.control}
          name="confirmPassword"
          render={({ field }) => (
            <AppTextInput
              label="Confirm new password"
              secureTextEntry
              autoCapitalize="none"
              value={field.value}
              onChangeText={field.onChange}
              disabled={resetForm.formState.isSubmitting}
              error={resetForm.formState.errors.confirmPassword?.message}
            />
          )}
        />
        {errorText}
        <AppButton
          label="Reset password"
          onPress={resetForm.handleSubmit(reset)}
          loading={resetForm.formState.isSubmitting}
        />
        <View style={styles.links}>
          <AppButton
            label="Send a new code"
            mode="text"
            disabled={requestReset.isPending}
            onPress={resendCode}
          />
          <AppButton label="Use a different email" mode="text" onPress={changeEmail} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  links: { gap: spacing.xs },
});
