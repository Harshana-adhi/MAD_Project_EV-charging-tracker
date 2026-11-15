import { api as http } from '@/lib/api';
import type { User, Vehicle, VehicleInput } from '@/types/domain';

export type ProfileInput = { fullName?: string; phone?: string | null };
export type ChangePasswordInput = { currentPassword: string; newPassword: string };
export type ResetPasswordInput = { resetToken: string; otp: string; newPassword: string };

export function getProfile(): Promise<User> {
  return http.get('/profile') as unknown as Promise<User>;
}

export function updateProfile(input: ProfileInput): Promise<User> {
  return http.patch('/profile', input) as unknown as Promise<User>;
}

export function listVehicles(): Promise<Vehicle[]> {
  return http.get('/vehicles') as unknown as Promise<Vehicle[]>;
}

export function createVehicle(input: VehicleInput): Promise<Vehicle> {
  return http.post('/vehicles', input) as unknown as Promise<Vehicle>;
}

export function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
  return http.patch(`/vehicles/${id}`, input) as unknown as Promise<Vehicle>;
}

export function deleteVehicle(id: string): Promise<{ ok: true }> {
  return http.delete(`/vehicles/${id}`) as unknown as Promise<{ ok: true }>;
}

export function changePassword(input: ChangePasswordInput): Promise<{ ok: true }> {
  return http.patch('/password', input) as unknown as Promise<{ ok: true }>;
}

export function requestPasswordReset(email: string): Promise<{ resetToken: string }> {
  return http.post('/password/forgot', { email }) as unknown as Promise<{ resetToken: string }>;
}

export function resetPassword(input: ResetPasswordInput): Promise<{ ok: true }> {
  return http.post('/password/reset', input) as unknown as Promise<{ ok: true }>;
}
