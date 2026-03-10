# 86'd Development Log

**Project:** 86'd - Bar Inventory App  
**Platform:** iOS (React Native / Expo)  
**Backend:** Python FastAPI on Render  
**Repository:** https://github.com/m700devops/86d-mobile

---

## March 9, 2026

### Backend Fixes

#### Database Migration Bug Fix
**Issue:** Backend crashed on startup with `sqlite3.OperationalError: no such table: scans`

**Root Cause:** In `database.py`, the `_migrate_scans_table(conn)` function was called at line 100, BEFORE the `scans` table was created at line 206.

**Fix:**
- Removed `_migrate_scans_table(conn)` call from line 99-100
- Added it AFTER line 238 (after scans indexes are created, before voice_notes table)
- Commit: `48ac5ab` - "fix: move scans migration after table creation"

**Status:** ✅ Deployed to Render

---

### Mobile App Fixes

#### 1. Scanning UI Error Handling
**Issue:** Scanning UI looped "Scanning..." forever with counter at 0. No error feedback.

**Root Cause:** 
- `geminiVision.ts` caught errors and returned `null` silently
- `CameraScan.tsx` showed no error message when API failed

**Fix:**
- `geminiVision.ts`: Re-throw errors with detailed messages (API errors, network errors)
- `CameraScan.tsx`: Show actual error in bottom tag + Alert.alert() for critical errors
- Added auth token check before starting scan
- Commit: `a5786ab` - "Add error handling and auth check to scanning UI"

**Status:** ✅ Pushed to main

---

#### 2. Auth Flow / Black Screen Bug
**Issue:** App started at onboarding screen. After clicking "Get Started" → "Start Scanning", got "Login Required" alert with no way to login. Login button did nothing.

**Root Cause:** 
- `App.tsx` didn't wrap with `AuthProvider`
- No auth state checking on startup
- No Login/Register screens in navigation flow

**Fix:**
- Wrapped app with `AuthProvider`
- Added auth state check: if not authenticated → show LoginScreen
- Added RegisterScreen route
- When authenticated but coming from login/register screens → redirect to Onboarding
- Added proper loading screen (not just black)
- Commit: `bf5c234` - "fix: add auth flow to app navigation"
- Commit: `b51d9c8` - "fix: fix black screen after login"

**Status:** ✅ Pushed to main

---

### Build Status

**Issue:** Hit Expo free tier iOS build limit
- Free tier allows limited iOS builds per month
- Last successful build: #14 (commit `bf5c234`) - has auth flow but NOT black screen fix
- Build #15 failed due to quota

**Next Steps:**
- Upgrade to Expo paid plan ($29/month) for unlimited builds
- Alternative: Use GitHub Actions with macOS runner (workflow exists at `.github/workflows/build-ios.yml`)
- Alternative: Build locally on cloud Mac (requires SSH access or manual trigger)

---

### Current App Flow (After Fixes)

1. **Not Authenticated:**
   - Open app → Login screen
   - Can navigate to Register
   - After login/register → Onboarding

2. **Authenticated:**
   - Onboarding → "Get Started" → CameraScan
   - CameraScan works (auth token present)
   - Can scan bottles, review, generate orders

---

### API Endpoints Verified

| Endpoint | Status | Notes |
|----------|--------|-------|
| `/v1/scans/analyze` | ✅ | Gemini Vision API for bottle detection |
| `/v1/scans/pen-capture` | ✅ | Pen mode scanning |
| `/v1/scans/batch` | ✅ | Bulk upload |
| `/v1/auth/login` | ✅ | Working |
| `/v1/auth/register` | ✅ | Working |

---

### Pending Tasks

- [ ] Upgrade Expo plan and trigger new build
- [ ] Test scanning with actual camera
- [ ] Verify Gemini API integration works end-to-end
- [ ] Test pen detection mode
- [ ] Test order generation and export

---

## March 10, 2026

*(To be updated)*

---

## Notes

- Backend is stable after migration fix
- Mobile app has proper auth flow now
- Need paid Expo plan to continue iOS builds
- GitHub Actions workflow exists for CI/CD
