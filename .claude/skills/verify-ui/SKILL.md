---
name: verify-ui
description: Visually verify a React Native screen by rendering it in headless Chromium via Expo web, then screenshot and measure it. Use when asked to screenshot a screen, confirm a UI or layout change looks right, check spacing/alignment/overlap, or verify a visual fix — there is no iOS simulator in this environment, so this is the only way to actually see the app.
---

# Verify a UI change

There is no iOS simulator in the Claude Code sandbox. The only way to see a screen is to
render the app as Expo web and drive it with headless Chromium (Playwright is preinstalled).

The hard part is not taking the screenshot. It is (a) getting a single screen to render
without a real login/backend, and (b) removing every trace of the scaffolding afterwards.
Skipping (b) is how broken code gets committed.

## 0. Prerequisites

A fresh clone has no `node_modules`:

```bash
cd /home/user/86d-mobile && npm install
```

Chromium lives at `/opt/pw-browsers/chromium`. Never run `playwright install`.

## 1. Start Expo web

```bash
npx expo start --web --port 8081
```

Run it in the background and give it time to bundle (30-60s on first run). Tail the log
until it reports the bundle is ready before pointing a browser at it.

## 2. Get the target screen to render

Most screens sit behind auth, a location selection, and live API data. Two ways through,
both temporary:

**A — hash route in `src/App.tsx`** (best for a whole screen)

Add a branch near the top of `AppContent` that renders the target screen directly:

```tsx
// HARNESS — REMOVE BEFORE COMMIT
if (typeof window !== 'undefined' && window.location.hash === '#pricingprobe') {
  return <PricingScreen />;
}
```

**B — stub the context hooks** (needed when the screen calls `useAuth`/`useInventory`/etc.)

Replace the hook call inside the screen with fixture data:

```tsx
// HARNESS — REMOVE BEFORE COMMIT
// const { bottles } = useInventory();
const bottles = [{ productId: 'p1', name: "Jack Daniel's", brand: 'Brown-Forman', currentStock: 2 }];
```

Mark every harness edit with a `HARNESS — REMOVE BEFORE COMMIT` comment. That comment is
what makes step 4 reliable — it turns cleanup into a grep instead of a memory exercise.

Watch for helper components defined in the same file that call hooks of their own. They need
stubbing too, or the render dies with a null-context error that looks like a layout bug.

## 3. Screenshot and measure

```js
const { chromium } = require('playwright');
const OUT = '<scratchpad>/';

(async () => {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    args: ['--no-sandbox'],
  });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },   // iPhone-ish; shrink height to force overflow
    deviceScaleFactor: 3,
  });
  const page = await context.newPage();

  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  // The ?r= cache-buster is REQUIRED — see gotchas.
  await page.goto(`http://localhost:8081/?r=${Date.now()}#pricingprobe`, {
    waitUntil: 'networkidle', timeout: 120000,
  });
  await page.waitForSelector('text=Price Book', { timeout: 20000 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: OUT + 'probe.png' });

  // Measure. Do not judge alignment by eye.
  const box = await page.evaluate(() => {
    const a = document.querySelector('[data-testid="pad-actions"]');
    const k = document.querySelector('[data-testid="pad-keypad"]');
    if (!a || !k) return { error: 'not found' };
    const ra = a.getBoundingClientRect(), rk = k.getBoundingClientRect();
    return {
      actionsLeft: Math.round(ra.left), keypadLeft: Math.round(rk.left),
      actionsRight: Math.round(ra.right), keypadRight: Math.round(rk.right),
      aligned: Math.round(ra.left) === Math.round(rk.left)
            && Math.round(ra.right) === Math.round(rk.right),
    };
  });
  console.log('measurements:', JSON.stringify(box, null, 2));
  console.log('console errors:', JSON.stringify(errors, null, 2));
  await browser.close();
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
```

Read the screenshot to confirm the change is there, but settle alignment, spacing and
overlap questions with `getBoundingClientRect()` numbers. A 16px misalignment is invisible
in a screenshot and obvious in the measurements.

To reproduce a "button is unreachable on a real device" report, shrink the viewport height
until the content overflows — that is the condition small phones hit, not a narrower width.

## 4. Clean up — mandatory, before any commit

```bash
grep -rn "HARNESS" src/           # must return nothing
git status --porcelain            # must show ONLY the real fix
npx tsc --noEmit                  # must pass
```

Delete any probe files created for the test. If `git status` shows a file you only touched
for the harness, revert exactly that file: `git checkout -- src/App.tsx`.

Reverting one harness file and forgetting another is the most common failure here, and
`tsc` is what catches it — a stubbed-out hook usually leaves an unused import or an
unreachable branch behind.

## Gotchas that have actually caused bugs here

- **Fragment-only URL changes do not reload the page.** `App.tsx` reads `window.location.hash`
  once at mount, so navigating from `#a` to `#b` renders stale UI. Always append a
  cache-buster: `?r=${Date.now()}#probe`.
- **`flexShrink` defaults to `0` in React Native**, unlike CSS where it is `1`. A child that
  should shrink inside a constrained parent needs `flexShrink: 1` set explicitly, or it
  overflows and pushes siblings off screen.
- **`ScrollView` `style` padding and `contentContainerStyle` padding are different things.**
  Putting horizontal padding on the content container when the parent already has it
  double-pads the content and silently misaligns it against non-scrolling siblings.
- **Web rendering is an approximation.** It is reliable for layout, spacing, overflow and
  copy. It is not reliable for native-only behaviour — camera, haptics, safe-area insets,
  keyboard avoidance. Do not claim those are verified from a web screenshot.
