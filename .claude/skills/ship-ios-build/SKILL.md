---
name: ship-ios-build
description: Run an EAS iOS build and submit it to App Store Connect. Use when asked to kick off a build, ship an update, push a new version to TestFlight or the App Store, or check whether a submitted build has finished processing.
---

# Ship an iOS build

Builds cost real money ($2-4 each) and submissions are visible to Apple. Read the gates
before running anything.

## Gates — check these first, every time

- **One build at a time.** Never start a second while one is running.
- **`preview` is the default.** Use it unless explicitly told otherwise.
- **`production` requires explicit approval from Stephan, per build.** Approval for one
  production build is not approval for the next one.
- **Never push to `main`.** Feature branch and PR only.

## Pre-flight

```bash
cd /home/user/86d-mobile
grep -rn "HARNESS" src/      # leftover UI-verification scaffolding — must be empty
git status --porcelain       # must be clean
npx tsc --noEmit             # must pass
```

A fresh clone needs `npm install` first — `node_modules` is not pre-installed.

Also confirm Expo package versions match the SDK. `npx expo install <pkg>` picks the
SDK-matched version; guessing a version number is how a build fails 15 minutes in.

## Building

**Preferred in a sandbox — the GitHub Action.** `.github/workflows/build-ios.yml` is
`workflow_dispatch` with a `profile` input and already holds `EXPO_TOKEN` as a repo secret,
so nothing needs a local token:

```bash
gh workflow run build-ios.yml -f profile=preview
```

Or use the GitHub MCP tool `actions_run_trigger`.

**On Stephan's server** (`~/.openclaw/projects/86d-mobile`), `~/.expo_env` exists:

```bash
source ~/.expo_env
eas whoami                  # expect: m700devops
eas build --platform ios --profile preview
```

**Locally in a sandbox as a last resort:** `eas` is not installed globally — use
`npx eas-cli`, and ask Stephan for `EXPO_TOKEN` directly rather than assuming it is set.
If he pastes it in chat, do not echo it, and remind him to rotate it afterward.

Builds take roughly 15-25 minutes. Run them in the background rather than blocking.

## Submitting to App Store Connect

`eas.json` already carries `submit.production.ios.ascAppId` — that is the public App Store
app ID and is committed on purpose. What it does **not** carry, and must never carry, are
the API key fields.

To submit non-interactively you have to temporarily add three fields to
`submit.production.ios`:

```jsonc
"ascApiKeyPath":     "<path to the .p8 file>",
"ascApiKeyId":       "<key id>",
"ascApiKeyIssuerId": "<issuer id>"
```

Ask Stephan for the key file and its IDs. **This repo is public** — do not write those
values into any tracked file, commit message, or PR body.

```bash
npx eas-cli submit --platform ios --profile production --latest --non-interactive
```

**Revert `eas.json` the moment the submit has read its config** (the log will show it has
picked up the credentials):

```bash
git checkout -- eas.json
git status --porcelain     # confirm eas.json is no longer modified
```

Do this even if the submit later fails. A failed submit with credentials still sitting in
a tracked file is worse than a failed submit.

If a submit errors with "Run this command inside a project directory," the shell lost its
working directory between calls — re-run with the correct `cd`. That failure never reaches
Apple, so retrying is safe.

## After submitting

Apple takes ~5-15 minutes to process a build before it appears in App Store Connect. A
build that is not visible yet is usually still processing, not missing. Do not resubmit.

Status can be checked read-only through the App Store Connect API (JWT, ES256, signed with
the same `.p8` key):

- `GET /v1/apps/{id}/builds` — has the build finished processing
- `GET /v1/apps/{id}/appStoreVersions` — review state

Prefer checking this over guessing. Report the state Apple actually returns
(`WAITING_FOR_REVIEW`, `IN_REVIEW`, `PENDING_DEVELOPER_RELEASE`, ...) rather than
paraphrasing it as "submitted" or "should be live soon."

## Notes

- The `production` profile has `autoIncrement: true`, so the build number rises on its own.
  Do not bump it by hand.
- Checkout runs through Stripe in the system browser; no in-app purchase code ships in the
  app. If a rejection cites Guideline 3.1.1, that is a product decision for Stephan, not
  something to fix by adding IAP unilaterally.
