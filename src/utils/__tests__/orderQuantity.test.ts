// Run: node --test --experimental-strip-types src/utils/__tests__/orderQuantity.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderQuantity } from '../orderQuantity.ts';

test('4 on hand, par 6 → 2', () => assert.equal(orderQuantity(4, 6), 2));
test('1.25 on hand, par 4 → 3 (2.75 rounds up to whole bottles)', () =>
  assert.equal(orderQuantity(1.25, 4), 3));
test('6 on hand, par 6 → not short', () => assert.equal(orderQuantity(6, 6), 0));
test('0 on hand, par 3 → 3', () => assert.equal(orderQuantity(0, 3), 3));
test('par 0 → never short', () => {
  assert.equal(orderQuantity(0, 0), 0);
  assert.equal(orderQuantity(5, 0), 0);
});
test('threshold 0.75, 2.5 on hand, par 4 → 2', () => assert.equal(orderQuantity(2.5, 4, 0.75), 2));
test('above the reorder point but under par → not ordered', () => {
  assert.equal(orderQuantity(5, 6), 0); // reorder point 4.2
  assert.equal(orderQuantity(3, 4, 0.75), 0); // exactly at the reorder point
});
test('missing threshold falls back to 0.7', () => assert.equal(orderQuantity(4, 6, undefined), 2));
