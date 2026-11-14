import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, router } from 'expo-router';
import { SegmentedButtons, Text } from 'react-native-paper';
import { Screen, AppTextInput, AppButton, ErrorView } from '@/components';
import { useAuth } from '@/features/auth';
import { errorMessage } from '@/lib/errors';

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(64),
  fullName: z.string().trim().min(2, 'Enter your name').max(60),
  role: z.enum(['customer', 'owner']),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', fullName: '', role: 'customer' },
  });

  async function onSubmit(values: FormValues) {
    setSubmitError(null);
    try {
      await signUp(values.email, values.password, values.fullName, values.role);
      router.replace('/');
    } catch (err) {
      setSubmitError(errorMessage(err));
    }
  }

  return (
    <Screen scroll>
      <Text variant="headlineSmall">Create account</Text>
      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <AppTextInput
            label="Full name"
            value={field.value}
            onChangeText={field.onChange}
            errorText={errors.fullName?.message}
          />
        )}
      />
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
      <Controller
        control={control}
        name="role"
        render={({ field }) => (
          <SegmentedButtons
            value={field.value}
            onValueChange={field.onChange}
            buttons={[
              { value: 'customer', label: 'Customer' },
              { value: 'owner', label: 'Station Owner' },
            ]}
          />
        )}
      />
      {submitError ? <ErrorView message={submitError} /> : null}
      <AppButton label="Create account" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      <Link href="/(auth)/login">Already have an account? Log in</Link>
    </Screen>
  );
}
