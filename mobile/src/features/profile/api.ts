import { api as http } from '@/lib/api';
import type { User, Vehicle, VehicleInput } from '@/types/domain';

export type ProfileInput = { fullName?: string; phone?: string | null };

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
