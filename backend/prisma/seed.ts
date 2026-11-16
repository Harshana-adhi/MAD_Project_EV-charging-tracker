import { PrismaClient } from '@prisma/client';
import { randomBytes } from 'crypto';
import { hashPassword } from '../src/core/password';
import { credit } from '../src/core/credit.service';

const prisma = new PrismaClient();

function qrToken(): string {
  return randomBytes(9).toString('base64url').slice(0, 12);
}

async function main() {
  const existingPlatformWallet = await prisma.wallet.findFirst({ where: { isPlatform: true } });
  if (!existingPlatformWallet) {
    await prisma.wallet.create({ data: { userId: null, isPlatform: true, balance: 0, held: 0 } });
  }

  const passwordHash = await hashPassword('Password123');

  const [admin, owner, owner2, customer, customer2] = await Promise.all(
    [
      { email: 'admin@evct.lk', fullName: 'Admin User', role: 'admin' as const },
      { email: 'owner@evct.lk', fullName: 'Station Owner One', role: 'owner' as const },
      { email: 'owner2@evct.lk', fullName: 'Station Owner Two', role: 'owner' as const },
      { email: 'customer@evct.lk', fullName: 'Customer One', role: 'customer' as const },
      { email: 'customer2@evct.lk', fullName: 'Customer Two', role: 'customer' as const },
    ].map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: { ...user, passwordHash },
      }),
    ),
  );

  for (const user of [admin, owner, owner2, customer, customer2]) {
    const existing = await prisma.wallet.findUnique({ where: { userId: user.id } });
    if (!existing) {
      await prisma.$transaction((tx) => credit.createWallet(tx, user.id));
    }
  }

  for (const user of [customer, customer2]) {
    const wallet = await credit.getWallet(user.id);
    if (wallet.balance === 0) {
      await prisma.$transaction((tx) =>
        credit.credit(tx, { userId: user.id, amount: 5000, type: 'topup', note: 'Seed top-up' }),
      );
    }
  }

  const stationData = [
    {
      ownerId: owner.id,
      name: 'Kandy City Hotel Charging Point',
      address: '25 Dalada Veediya, Kandy',
      lat: 7.2936,
      lng: 80.6413,
      openingHours: '06:00-22:00',
      amenities: ['Parking', 'Restroom', 'Cafe'],
      chargers: [{ label: 'A1', connector: 'TYPE2' as const, powerKw: 22, ratePerKwh: 85 }],
    },
    {
      ownerId: owner.id,
      name: 'Peradeniya Rest Stop',
      address: 'Colombo Rd, Peradeniya',
      lat: 7.2599,
      lng: 80.5977,
      openingHours: '24 hours',
      amenities: ['Parking', 'Shop'],
      chargers: [
        { label: 'A1', connector: 'CCS2' as const, powerKw: 50, ratePerKwh: 95 },
        { label: 'A2', connector: 'TYPE2' as const, powerKw: 7, ratePerKwh: 70 },
      ],
    },
    {
      ownerId: owner2.id,
      name: 'Colombo Fort Fuel Station',
      address: 'Chatham St, Colombo 01',
      lat: 6.9344,
      lng: 79.8428,
      openingHours: '06:00-23:00',
      amenities: ['Parking', 'Restroom'],
      chargers: [{ label: 'A1', connector: 'CHADEMO' as const, powerKw: 50, ratePerKwh: 100 }],
    },
    {
      ownerId: owner2.id,
      name: 'Nugegoda Shopping Complex',
      address: 'High Level Rd, Nugegoda',
      lat: 6.8721,
      lng: 79.8891,
      openingHours: '09:00-21:00',
      amenities: ['Parking', 'Mall', 'Food Court'],
      chargers: [
        { label: 'A1', connector: 'TYPE2' as const, powerKw: 22, ratePerKwh: 80 },
        { label: 'A2', connector: 'TYPE1' as const, powerKw: 7, ratePerKwh: 65 },
      ],
    },
    {
      ownerId: owner.id,
      name: 'Kadugannawa Highway Stop',
      address: 'A1 Highway, Kadugannawa',
      lat: 7.2544,
      lng: 80.5247,
      openingHours: '24 hours',
      amenities: ['Parking', 'Restaurant'],
      chargers: [{ label: 'A1', connector: 'CCS2' as const, powerKw: 60, ratePerKwh: 110 }],
    },
    {
      ownerId: owner2.id,
      name: 'Rajagiriya Guest House',
      address: 'Nawala Rd, Rajagiriya',
      lat: 6.9097,
      lng: 79.8938,
      openingHours: '07:00-20:00',
      amenities: ['Parking'],
      chargers: [{ label: 'A1', connector: 'GBT' as const, powerKw: 40, ratePerKwh: 90 }],
    },
  ];

  for (const data of stationData) {
    const existing = await prisma.station.findFirst({ where: { name: data.name } });
    if (existing) continue;

    await prisma.station.create({
      data: {
        ownerId: data.ownerId,
        name: data.name,
        address: data.address,
        lat: data.lat,
        lng: data.lng,
        openingHours: data.openingHours,
        amenities: data.amenities,
        status: 'approved',
        chargers: {
          create: data.chargers.map((charger) => ({ ...charger, qrToken: qrToken() })),
        },
      },
    });
  }

  const pendingName = 'New Homeowner Charger (Pending)';
  const existingPending = await prisma.station.findFirst({ where: { name: pendingName } });
  if (!existingPending) {
    await prisma.station.create({
      data: {
        ownerId: owner.id,
        name: pendingName,
        address: 'Katugastota Rd, Kandy',
        lat: 7.3156,
        lng: 80.6336,
        openingHours: '08:00-18:00',
        amenities: ['Parking'],
        status: 'pending',
        chargers: {
          create: [{ label: 'A1', connector: 'TYPE2', powerKw: 22, ratePerKwh: 85, qrToken: qrToken() }],
        },
      },
    });
  }

  console.log('Seed complete');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
