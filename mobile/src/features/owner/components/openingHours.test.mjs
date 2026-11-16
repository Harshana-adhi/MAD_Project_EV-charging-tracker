import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  formatTimeLabel,
  hasDistinctOpeningAndClosingTimes,
  parseOpeningHours,
  serializeOpeningHours,
  TIME_OPTIONS,
} from './openingHours.ts';

test('offers every half-hour with readable AM/PM labels', () => {
  assert.equal(TIME_OPTIONS.length, 48);
  assert.equal(TIME_OPTIONS[0], '00:00');
  assert.equal(TIME_OPTIONS.at(-1), '23:30');
  assert.equal(formatTimeLabel('00:00'), '12:00 AM');
  assert.equal(formatTimeLabel('12:30'), '12:30 PM');
  assert.equal(formatTimeLabel('23:30'), '11:30 PM');
});

test('reads backend 24-hour ranges and legacy separator variants for station editing', () => {
  assert.deepEqual(parseOpeningHours('08:00 – 22:00'), {
    openingTime: '08:00',
    closingTime: '22:00',
    open24Hours: false,
  });
  assert.deepEqual(parseOpeningHours('06:00-22:00'), {
    openingTime: '06:00',
    closingTime: '22:00',
    open24Hours: false,
  });
  assert.deepEqual(parseOpeningHours('8:00 AM to 10:00 PM'), {
    openingTime: '08:00',
    closingTime: '22:00',
    open24Hours: false,
  });
  assert.deepEqual(parseOpeningHours('24 hours')?.open24Hours, true);
});

test('serializes station hours in the existing API format and supports overnight closing', () => {
  const dayHours = serializeOpeningHours('08:00', '22:00', false);
  const overnightHours = serializeOpeningHours('22:00', '06:00', false);

  assert.equal(dayHours, '08:00 – 22:00');
  assert.equal(overnightHours, '22:00 – 06:00');
  assert.ok(dayHours.length >= 3 && dayHours.length <= 40);
  assert.ok(overnightHours.length >= 3 && overnightHours.length <= 40);
  assert.equal(serializeOpeningHours('', '', true), '24 hours');
});

test('rejects identical selected times unless open 24 hours is enabled', () => {
  assert.equal(hasDistinctOpeningAndClosingTimes('08:00 – 08:00'), false);
  assert.equal(hasDistinctOpeningAndClosingTimes('24 hours'), true);
  assert.equal(hasDistinctOpeningAndClosingTimes('By appointment'), true);
});

test('leaves unsupported legacy or custom schedules unparsed for lossless editing', () => {
  assert.equal(parseOpeningHours('Open seasonally'), null);
  assert.equal(parseOpeningHours('08:15 – 22:00'), null);
  assert.equal(hasDistinctOpeningAndClosingTimes('Open seasonally'), true);
});
