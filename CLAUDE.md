# 86'd Mobile

## Project
React Native iOS bar inventory app. AI-powered bottle scanning for bartenders.
Primary scan mode: user holds a physical pen at the liquid line — the app detects the pen tip to measure bottle level.

## Repos
- Mobile: https://github.com/m700devops/86d-mobile
- Backend: https://github.com/m700devops/86d-api

## Stack
- React Native / Expo SDK 55
- EAS Build for iOS
- FastAPI backend at https://eight6d-api.onrender.com

## Key Files
- app.json — EAS config, bundleIdentifier: com.my86d.app
- eas.json — build profiles (use "preview" for testing)
- src/screens/CameraScan.tsx — main scanning screen (pen-first flow)
- src/screens/PenDetection.tsx — pen tip detection logic
- src/screens/PenScanReview.tsx — review/confirm after pen scan
- src/screens/ReviewGrid.tsx — multi-bottle review grid (uses distributors)
- src/screens/OrderSummary.tsx — generated order summary (uses distributors)
- src/screens/SettingsScreen.tsx — manage distributors (add/edit/remove)
- src/screens/LoginScreen.tsx — login
- src/screens/RegisterScreen.tsx — registration
- src/screens/Onboarding.tsx — first-run onboarding flow
- src/services/api.ts — all backend API calls (axios, auto token refresh)
- src/services/geminiVision.ts — client-side image → API bridge
- src/context/AuthContext.tsx — auth state
- src/context/InventoryContext.tsx — active inventory session state
- src/context/LocationContext.tsx — bar location selection
- src/context/DistributorContext.tsx — distributor list state (used by Settings, ReviewGrid, OrderSummary)
- src/config/api.ts — API_URL = https://eight6d-api.onrender.com/v1

## Build Rules
- ONE build at a time (costs $2-4 each)
- ONLY use preview profile: eas build --platform ios --profile preview
- NEVER run production builds without explicit approval
- Check expo imports match package.json versions before building

## Git Rules
- Cannot push directly to main — push to claude/build-ios-preview-ASNee and PR
- Branch claude/build-ios-preview-ASNee is the working dev branch

## Config
- EAS Project ID: 514e311c-b6a4-4702-9ed8-08324144be33
- Bundle ID: com.my86d.app
- Apple Team: 45A7XLA33X
- Expo owner: m700devops
