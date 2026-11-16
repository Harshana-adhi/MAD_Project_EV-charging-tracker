import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateCost, meteredKwh } from './sessions.service';
import { endSchema, startSchema } from './sessions.schema';

test('calculates ordinary cost, two-decimal rounding, and the spending cap', () => {
  assert.equal(calculateCost(3, 100, 500), 300);
  assert.equal(calculateCost(6.5, 100, 500), 500);
  assert.equal(calculateCost(0.01, 1.5, 500), 0.02);
});

test('validates limits and measured energy before a credit operation', () => {
  assert.equal(startSchema.safeParse({ qrToken: 'mockqrtoken1', spendingLimit: 100.25 }).success, true);
  assert.equal(startSchema.safeParse({ qrToken: 'bad', spendingLimit: 100 }).success, false);
  assert.equal(startSchema.safeParse({ qrToken: 'mockqrtoken1', spendingLimit: 100.001 }).success, false);
  assert.equal(endSchema.safeParse({ kwh: 0 }).success, false);
  assert.equal(endSchema.safeParse({ kwh: 1.001 }).success, false);
  assert.equal(endSchema.safeParse({ kwh: 500 }).success, true);
});

test('works out billed energy from charger power and session time', () => {
  const start = new Date('2026-11-16T10:00:00Z');
  const after = (seconds: number) => new Date(start.getTime() + seconds * 1000);
  // 60 real seconds is one simulated hour, so a 7 kW charger delivers 7 kWh.
  assert.equal(meteredKwh(7, 100, 5000, start, after(60)), 7);
  // It stops at what the spending limit can pay for: LKR 500 at LKR 100/kWh is 5 kWh.
  assert.equal(meteredKwh(7, 100, 500, start, after(600)), 5);
  // A session ended at once still bills the smallest unit, never zero or less.
  assert.equal(meteredKwh(7, 100, 500, start, start), 0.01);
  assert.equal(meteredKwh(7, 100, 500, start, after(-30)), 0.01);
});
