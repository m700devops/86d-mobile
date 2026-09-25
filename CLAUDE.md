# 86'd Mobile

## Project
React Native iOS bar inventory app. AI-powered bottle scanning for bartenders.
Scan flow: point the camera at a bottle, AI vision identifies it (name/brand/category —
OpenAI GPT-4o primary, Gemini fallback, both server-side in 86d-api),
then the user taps in the current stock count on a number pad. There is no pen-based
detection and no automatic liquid-level reading in the current app — that was removed.
Don't describe either in UI copy or docs.

## Repos
- Mobile: https://github.com/m700devops/86d-mobile
- Backend: https://github.com/m700devops/86d-api

## Stack
- React Native / Expo SDK 55
- EAS Build for iOS
- FastAPI backend (single-file `main.py`) at https://eight6d-api.onrender.com

## Key Files
- app.json — EAS config, bundleIdentifier: com.my86d.app, icon: assets/icon.png
- eas.json — build profiles (use "preview" for testing)
- src/screens/CameraScan.tsx — the scanning screen: camera → AI bottle ID → manual count
  entry via number pad (`padVisible`/`stockInput`). First run goes through the start
  screen (`showStartScreen`), which is the real onboarding: three steps, shown only when
  nothing has been counted yet, and a heads-up that camera access is about to be asked
  for and why — a pre-prompt materially lifts opt-in, and iOS only offers the dialog once.
  **That "once" is the thing to be careful with**: after a single "Don't Allow", every
  later `requestPermission()` resolves denied WITHOUT showing anything, so a button wired
  to it does nothing forever. The blocked screen therefore branches on
  `permission.canAskAgain` and offers `Linking.openSettings()` when the system won't ask
  again, carries a menu button (App.tsx hides the hamburger while the camera is up, so
  without one a denied permission left no way out of the app at all), and re-reads the
  permission on foreground. That re-read also has to call `initScanning()` itself —
  clearing the block alone lands on the "Starting camera..." placeholder with nothing to
  move it along. The foreground listener is only subscribed while permission is
  ungranted, which is what keeps it clear of the normal startup path
- src/screens/ReviewGrid.tsx — multi-bottle review grid. Par level and distributor
  are read from the product book by productId, not off the Bottle, so a bottle this
  bar has counted before arrives already parred and already grouped under its
  distributor. Both are editable here and every edit writes back to the book — the
  distributor chip shows the saved name and stays tappable so a wrong one can be
  corrected. Par's minimum is 1: 0 is the backend's "never set"

- src/screens/OrderSummary.tsx — order summary: distributor breakdown, Email/Call/Print
  actions, first-send restaurant-name setup modal
- src/screens/SettingsScreen.tsx — manage distributors (add/edit/remove) + Restaurant
  section (business name / bar manager name, editable anytime)
- src/screens/LoginScreen.tsx — login. Email field intentionally has no `autoFocus` —
  auto-popping the keyboard on first open hid the "New to 86'd?" create-account link
- src/screens/RegisterScreen.tsx — registration. Four fields, not five: Confirm
  Password is gone (the eye toggle lets someone read back what they typed, which is
  what the second field was standing in for, and it is the most expensive field on a
  sign-up form). Confirm Email STAYS — that address is the only account-recovery path
  there is and nothing in the app verifies it, so a typo means an account nobody can
  get back into. Remove it only once email verification exists
- src/screens/BarNameScreen.tsx — one field, shown once, right after a social sign-up
  whose account has no `business_name`. That name heads every order email, and it used
  to be demanded by a modal in OrderSummary at first send — with an order ready to go
  out, the worst possible moment. It is also what keeps sales attribution honest: the
  CRM matches a lead to a customer by email first and falls back to the business name,
  which is the only handle left when someone signs in with Hide My Email
- src/components/AppleSignInButton.tsx — Sign in with Apple, above the form on both
  auth screens. Renders NOTHING on Android or an iOS too old for it, so the email form
  is never sitting under a dead button. **Apple, not Google, and that is a constraint
  rather than a preference**: guideline 4.8 says an app offering Google Sign-In must
  also offer an equivalent login that limits collection to name and email and lets
  people keep the address private — i.e. adding Google means adding Apple anyway. On an
  iOS-only app Apple alone gets the same result with no OAuth client id, no Google
  Cloud project and no secret. Apple's own sheet never shows our terms, so the line
  under the button is the consent surface and pressing through it is the acceptance
