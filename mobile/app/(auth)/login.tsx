import { useState } from 'react';
import { View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { router } from 'expo-router';
import { Button, Text } from 'react-native-paper';
import { Screen, AppTextInput, AppButton, ErrorView, Logo } from '@/components';
import { useAuth } from '@/features/auth';
import { USE_MOCKS } from '@/lib/config';
import { spacing, useAppTheme } from '@/lib/theme';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const theme = useAppTheme();
  const { signIn } = useAuth();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await signIn(values.email, values.password);
      router.replace('/');
    } catch (err) {
      setSubmitError(err);
    }
  }

  return (
    <Screen scroll>
      <View style={{ gap: spacing.md }}>
        <View style={{ alignItems: 'center', marginBottom: spacing.sm }}>
          <Logo size={48} />
        </View>
        <Text variant="headlineSmall">Log in</Text>
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <AppTextInput
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={field.value}
              onChangeText={field.onChange}
              error={errors.email?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="password"
          render={({ field }) => (
            <AppTextInput
              label="Password"
              secureTextEntry
              value={field.value}
              onChangeText={field.onChange}
              error={errors.password?.message}
            />
          )}
        />
        <AppButton
          label="Forgot password?"
          mode="text"
          style={{ alignSelf: 'flex-end' }}
          onPress={() => router.push('/password/forgot')}
        />
        {submitError ? <ErrorView error={submitError} /> : null}
        <AppButton label="Log in" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
        {USE_MOCKS ? (
          <Text variant="bodySmall" style={{ textAlign: 'center' }}>
            Demo accounts: owner@evct.lk, customer@evct.lk, or admin@evct.lk (any non-empty password)
          </Text>
        ) : null}
        {/* A real button, so it always takes the theme colour (a link nested in text didn't on phones). */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm }}>
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            Need an account?
          </Text>
          <Button
            mode="text"
            compact
            textColor={theme.colors.primary}
            labelStyle={{ fontWeight: '700' }}
            onPress={() => router.replace('/(auth)/register')}
          >
            Register
          </Button>
        </View>
      </View>
    </Screen>
  );
}
