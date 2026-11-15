import { mockUser, mockVehicle } from '@/mocks/fixtures';
import type { User, Vehicle, VehicleInput } from '@/types/domain';
import type { ProfileInput } from './api';

let profile: User = { ...mockUser };
let vehicles: Vehicle[] = [mockVehicle];

export async function getProfile(): Promise<User> {
  return profile;
}

export async function updateProfile(input: ProfileInput): Promise<User> {
  profile = {
    ...profile,
    fullName: input.fullName ?? profile.fullName,
    phone: input.phone === undefined ? profile.phone : input.phone,
  };
  return profile;
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
