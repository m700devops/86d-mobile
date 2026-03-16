# 86'd Mobile

## Project
React Native iOS bar inventory app. AI-powered bottle scanning for bartenders.

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
- src/screens/CameraScan.tsx — main scanning screen
- src/services/api.ts — backend API calls

## Build Rules
- ONE build at a time (costs $2-4 each)
- ONLY use preview profile: eas build --platform ios --profile preview
- NEVER run production builds without explicit approval

## Known Issues
- Backend must use gemini-2.0-flash (not 1.5)
- Check expo imports match package.json before building

## Config
- EAS Project ID: 514e311c-b6a4-4702-9ed8-08324144be33
- Bundle ID: com.my86d.app
- Apple Team: 45A7XLA33X
