# 86'd Mobile App

React Native + Expo app for bar inventory management.

## Features

- 📸 Scan barcodes on bottles
- 📝 Log inventory levels (full, 3/4, half, 1/4, empty)
- 📊 Generate restock orders
- 🔊 Voice notes for observations
- ☁️ Sync with cloud backend

## Backend

API: https://eight6d-api.onrender.com

## Development

### Prerequisites

- Node.js
- Expo CLI
- Expo Go app on your phone

### Setup

```bash
npm install
```

### Run locally

```bash
# Start Expo development server
npx expo start

# Scan QR code with Expo Go app on iPhone/Android
```

## Build for Production

### Android (Linux/Windows)

```bash
npx expo build:android
```

### iOS (Requires Mac)

```bash
npx expo build:ios
```

## Project Structure

- `App.tsx` - Main app component
- `api.ts` - API client for backend
- `assets/` - Images and icons

## Tech Stack

- React Native
- Expo
- TypeScript
- Camera API for barcode scanning