- src/services/analytics.ts — the five pre-signup funnel events (app_opened,
  login_viewed, register_viewed, register_submitted, register_succeeded) posted to the
  backend's `POST /v1/events`. Fire-and-forget by construction: batched briefly, given
  up on silently rather than retried (bar wifi fails constantly and a retry ladder here
  would compete with scans for bandwidth), and sent with `fetch` rather than the axios
  client ON PURPOSE — that client carries the auth interceptor's refresh-and-retry
  path, and a metric must never be able to trigger a token refresh. The anon id is a
  random per-install string in AsyncStorage, NOT a device identifier: it exists only so
  one install's open → view → submit can be joined into a funnel
- src/screens/Onboarding.tsx — first-run onboarding flow. Feature copy must match the
  actual scan flow (AI bottle ID + manual count) — no pen/liquid-level claims
- src/screens/OrderHistory.tsx — past orders, spend-by-distributor and most-ordered-item
  summary, reorder-from-history. Deliberately not variance/shrinkage detection — there's
  no per-scan usage log, so the only trustworthy signal is what was actually ordered.
  Shows each order's NUMBER (`order_number`, "#1042") — the one the distributor email
  carried, drawn server-side per account in 86d-api — on the row, as the detail sheet's
  title, and in share/print; the search box finds "1042" or "#1042" server-side. Orders
  sent before numbers existed have none and render exactly as before. OrderSummary's
  "Orders Sent!" screen shows the number under each distributor, tracked PER distributor
  because one that failed and was re-sent went out as a new order with its own number
- src/screens/PricingScreen.tsx — the Bottle Book (sidebar label; screen key is still
  `pricing`). The place to review and edit all three per-bottle settings — price, par,
  distributor — outside a count, one editor sheet per bottle. Sections: NEEDS SETUP
  (counted this session, still missing one of the three), YOUR BOTTLES (the rest of the
  book, with a "Needs setup (n)" filter), ADD FROM CATALOG (set a bottle up before it's
  ever scanned — `trackProduct` gives it a book row), plus the duplicate-product merge
  picker. The two lists are deliberately disjoint: a session bottle shows in the first
  and is filtered out of the second. Blanking a field clears it; price is awaited and can
  fail, par/distributor queue (see ProductBookContext), so the editor saves price first
- src/screens/PaywallScreen.tsx — shown when trial/subscription has lapsed; blocks the
  rest of the app except sign-out. Checkout opens Stripe's hosted page in the system
  browser — no Stripe code or IAP runs inside the app itself
- src/services/api.ts — all backend API calls (axios, auto token refresh)
- src/services/geminiVision.ts — thin wrapper around `apiService.analyzeBottleImage`.
  Name is legacy from when Gemini was the only provider — the actual model choice
  (OpenAI vs. Gemini) happens server-side in 86d-api, not here
- src/context/AuthContext.tsx — auth state; `user` includes `business_name`/`manager_name`
- src/context/InventoryContext.tsx — active inventory session state, plus the
  automatic re-identification sweep for scans that failed on a bad connection.
  Sweeps fire on hydration, any NetInfo online event, app foreground, and a 30s
  poll — deliberately NOT only on an offline→online edge, because weak-but-
  present service (the original grocery-store bug) never reports offline at all
- src/utils/retryPolicy.ts — pure policy behind that sweep: what's retryable,
  the backoff ladder, and which failures count against a row. Connectivity
  failures are unbounded (a dead zone isn't the bottle's fault, and giving up
  because it lasted a while was the bug); only definitive "the AI looked and
  couldn't identify it" answers are capped, at 3
- src/context/LocationContext.tsx — bar location selection (multiple bars per account)
- src/context/DistributorContext.tsx — distributor list state (name/email/phone/repName;
  used by Settings, ReviewGrid, OrderSummary). Also exposes `initialsFor(id)` — badge
  initials are DERIVED from the name, never typed and never stored. Settings used to ask
  for them and require them, but the backend has no initials column and `addDistributor`
  never sent one, so every badge silently fell back to a literal "D"
- src/utils/distributorInitials.ts — `buildInitialsMap()`, the derivation behind that.
  Resolves collisions across the whole list so two distributors never share a badge
  ("Blue Bottle" takes BB, "Breakthru Beverage" falls to BE). Sorts by name internally, so
  the result doesn't shift when the context appends a new distributor to local state and
  then reloads it name-sorted from the API
