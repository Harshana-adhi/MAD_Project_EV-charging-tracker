import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseQr } from './parseQr.ts';
import { meterReading } from './meterReading.ts';

test('accepts project QR values and bare tokens only', () => {
  assert.equal(parseQr('evcharge://charge/mockqrtoken1'), 'mockqrtoken1');
  assert.equal(parseQr(' mockqrtoken1 '), 'mockqrtoken1');
  assert.equal(parseQr('https://example.com/charge/mockqrtoken1'), null);
  assert.equal(parseQr('evcharge://charge/mockqrtoken1/extra'), null);
});

test('simulates one minute per real second and caps cost at the limit', () => {
  const session = {
    startedAt: '2026-11-15T00:00:00.000Z',
    powerKw: 22,
    ratePerKwh: 100,
    spendingLimit: 500,
  };
  const oneSecond = meterReading(session, Date.parse(session.startedAt) + 1000);
  assert.equal(oneSecond.simulatedSeconds, 60);
  assert.ok(Math.abs(oneSecond.kwh - 22 / 60) < 1e-9);
  assert.ok(Math.abs(oneSecond.cost - 2200 / 60) < 1e-9);

  const atLimit = meterReading(session, Date.parse(session.startedAt) + 20_000);
  assert.equal(atLimit.cost, 500);
  assert.equal(atLimit.progress, 1);
});
