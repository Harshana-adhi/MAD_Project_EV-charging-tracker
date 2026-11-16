import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth';
import type { VehicleInput } from '@/types/domain';
import type { ChangePasswordInput, ProfileInput, ResetPasswordInput } from './api';
import { api } from './index';

// Keys include the user id so one account never sees another account's cached data.
function useProfileKey() {
  const { user } = useAuth();
  return ['profile', user?.id];
}

function useVehiclesKey() {
  const { user } = useAuth();
  return ['vehicles', user?.id];
}

export function useProfile() {
  const { user } = useAuth();
  return useQuery({ queryKey: useProfileKey(), queryFn: api.getProfile, enabled: !!user });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const queryKey = useProfileKey();
  return useMutation({
    mutationFn: (input: ProfileInput) => api.updateProfile(input),
    onSuccess: (profile) => queryClient.setQueryData(queryKey, profile),
  });
}

// Only customers have vehicles, so other screens pass enabled=false for owners, admins and guests.
export function useVehicles(enabled = true) {
  return useQuery({ queryKey: useVehiclesKey(), queryFn: api.listVehicles, enabled });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  const queryKey = useVehiclesKey();
  return useMutation({
    mutationFn: (input: VehicleInput) => api.createVehicle(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  const queryKey = useVehiclesKey();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<VehicleInput> }) =>
      api.updateVehicle(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  const queryKey = useVehiclesKey();
  return useMutation({
    mutationFn: (id: string) => api.deleteVehicle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: (password: string) => api.deleteAccount(password),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => api.changePassword(input),
  });
}

export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: (email: string) => api.requestPasswordReset(email),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: ResetPasswordInput) => api.resetPassword(input),
  });
}