- src/context/ProductBookContext.tsx — the product book: everything a bar decides
  ONCE per bottle and should never be asked again — price, par level, and distributor —
  held per (location, product) and looked up by productId (`priceFor`/`parFor`/
  `distributorFor`, or `useBottleDefaults`'s `parOf`/`isParSet`/`distributorOf`).
  Lookup, never copied onto a Bottle: that's what lets a scan "know" its par and
  distributor the instant it resolves to a productId, with no hydration step to race
  (the old mount-effect hydration in ReviewGrid only ever reached bottles that already
  existed, so anything scanned afterwards silently lost its saved distributor).
  `parLevel`/`distributorId` on Bottle are fallbacks only, for rows with no productId
  yet. `entries` is every bottle with a book row, however little is filled in — the
  Bottle Book can't show what's missing if bottles only appear once something is set.
  Price writes are optimistic with rollback; par/distributor writes apply locally
  and queue for retry on reconnect rather than rolling back — those are tapped mid-count
  on bad bar wifi, and reverting the number under someone's thumb is worse than a write
  that lands a minute late. Reconnect-triggered refresh via NetInfo. Backed by
  `par_levels` (price + par) and `location_product_distributors` in 86d-api
- src/context/StaffContext.tsx — per-bar list of staff names for "who counted this" —
  no logins, no passwords, no roles
- src/utils/scanImage.ts — `prepareScanImage()`, the ONE place a scan photo becomes an upload,
  shared by the live scan and the background re-identification sweep so both send the same
  thing. Crops to `SCAN_CROP` (the viewfinder's corner guides plus a wide margin — the whole
  frame used to go up, so on a shelf the bottle being counted sat among its neighbours), then
  800px wide at JPEG 0.8. The crop is the only way to add detail: gpt-4o scales every image to
  768px on its short side whatever is sent, so sending less of the shelf puts ~1.3× more of its
  pixels on the label. Fractions of the preview ARE fractions of the photo: expo-camera crops each
  iOS photo to the preview, and the manipulator applies orientation before cropping. Any crop
  failure falls back to the whole frame — a scan never fails because of it. Capture quality is
  0.85 for the same reason (`skipProcessing` is Android-only; on iOS `quality` is only the saved
  JPEG's compression, and the crop is barely downscaled, so capture artifacts reach the AI)
- Scan ↔ server accuracy loop: `/scans/analyze` gets the bar's `location_id` and returns a
  `scan_id`, kept on the row as `Bottle.scanId` (live scan, fire-and-forget resolve, and retry).
  The draft sync already uploads whole rows, so 86d-api learns which product each scanned row
  ended up as without another call. `match_method: 'unreadable'` means the server couldn't read
  the label and deliberately matched nothing — the pad says "move closer and retake"
- src/utils/productKey.ts — `bottleMatchKey()`, swap/normalize-tolerant dedupe key used
  client-side to catch the AI transcribing the same bottle's label differently between scans
- src/utils/entitlements.ts — `isEntitled()`/`trialDaysLeft()`; mirrors the backend's
  `is_entitled()` in main.py, kept in sync manually — backend is the real source of truth
- src/components/Brand.tsx — `BrandMark` (code-drawn login-screen logo) + `GlowBackground`.
  This is separate from `assets/icon.png` (the real home-screen icon) — keep both in sync
  if rebranding
- src/config/api.ts — `API_URL = https://eight6d-api.onrender.com/v1`

## Branding
- `assets/icon.png` — "86'd" rubber-stamp wordmark, tilted, over a 7-bottle skyline (the
  3rd bottle is red, ties to the stamp), on a warm paper background. 1024x1024, RGB (no
  alpha channel, required by Apple). This is the actual iPhone home-screen icon. Replaced
  the old bottle-outline-with-liquid-level-lines design — that visual was a leftover
  reference to the removed pen/liquid-level flow (see Project section above).
- `assets/splash-icon.png` — same design as `assets/icon.png`, rounded-corner card, shown
  via `app.json`'s `splash.image` (`resizeMode: "contain"`) against `splash.backgroundColor`
  `#f2ece4` (the design's paper tone — the skyline's dark/charcoal bars need a light backdrop
  to read; they disappear against the app's dark UI background).
- `assets/favicon.png` — same mark, stamp-only (no skyline — mushes together below ~80px),
  rounded corners, 48x48.
- Logo palette (icon/splash/favicon/BrandMark only): paper `#f2ece4`, red `#8a1a26`,
  charcoal `#17181b`/`#2b2c30`/`#3a3b40`. This is separate from the in-app UI theme in
  `src/constants/colors.ts` (primaryDark `#0F0F0F`, accentPrimary `#FF6B35`, accentSecondary
  `#FFD700`) — the app's dark UI theme was intentionally left alone; only the logo/icon
  surfaces moved to the new palette.

## Build Rules
- ONE build at a time (costs $2-4 each)
- ONLY use preview profile unless explicitly told otherwise
- NEVER run production builds without explicit approval
- Check expo imports match package.json versions before building — `npx expo install <pkg>`
  picks the SDK-matched version automatically instead of guessing

## Triggering a Build
Two ways to build, depending on where you're running:

**From the canonical server** (`~/.openclaw/projects/86d-mobile`), `~/.expo_env` exists:
```bash
source ~/.expo_env
eas whoami   # should show: m700devops (authenticated using EXPO_TOKEN)
eas build --platform ios --profile preview
```

**From a fresh Claude Code remote sandbox**, `~/.expo_env` does NOT exist and `eas` is not
globally installed — don't assume either is there. Options, in order of preference:
1. Trigger the `.github/workflows/build-ios.yml` GitHub Action instead (it's
   `workflow_dispatch` with a `profile` input and already has `EXPO_TOKEN` as a repo
   secret) — this avoids needing any local token at all. Use the GitHub MCP tools
   (`actions_run_trigger`) or `gh workflow run build-ios.yml -f profile=preview`.
2. If you must run `eas` locally in the sandbox, use `npx eas-cli` (no local install
   needed) and ask the user for `EXPO_TOKEN` directly — don't assume it's already set.
   If they paste it in chat, treat it as sensitive: don't echo it, and remind them to
   rotate it afterward.

## Git Rules
- Cannot push directly to main — always work on a feature branch and open a PR
- No PR template configured in either repo
- No CI runs automatically on PRs in either repo (mobile's only workflow is the manual
  `build-ios.yml` above) — a PR is mergeable as soon as the diff looks right
- If your designated branch was already merged, restart it from latest `main` before
  adding new commits rather than stacking on old (now-squashed) history:
  `git checkout -B <branch> main` then force-with-lease push

## Repo Locations
- User's server: `~/.openclaw/projects/86d-mobile` (canonical, has `~/.expo_env`)
- Claude Code remote sandbox: `/home/user/86d-mobile` (fresh clone per session —
  `node_modules` is NOT pre-installed; run `npm install` before `tsc`/`expo export`)

## Config
- `ios.usesAppleSignIn: true` + the `expo-apple-authentication` plugin in app.json are
  what put the Sign In with Apple entitlement on the build. **It is a native module, so
  it does not work in Expo Go** — the button needs a dev or preview build to test at all
- EAS Project ID: 514e311c-b6a4-4702-9ed8-08324144be33
- Bundle ID: com.my86d.app
- Apple Team: 45A7XLA33X (Stephan Khouri, Individual)
- Expo owner: m700devops

## Backend Notes (86d-api)
- Single-file FastAPI monolith (`main.py`) + `models.py` (Pydantic) + `database.py`
  (Postgres via psycopg2; migrations are `ALTER TABLE` statements gated on an
  `information_schema.columns` check, run inside `init_db()` — follow that pattern for
  new columns, there's no separate migration tool)
- `users` table has `business_name`/`manager_name` (added to personalize order emails)
  alongside the base auth columns
- `POST /orders/email` sends via Resend's raw REST API through `httpx`, not the `resend`
  pip package — reads `RESEND_API_KEY` and `ORDER_EMAIL_FROM` from env
- **The backend is on Render's Starter plan, NOT Free** ($7/mo, 0.5 CPU, 512MB) — confirmed
  from the Render dashboard on 2026-09-15. Starter does not spin down, so there is no
  ~30-60s cold start to design around and nothing to upgrade. This note previously said the
  opposite and hedged that the plan couldn't be confirmed from the repo; it can't, and the
  guess was wrong. Postgres is on a paid tier separately.
- The client-side retry/warm-up logic in the app is still worth keeping — a deploy, a
  restart or a bad bar wifi connection all produce the same slow first request — but it is
  no longer papering over a sleeping server. Don't cite cold starts as the reason for
  latency without checking the dashboard first.
