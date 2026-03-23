#!/bin/bash
cd /Users/robert/calling

# Enable review mode (hides AboutYouForm, uses "Friend" name)
perl -0pi -e "s/const APP_STORE_REVIEW_MODE = false;/const APP_STORE_REVIEW_MODE = true;/" app/onboarding.tsx

# Commit and build
git add -A && git commit -m "Enable review mode for App Store submission"
eas build --platform ios --profile production

echo "✅ Review mode enabled. After build completes, run: eas submit --platform ios --latest"
