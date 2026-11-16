import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setCurrentMockUser } from '../../mocks/currentUser.ts';
import {
  createCharger,
  createStation,
  getOwnerWallet,
  listMyStations,
  listMyWithdrawals,
  listOwnerSessions,
  requestWithdrawal,
  uploadStationPhoto,
} from './api.mock.ts';

function owner(id, email) {
  return {
    id,
    email,
    fullName: email,
    phone: null,
    role: 'owner',
    isBlocked: false,
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

test('owner mock stations, chargers, sessions, withdrawals, and wallet are isolated by account', async () => {
  const ownerOne = owner('mock-owner-isolation-a', 'owner-a@example.test');
  const ownerTwo = owner('mock-owner-isolation-b', 'owner-b@example.test');

  setCurrentMockUser(ownerOne);
  assert.deepEqual(await listMyStations(), []);
  assert.deepEqual(await listOwnerSessions(), []);
  assert.deepEqual(await listMyWithdrawals(), []);

  const walletBefore = await getOwnerWallet();
  const station = await createStation({
    name: 'Owner A test station',
    description: null,
    address: 'Test address, Kandy',
    lat: 7.2906,
    lng: 80.6337,
    openingHours: '24 hours',
    amenities: [],
  });
  await uploadStationPhoto(station.id, {
    uri: 'file:///owner-a-photo.jpg',
    name: 'owner-a-photo.jpg',
    type: 'image/jpeg',
  });
  const charger = await createCharger(station.id, {
    label: 'Owner A charger',
    connector: 'TYPE2',
    powerKw: 22,
    ratePerKwh: 100,
  });
  await requestWithdrawal({ amount: 500, bankNote: 'Test Bank account 12345' });

  const refreshedWallet = await getOwnerWallet();
  assert.equal(refreshedWallet.balance, walletBefore.balance);
  assert.equal(refreshedWallet.held, walletBefore.held + 500);
  assert.equal(refreshedWallet.available, walletBefore.available - 500);
  assert.equal(refreshedWallet.balance, refreshedWallet.held + refreshedWallet.available);
  assert.equal((await listMyWithdrawals()).length, 1);

  setCurrentMockUser(ownerTwo);
  assert.deepEqual(await listMyStations(), []);
  assert.deepEqual(await listOwnerSessions(), []);
  assert.deepEqual(await listMyWithdrawals(), []);
  assert.deepEqual(await getOwnerWallet(), walletBefore);

  setCurrentMockUser(ownerOne);
  const ownerOneStations = await listMyStations();
  assert.equal(ownerOneStations.length, 1);
  assert.equal(ownerOneStations[0].id, station.id);
  assert.equal(ownerOneStations[0].ownerId, ownerOne.id);
  assert.equal(ownerOneStations[0].photos.length, 1);
  assert.equal(ownerOneStations[0].chargers[0].id, charger.id);
  assert.equal((await listMyWithdrawals()).length, 1);
  assert.deepEqual(await getOwnerWallet(), refreshedWallet);
});

test('the seeded owner data remains exclusive to owner-1', async () => {
  setCurrentMockUser(owner('owner-1', 'owner@evct.lk'));
  const stations = await listMyStations();
  assert.equal(stations.length, 3);
  assert.equal((await listOwnerSessions()).length, 1);

  setCurrentMockUser(owner('mock-owner-seed-check', 'owner-seed@example.test'));
  assert.deepEqual(await listMyStations(), []);
  assert.deepEqual(await listOwnerSessions(), []);
});
