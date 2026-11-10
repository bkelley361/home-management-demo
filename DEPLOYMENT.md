# Deployment & Running Guide

This demo app runs locally without any cloud backend, database accounts, or paid API keys.

## Local Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Run test suite & type checks
npm test
npm run typecheck

# 3. Start Metro bundler
npm run dev
```

Targeting platforms:
- **iOS Simulator**: `npm run ios` or press `i` in the Expo terminal.
- **Android Emulator**: `npm run android` or press `a` in the Expo terminal.
- **Web**: `npm run web` or press `w` in the Expo terminal.

## Creating Standalone Builds (EAS Build)

Because external native dependencies (such as RevenueCat and Sentry) have been removed, the demo app builds cleanly and can also run in Expo Go:

- **Android Preview APK**:
  ```bash
  npm run build:apk
  ```
- **iOS Simulator Build**:
  ```bash
  npm run build:dev:ios-sim
  ```
- **Production EAS Builds**:
  ```bash
  npm run build:preview
  npm run build:prod
  ```
