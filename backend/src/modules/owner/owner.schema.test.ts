import assert from 'node:assert/strict';
import test from 'node:test';
import {
  chargerInputSchema,
  chargerStatusSchema,
  disputeSchema,
  earningsQuerySchema,
  stationInputSchema,
  withdrawalSchema,
} from './owner.schema';
import { createChargerQrToken } from './owner.crypto';

const stationInput = {
  name: 'Kandy Test Station',
  description: 'Development test station',
  address: 'Kandy, Sri Lanka',
  lat: 7.2906,
  lng: 80.6337,
  openingHours: '08:00 – 22:00',
  amenities: ['Parking', 'WiFi'],
};

test('station validation accepts specification limits and rejects invalid amenities', () => {
  assert.equal(stationInputSchema.safeParse(stationInput).success, true);
  assert.equal(stationInputSchema.safeParse({ ...stationInput, name: 'Hi' }).success, false);
  assert.equal(stationInputSchema.safeParse({ ...stationInput, amenities: ['Pool'] }).success, false);
});

test('charger validation enforces label, connector, power, rate and update-only fields', () => {
  assert.equal(
    chargerInputSchema.safeParse({ label: 'AC 1', connector: 'TYPE2', powerKw: 3, ratePerKwh: 10 }).success,
    true,
  );
  assert.equal(
    chargerInputSchema.safeParse({ label: 'x'.repeat(31), connector: 'TYPE2', powerKw: 22, ratePerKwh: 85 }).success,
    false,
  );
  assert.equal(
    chargerInputSchema.safeParse({ label: 'AC 1', connector: 'TYPE2', powerKw: 351, ratePerKwh: 85 }).success,
    false,
  );
  assert.equal(
    chargerInputSchema.safeParse({ label: 'AC 1', connector: 'TYPE2', powerKw: 22, ratePerKwh: 501 }).success,
    false,
  );
  assert.equal(
    chargerInputSchema.safeParse({ label: 'AC 1', connector: 'TYPE2', powerKw: 22, ratePerKwh: 85, status: 'offline' }).success,
    false,
  );
  assert.equal(chargerStatusSchema.safeParse({ status: 'busy' }).success, false);
});

test('dispute and withdrawal validation enforce their documented bounds', () => {
  assert.equal(disputeSchema.safeParse({ reason: 'A sufficiently specific reason' }).success, true);
  assert.equal(disputeSchema.safeParse({ reason: 'short' }).success, false);
  assert.equal(disputeSchema.safeParse({ reason: 'x'.repeat(301) }).success, false);
  assert.equal(withdrawalSchema.safeParse({ amount: 500, bankNote: 'Bank branch and account details' }).success, true);
  assert.equal(withdrawalSchema.safeParse({ amount: 200, bankNote: 'Bank branch and account details' }).success, false);
  assert.equal(withdrawalSchema.safeParse({ amount: 499, bankNote: 'Bank branch and account details' }).success, false);
  assert.equal(withdrawalSchema.safeParse({ amount: 500.001, bankNote: 'Bank branch and account details' }).success, false);
  assert.equal(withdrawalSchema.safeParse({ amount: 500, bankNote: 'bank' }).success, false);
});

test('earnings query requires a paired date range and accepts ISO dates', () => {
  assert.equal(earningsQuerySchema.safeParse({}).success, true);
  assert.equal(earningsQuerySchema.safeParse({ from: '2026-11-01' }).success, false);
  const parsed = earningsQuerySchema.safeParse({ from: '2026-11-01', to: '2026-11-30' });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.ok(parsed.data.from instanceof Date);
    assert.ok(parsed.data.to instanceof Date);
  }
});

test('QR token generator creates 12-character URL-safe tokens', () => {
  const tokens = Array.from({ length: 256 }, () => createChargerQrToken());
  assert.ok(tokens.every((token) => /^[A-Za-z0-9_-]{12}$/.test(token)));
  assert.equal(new Set(tokens).size, tokens.length);
});
