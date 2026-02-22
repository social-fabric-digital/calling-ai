#!/bin/bash
# Development startup script that ensures CI mode is disabled
# This prevents Metro from running in CI mode which disables hot reloading

# Unset CI to ensure watch mode is enabled
unset CI

# Kill any existing Expo processes
pkill -f "expo start" 2>/dev/null
pkill -f "metro" 2>/dev/null

# Clear caches
rm -rf .expo node_modules/.cache .metro .expo-shared 2>/dev/null

# Start Expo with cleared cache
echo "🚀 Starting Expo development server..."
npx expo start --clear --reset-cache
