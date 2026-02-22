# Development Guide

## Starting the Development Server

To ensure you always see the latest version of your app, use one of these methods:

### Option 1: Use the npm script (Recommended)
```bash
npm start
```
This automatically unsets CI mode to enable hot reloading.

### Option 2: Use the development script
```bash
./scripts/start-dev.sh
```
This script:
- Kills any existing Expo processes
- Clears all caches
- Unsets CI mode
- Starts Expo with cleared cache

### Option 3: Manual start
```bash
unset CI && npx expo start --clear --reset-cache
```

## Troubleshooting

### If you see old code:

1. **Check for CI mode**: Look for "Metro is running in CI mode" in the terminal
   - If you see this, CI mode is enabled and hot reloading won't work
   - Solution: Use `unset CI && npx expo start` or the npm scripts above

2. **Clear caches manually**:
   ```bash
   rm -rf .expo node_modules/.cache .metro .expo-shared
   ```

3. **Kill existing processes**:
   ```bash
   pkill -f "expo start"
   pkill -f "metro"
   ```

4. **Hard reload in app**:
   - Press `r` in the Expo terminal
   - Or shake device → Reload
   - Or close and reopen the app

5. **Restart everything**:
   - Stop Expo (Ctrl+C)
   - Clear caches (see above)
   - Restart Expo using one of the methods above

## Best Practices

- Always use `npm start` instead of `npx expo start` directly
- If you see "CI mode" warnings, stop and restart with `npm start`
- When switching branches or pulling new code, clear caches first
- If changes don't appear, try a hard reload (`shift + r` in terminal)
