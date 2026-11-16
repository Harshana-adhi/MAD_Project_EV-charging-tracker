import type { ConnectorType, Vehicle } from '@/types/domain';

// The first saved vehicle whose plug matches the charger, or null when none does.
export function vehicleForConnector(vehicles: Vehicle[] | undefined, connector: ConnectorType): Vehicle | null {
  return vehicles?.find((vehicle) => vehicle.connector === connector) ?? null;
}
