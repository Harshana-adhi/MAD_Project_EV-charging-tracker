import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, router } from 'expo-router';
import { Text } from 'react-native-paper';
import { Screen, AppTextInput, AppButton, ErrorView } from '@/components';
import { useAuth } from '@/features/auth';
import { errorMessage } from '@/lib/errors';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

type FormValues = z.infer<typeof schema>;

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
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
      setSubmitError(errorMessage(err));
    }
  }

  return (
    <Screen scroll>
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
            errorText={errors.email?.message}
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
            errorText={errors.password?.message}
          />
        )}
      />
      {submitError ? <ErrorView message={submitError} /> : null}
      <AppButton label="Log in" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      <Link href="/(auth)/register">Need an account? Register</Link>
    </Screen>
  );
}
