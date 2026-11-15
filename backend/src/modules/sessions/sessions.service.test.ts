import assert from 'node:assert/strict';
import { test } from 'node:test';
import { calculateCost } from './sessions.service';
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
