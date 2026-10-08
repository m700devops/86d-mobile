// Run: node --test --experimental-strip-types src/utils/__tests__/emailProblem.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emailProblemText } from '../emailProblem.ts';

test('nothing wrong, nothing shown', () => {
  assert.equal(emailProblemText({ email: 'a@b.com' }), null);
});

test('a bounce names the address, the day and the reason, and what to do', () => {
  const t = emailProblemText({
    email: 'rep@metro.com', emailProblem: 'bounced',
    emailProblemReason: '550 user unknown', emailProblemAt: '2026-10-08T14:00:00',
  })!;
  assert.equal(t.title, 'Order emails to rep@metro.com are bouncing');
  assert.match(t.detail, /on Oct 8 \(550 user unknown\)/);
  assert.match(t.detail, /fix it in Settings/);
});

test('a spam report says so', () => {
  assert.match(emailProblemText({ email: 'x@y.com', emailProblem: 'complained' })!.title, /marked as spam/);
});
