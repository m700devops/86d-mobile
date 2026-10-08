// Run: node --test --experimental-strip-types src/utils/__tests__/caseOrder.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  planOrderLine, weeklyUse, defaultCaseSize, sizeMl, shortQty, longQty, nameKey,
  CASE_CLEAR_WEEKS, PAR_WEEKS,
} from '../caseOrder.ts';

// ── the rule: a case only when the extra bottles go soon ──────────────────────

test("Tito's: short 4, ~6 a week → 1 case (the other 8 last about a week)", () => {
  const p = planOrderLine({ shortfall: 4, caseSize: 12, perWeek: 6 });
  assert.equal(p.unit, 'case');
  assert.equal(p.quantity, 12);
  assert.equal(p.cases, 1);
  assert.equal(p.chosen, false);
  assert.match(p.reason, /needed 4 — the other 8 last about 1 week/);
});

test('Green Chartreuse: short 1, ~1 a month → 1 bottle, never a case', () => {
  const p = planOrderLine({ shortfall: 1, caseSize: 12, perWeek: 0.25 });
  assert.equal(p.unit, 'bottle');
  assert.equal(p.quantity, 1);
  assert.match(p.reason, /11 extra for months/);
});

test('the line is exactly the clear-weeks limit', () => {
  // 9 extra at 3/week = 3 weeks → case; at 2.9/week just over → bottles
  assert.equal(planOrderLine({ shortfall: 3, caseSize: 12, perWeek: 9 / CASE_CLEAR_WEEKS }).unit, 'case');
  assert.equal(planOrderLine({ shortfall: 3, caseSize: 12, perWeek: 2.9 }).unit, 'bottle');
});

test('short a whole case or more and slow → cases + the loose bottles, not rounded up', () => {
  const p = planOrderLine({ shortfall: 15, caseSize: 12, perWeek: 0.5 });
  assert.deepEqual([p.unit, p.quantity, p.cases, p.loose], ['case', 15, 1, 3]);
});

test('exactly whole cases is a case line with nothing to explain', () => {
  const p = planOrderLine({ shortfall: 24, caseSize: 12, perWeek: null });
  assert.deepEqual([p.unit, p.quantity, p.cases, p.reason], ['case', 24, 2, '']);
});

test('no usage and no par → exactly what is short', () => {
  const p = planOrderLine({ shortfall: 4, caseSize: 12, perWeek: null });
  assert.deepEqual([p.unit, p.quantity, p.reason], ['bottle', 4, '']);
});

test('no case size known (a mini, an odd size) → bottles', () => {
  assert.equal(planOrderLine({ shortfall: 4, caseSize: null, perWeek: 100 }).unit, 'bottle');
});

test("the bar's own choice always wins", () => {
  const b = planOrderLine({ shortfall: 4, caseSize: 12, perWeek: 50, choice: 'bottle' });
  assert.deepEqual([b.unit, b.quantity, b.chosen], ['bottle', 4, true]);
  const c = planOrderLine({ shortfall: 4, caseSize: 12, perWeek: 0, choice: 'case' });
  assert.deepEqual([c.unit, c.quantity, c.chosen], ['case', 12, true]);
  const c2 = planOrderLine({ shortfall: 13, caseSize: 12, choice: 'case' });
  assert.equal(c2.quantity, 24);
});

test('nothing short is nothing ordered', () => {
  assert.equal(planOrderLine({ shortfall: 0, caseSize: 12, perWeek: 99, choice: 'case' }).quantity, 0);
});

// ── how fast the bar goes through it ─────────────────────────────────────────

const usage = { span_days: 14, products: { t: 12 }, names: { 'green chartreuse': 1 } };

test('usage from orders: by product, then by name; missing = barely used', () => {
  assert.deepEqual(weeklyUse({ productId: 't', usage }), { perWeek: 6, source: 'orders' });
  assert.deepEqual(weeklyUse({ name: 'Green  Chartreuse', usage }), { perWeek: 0.5, source: 'orders' });
  assert.deepEqual(weeklyUse({ productId: 'x', name: 'Malort', par: 24, usage }), { perWeek: 0, source: 'orders' });
});

test('no order history → par read as about three weeks of stock (errs low)', () => {
  assert.deepEqual(weeklyUse({ par: 24, usage: { span_days: 0, products: {}, names: {} } }),
    { perWeek: 24 / PAR_WEEKS, source: 'par' });
  assert.deepEqual(weeklyUse({ par: 0 }), { perWeek: null, source: null });
});

test('par fallback: a par-24 well vodka rounds up; a par-6 bottle of a 12-pack does not', () => {
  const tito = weeklyUse({ par: 24 }).perWeek;        // 8/week
  assert.equal(planOrderLine({ shortfall: 4, caseSize: 12, perWeek: tito }).unit, 'case');
  const slow = weeklyUse({ par: 6 }).perWeek;         // 2/week; 8 extra = 4 weeks
  assert.equal(planOrderLine({ shortfall: 4, caseSize: 12, perWeek: slow }).unit, 'bottle');
  const handle = weeklyUse({ par: 6 }).perWeek;       // a 1.75L 6-pack: 4 extra = 2 weeks
  assert.equal(planOrderLine({ shortfall: 2, caseSize: 6, perWeek: handle }).unit, 'case');
});

// ── case sizes from the bottle size ──────────────────────────────────────────

test('case size from bottle size', () => {
  assert.equal(defaultCaseSize('750ml'), 12);
  assert.equal(defaultCaseSize('1L'), 12);
  assert.equal(defaultCaseSize('1.75L'), 6);
  assert.equal(defaultCaseSize('1.75 L'), 6);
  assert.equal(defaultCaseSize('375ml'), 24);
  assert.equal(defaultCaseSize('12oz'), 24);
  assert.equal(defaultCaseSize('50ml'), null);
  assert.equal(defaultCaseSize(''), null);
  assert.equal(defaultCaseSize(null), null);
  assert.equal(sizeMl('70cl'), 700);
});

// ── how it reads ─────────────────────────────────────────────────────────────

test('short and long forms', () => {
  assert.equal(shortQty({ quantity: 24, unit: 'case', caseSize: 12 }), '2 cs');
  assert.equal(shortQty({ quantity: 15, unit: 'case', caseSize: 12 }), '1 cs + 3');
  assert.equal(shortQty({ quantity: 4, unit: 'bottle', caseSize: null }), '4 btl');
  assert.equal(longQty({ quantity: 24, unit: 'case', caseSize: 12 }), '2 cases (24 bottles)');
  assert.equal(longQty({ quantity: 13, unit: 'case', caseSize: 12 }), '1 case + 1 (13 bottles)');
  assert.equal(longQty({ quantity: 1, unit: 'bottle', caseSize: null }), '1 bottle');
  assert.equal(nameKey("  Tito's   1L "), "tito's 1l");
});
