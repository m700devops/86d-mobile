// Run: node --test --experimental-strip-types src/utils/__tests__/countDay.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  countPhrase, dayPlural, reminderTrigger, reminderText, durationPhrase,
  isCountDay, isCountTime,
} from '../countDay.ts';

test('the phrase the app and the CRM show', () => {
  assert.equal(countPhrase({ day: 'sun', time: 'after_close' }), 'Sunday after close');
  assert.equal(countPhrase({ day: 'mon', time: 'before_open' }), 'Monday before opening');
  assert.equal(countPhrase({ day: 'wed', time: null }), 'Wednesday');
  assert.equal(countPhrase({ day: 'varies', time: 'afternoon' }), 'No set day');
  assert.equal(countPhrase(null), null);
});

test('the reminder fires ON count day, ahead of the count, iOS weekday numbering', () => {
  // iOS: 1 = Sunday … 7 = Saturday
  assert.deepEqual(reminderTrigger({ day: 'sun', time: 'after_close' }), { weekday: 1, hour: 17, minute: 0 });
  assert.deepEqual(reminderTrigger({ day: 'sat', time: 'before_open' }), { weekday: 7, hour: 9, minute: 30 });
  assert.deepEqual(reminderTrigger({ day: 'mon', time: 'afternoon' }), { weekday: 2, hour: 12, minute: 30 });
  assert.deepEqual(reminderTrigger({ day: 'thu', time: null }), { weekday: 5, hour: 12, minute: 30 });
});

test('no set day, no weekly reminder', () => {
  assert.equal(reminderTrigger({ day: 'varies', time: 'after_close' }), null);
  assert.equal(dayPlural('varies'), null);
  assert.equal(dayPlural('fri'), 'Fridays');
});

test('the reminder words', () => {
  const first = reminderText({ day: 'sun', time: 'after_close' }, true);
  assert.equal(first.title, 'Count day tonight');
  assert.match(first.body, /3 bottles/);
  const later = reminderText({ day: 'mon', time: 'before_open' }, false);
  assert.equal(later.title, 'Count day today');
  assert.doesNotMatch(later.body, /3 bottles/);
});

test('how long the first three took', () => {
  assert.equal(durationPhrase(48_000), '48 seconds');
  assert.equal(durationPhrase(400), '1 second');
  assert.equal(durationPhrase(1_000), '1 second');
  assert.equal(durationPhrase(90_000), '2 minutes');
  assert.equal(durationPhrase(60_000), '1 minute');
  assert.equal(durationPhrase(45 * 60_000), null);
  assert.equal(durationPhrase(0), null);
  assert.equal(durationPhrase(NaN), null);
});

test('what comes back from the server is checked before use', () => {
  assert.ok(isCountDay('sun') && isCountDay('varies'));
  assert.ok(!isCountDay('sunday') && !isCountDay(null) && !isCountDay('toString'));
  assert.ok(isCountTime('after_close'));
  assert.ok(!isCountTime('night') && !isCountTime(undefined));
});
