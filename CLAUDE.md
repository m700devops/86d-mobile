# 86'd Mobile

## Project
React Native iOS bar inventory app. AI-powered bottle scanning for bartenders.
Scan flow: point the camera at a bottle, AI vision identifies it (name/brand/category —
OpenAI GPT-4o primary, Gemini 2.0 Flash fallback, both server-side in 86d-api),
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
  entry via number pad (`padVisible`/`stockInput`)
- src/screens/ReviewGrid.tsx — multi-bottle review grid (uses distributors)
- src/screens/OrderSummary.tsx — order summary: distributor breakdown, Email/Call/Print
  actions, first-send restaurant-name setup modal
- src/screens/SettingsScreen.tsx — manage distributors (add/edit/remove) + Restaurant
  section (business name / bar manager name, editable anytime)
- src/screens/LoginScreen.tsx — login. Email field intentionally has no `autoFocus` —
  auto-popping the keyboard on first open hid the "New to 86'd?" create-account link
- src/screens/RegisterScreen.tsx — registration
- src/screens/Onboarding.tsx — first-run onboarding flow. Feature copy must match the
  actual scan flow (AI bottle ID + manual count) — no pen/liquid-level claims
- src/screens/OrderHistory.tsx — past orders, spend-by-distributor and most-ordered-item
  summary, reorder-from-history. Deliberately not variance/shrinkage detection — there's
  no per-scan usage log, so the only trustworthy signal is what was actually ordered
- src/screens/PricingScreen.tsx — permanent per-bar Price Book: set a price once, it
  auto-matches on every future scan. "Needs a price" list + full price list + catalog
  search + duplicate-product merge picker
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
  used by Settings, ReviewGrid, OrderSummary)
- src/context/PricingContext.tsx — price book state backing PricingScreen; optimistic
  writes with rollback, reconnect-triggered refresh via NetInfo
- src/context/StaffContext.tsx — per-bar list of staff names for "who counted this" —
  no logins, no passwords, no roles
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
- Render free tier cold-starts in ~30-60s after ~15 min idle. The mobile app has
  client-side retry/warm-up logic to soften this, but that's a mitigation, not a fix —
  the real fix is upgrading the Render instance off the Free tier. (This is about the
  web service specifically — can't confirm its current Render plan from the repo; that's
  dashboard state. Postgres is confirmed on a paid tier separately.)
