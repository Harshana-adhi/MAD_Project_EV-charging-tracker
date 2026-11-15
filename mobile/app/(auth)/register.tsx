import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, router } from 'expo-router';
import { Text } from 'react-native-paper';
import { Screen, AppTextInput, AppButton, ErrorView } from '@/components';
import { useAuth } from '@/features/auth';
import { useAppTheme } from '@/lib/theme';

type Role = 'customer' | 'owner';

function RoleToggle({ value, onChange }: { value: Role; onChange: (role: Role) => void }) {
  const theme = useAppTheme();

  return (
    <View style={[styles.toggle, { borderColor: theme.colors.outlineVariant }]}>
      {(['customer', 'owner'] as const).map((role) => {
        const selected = value === role;
        return (
          <Pressable
            key={role}
            onPress={() => onChange(role)}
            style={[styles.toggleOption, selected && { backgroundColor: theme.colors.secondaryContainer }]}
          >
            <Text
              variant="labelLarge"
              style={{ color: selected ? theme.colors.onSecondaryContainer : theme.colors.onSurfaceVariant }}
            >
              {role === 'customer' ? 'Customer' : 'Station Owner'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const schema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').max(64),
  fullName: z.string().trim().min(2, 'Enter your name').max(60),
  role: z.enum(['customer', 'owner']),
});

type FormValues = z.infer<typeof schema>;

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const [submitError, setSubmitError] = useState<unknown>(null);
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
      setSubmitError(err);
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
            error={errors.fullName?.message}
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
      <Controller
        control={control}
        name="role"
        render={({ field }) => <RoleToggle value={field.value} onChange={field.onChange} />}
      />
      {submitError ? <ErrorView error={submitError} /> : null}
      <AppButton label="Create account" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />
      <Link href="/(auth)/login">Already have an account? Log in</Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  toggle: {
    flexDirection: 'row',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    overflow: 'hidden',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
});
