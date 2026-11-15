import assert from 'node:assert/strict';
import { test } from 'node:test';
import { chargerQrValue } from './api.mock.ts';
import { parseQr } from '../session/parseQr.ts';

test('owner QR value is accepted by the Member 5 scanner parser', () => {
  const token = 'aB_123456789';
  const value = chargerQrValue(token);
  assert.equal(value, `evcharge://charge/${token}`);
  assert.equal(parseQr(value), token);
});
