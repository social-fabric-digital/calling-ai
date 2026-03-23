#!/bin/bash
cd /Users/robert/calling

# Disable review mode (shows AboutYouForm, uses real names)
perl -0pi -e "s/const APP_STORE_REVIEW_MODE = true;/const APP_STORE_REVIEW_MODE = false;/" app/onboarding.tsx

# Commit and push OTA update
git add -A && git commit -m "Disable review mode after approval"
eas update --branch production --message "Restore full onboarding"

echo "✅ Review mode disabled. Full onboarding restored for users."
