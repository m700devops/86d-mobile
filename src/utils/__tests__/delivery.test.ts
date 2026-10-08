// Run: node --test --experimental-strip-types src/utils/__tests__/delivery.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDays, joinDays, nextDelivery, upcomingDates, isoDate, fromIsoDate, deliveryLabel } from '../delivery.ts';

const THU_OCT_8 = new Date(2026, 9, 8);

test('days parse in week order, no repeats, junk dropped', () => {
  assert.deepEqual(parseDays('thu, Mon,mon,funday'), ['mon', 'thu']);
  assert.deepEqual(parseDays(null), []);
  assert.equal(joinDays(['fri', 'tue']), 'tue,fri');
});

test('the next delivery is the next truck after today', () => {
  assert.equal(isoDate(nextDelivery(['fri'], THU_OCT_8)!), '2026-10-09');
  // Today is a delivery day: that truck is gone, the next one counts.
  assert.equal(isoDate(nextDelivery(['thu'], THU_OCT_8)!), '2026-10-15');
  assert.equal(isoDate(nextDelivery(['mon', 'thu'], THU_OCT_8)!), '2026-10-12');
  assert.equal(nextDelivery([], THU_OCT_8), null);
});

test('upcoming dates for the picker', () => {
  assert.deepEqual(upcomingDates(['tue', 'fri'], 3, THU_OCT_8).map(isoDate),
    ['2026-10-09', '2026-10-13', '2026-10-16']);
  assert.equal(upcomingDates([], 4, THU_OCT_8).length, 4);
});

test('dates in the phone calendar and the email wording', () => {
  assert.equal(isoDate(new Date(2026, 9, 10, 23, 30)), '2026-10-10');
  assert.equal(isoDate(fromIsoDate('2026-10-10')!), '2026-10-10');
  assert.equal(fromIsoDate('10/10/2026'), null);
  assert.equal(deliveryLabel(new Date(2026, 9, 10)), 'Sat, Oct 10');
});
