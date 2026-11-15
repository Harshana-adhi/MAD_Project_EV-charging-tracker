import type { Vehicle } from '@prisma/client';
import { prisma, toNumber } from '../../core/db';
import { AppError } from '../../core/errors';
import type { UpdateVehicleInput, VehicleInput } from './vehicles.schema';

function toVehicle(vehicle: Vehicle) {
  return {
    id: vehicle.id,
    makeModel: vehicle.makeModel,
    connector: vehicle.connector,
    batteryKwh: toNumber(vehicle.batteryKwh),
  };
}

// A vehicle that belongs to someone else is reported as missing, so ids cannot be probed.
async function findOwnVehicle(userId: string, id: string) {
  const vehicle = await prisma.vehicle.findUnique({ where: { id } });
  if (!vehicle || vehicle.userId !== userId) throw new AppError('NOT_FOUND', 404);
  return vehicle;
}

export async function listVehicles(userId: string) {
  const vehicles = await prisma.vehicle.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });
  return vehicles.map(toVehicle);
}

export async function createVehicle(userId: string, input: VehicleInput) {
  const vehicle = await prisma.vehicle.create({
    data: {
      userId,
      makeModel: input.makeModel,
      connector: input.connector,
      batteryKwh: input.batteryKwh,
    },
  });
  return toVehicle(vehicle);
}

export async function updateVehicle(userId: string, id: string, input: UpdateVehicleInput) {
  await findOwnVehicle(userId, id);
  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      makeModel: input.makeModel,
      connector: input.connector,
      batteryKwh: input.batteryKwh,
    },
  });
  return toVehicle(vehicle);
}

export async function deleteVehicle(userId: string, id: string) {
  await findOwnVehicle(userId, id);
  await prisma.vehicle.delete({ where: { id } });
  return { ok: true };
}
