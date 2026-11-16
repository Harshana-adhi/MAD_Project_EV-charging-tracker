import assert from 'node:assert/strict';
import { test } from 'node:test';
import { colomboDateString, colomboDayStartUtc, colomboMinutesOfDay, isWithinOpeningHours } from './slots';

test('reads Colombo wall-clock minutes-of-day from a UTC instant', () => {
  // 04:30 UTC is 10:00 in Colombo (UTC+5:30).
  assert.equal(colomboMinutesOfDay(new Date('2026-11-16T04:30:00.000Z')), 10 * 60);
  // 18:30 UTC rolls into the next Colombo day, at 00:00.
  assert.equal(colomboMinutesOfDay(new Date('2026-11-16T18:30:00.000Z')), 0);
});

test('colomboDateString and colomboDayStartUtc are inverses at midnight', () => {
  const dayStart = colomboDayStartUtc('2026-11-20');
  assert.equal(colomboDateString(dayStart), '2026-11-20');
  assert.equal(colomboMinutesOfDay(dayStart), 0);
});

test('accepts a slot inside HH:MM-HH:MM opening hours and rejects one outside it', () => {
  // Station open 06:00-22:00 Colombo.
  assert.equal(isWithinOpeningHours('06:00-22:00', 10 * 60, 10 * 60 + 30), true);
  assert.equal(isWithinOpeningHours('06:00-22:00', 5 * 60 + 30, 6 * 60), false);
  assert.equal(isWithinOpeningHours('06:00-22:00', 21 * 60 + 30, 22 * 60 + 30), false);
});

test('is lenient with opening-hours text it cannot parse, like "24 hours"', () => {
  assert.equal(isWithinOpeningHours('24 hours', 0, 60), true);
  assert.equal(isWithinOpeningHours('24 hours', 23 * 60 + 30, 24 * 60 + 30), true);
});
