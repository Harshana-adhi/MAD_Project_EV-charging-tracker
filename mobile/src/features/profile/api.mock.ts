import { mockUser, mockVehicle } from '@/mocks/fixtures';
import { getCurrentMockUser, setCurrentMockUser } from '@/mocks/currentUser';
import type { User, Vehicle, VehicleInput } from '@/types/domain';
import type { ChangePasswordInput, ProfileInput, ResetPasswordInput } from './api';

const MOCK_RESET_CODE = '123456';

let profile: User = { ...mockUser };
let vehicles: Vehicle[] = [mockVehicle];

export async function getProfile(): Promise<User> {
  const activeUser = getCurrentMockUser();
  if (profile.id !== activeUser.id) profile = activeUser;
  return { ...profile };
}

export async function updateProfile(input: ProfileInput): Promise<User> {
  profile = {
    ...profile,
    fullName: input.fullName ?? profile.fullName,
    phone: input.phone === undefined ? profile.phone : input.phone,
  };
  setCurrentMockUser(profile);
  return { ...profile };
}

export async function listVehicles(): Promise<Vehicle[]> {
  return vehicles;
}

export async function createVehicle(input: VehicleInput): Promise<Vehicle> {
  const vehicle: Vehicle = { id: `vehicle-${Date.now()}`, ...input };
  vehicles = [vehicle, ...vehicles];
  return vehicle;
}

export async function updateVehicle(id: string, input: Partial<VehicleInput>): Promise<Vehicle> {
  const existing = vehicles.find((vehicle) => vehicle.id === id);
  if (!existing) throw new Error('NOT_FOUND');
  const updated = { ...existing, ...input };
  vehicles = vehicles.map((vehicle) => (vehicle.id === id ? updated : vehicle));
  return updated;
}

export async function deleteVehicle(id: string): Promise<{ ok: true }> {
  if (!vehicles.some((vehicle) => vehicle.id === id)) throw new Error('NOT_FOUND');
  vehicles = vehicles.filter((vehicle) => vehicle.id !== id);
  return { ok: true };
}

export async function changePassword(input: ChangePasswordInput): Promise<{ ok: true }> {
  if (input.currentPassword === input.newPassword) throw new Error('VALIDATION_ERROR');
  return { ok: true };
}

// In mock mode the emailed code is always 123456.
export async function requestPasswordReset(email: string): Promise<{ resetToken: string }> {
  return { resetToken: `mock-reset-${email}` };
}

export async function resetPassword(input: ResetPasswordInput): Promise<{ ok: true }> {
  if (input.otp !== MOCK_RESET_CODE) throw new Error('INVALID_CODE');
  return { ok: true };
}
