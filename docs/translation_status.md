# Translation Status Documentation

This document identifies all screens, components, and specific hardcoded strings that require translation implementation throughout the Destiny app.

## Summary

**Status Legend:**
- ✅ Fully translated
- ⚠️ Partially translated
- ❌ No translation support

---

## App Screens

### 1. ✅ `app/onboarding.tsx` (OnboardingScreen)
**Status:** Fully translated with `useTranslation()`

### 2. ✅ `app/landing.tsx` (LandingScreen)
**Status:** Fully translated with `useTranslation()`

### 3. ✅ `app/language-selection.tsx` (LanguageSelectionScreen)
**Status:** Fully functional (hardcoded but minimal text: "select your language")

### 4. ✅ `app/new-goal.tsx` (NewGoalScreen)
**Status:** Fully translated with `useTranslation()`

### 5. ❌ `app/(tabs)/index.tsx` (HomeScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ✅ Present
**Translation Hook Used:** ✅ `const { t } = useTranslation();` is present

**Untranslated Strings:**

#### Daily Question Bank
- All questions in `QUESTION_BANK` array (lines ~146-166):
  - "What dream would you chase if fear wasn't a factor?"
  - "What part of your identity have you been afraid to fully express?"
  - "What would your ideal day look like a year from now?"
  - "If you had to teach something today, what would it be?"
  - "What's one thing you'd do if you knew you couldn't fail?"
  - "What belief about yourself would you like to outgrow?"
  - "What does success look like to you today?"
  - "What part of your life deserves more of your energy?"
  - "If you could master one skill instantly, what would it be and why?"
  - "What would you do differently if you truly believed in yourself?"
  - "What story do you keep telling yourself that's no longer serving you?"

#### Greeting Section (lines ~187-193)
- "Hello, " (greeting prefix)

#### Section Headings
- "Explore" (line ~197) - **Note:** `t('home.explore')` is used elsewhere in the file
- "Cosmic Insight" (line ~214, button text)
- "Daily guidance" (line ~220, subtitle within button)
- "Progress This Week" (line ~231, button text)
- "Check your progress." (line ~237, subtitle within button)

#### Mood Selection (lines ~247-274)
- "I'm making progress" (line ~261, mood option)
- "I'm stuck" (line ~268, mood option)

#### Atlas Chat (lines ~276-305)
- "Atlas is here" (line ~294, modal header)
- Default chat initial message (line ~308): "Hello! I'm Atlas. I'm here to support you throughout your journey."
- Alert messages (lines ~461-465):
  - "Atlas Chat"
  - "This feature is coming soon!"
  - "OK"

#### Astrology Report Section (lines ~323-415)
- Report date heading logic (lines ~331-345):
  - Month names: "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"
  - Date format: "{month} {date}, {year}"
- Parsed headings from AI-generated content:
  - "What to Focus On Today" (line ~361)
  - All other section headings extracted from `astrologyReport` (bold text sections)
- Placeholder texts:
  - "Today is a great day to..." (line ~379)
  - "Focus on your goals and..." (line ~382)
  - "Remember to take care of yourself." (line ~385)

#### Modal Texts
- "In Queue" (line ~434, modal title)
- "Your quest is in the free queue..." (line ~438, long message)
- "Skip Queue" (line ~451, button)
- "No report available." (line ~455, modal message)

#### Close/Navigation Symbols
- "✕" (close button, line ~297)

---

### 6. ❌ `app/(tabs)/goals.tsx` (GoalsScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ✅ Present
**Translation Hook Used:** ✅ `const { t } = useTranslation();` is present

**Untranslated Strings:**

#### Header (lines ~282-293)
- "Goal +" (line ~291, header button)

#### Active Goals Section (lines ~295-455)
- "Active goals" (line ~300, section title)
- "Hardness Level" (line ~334, detail label)
- "Fear" (line ~342, detail label)
- "Progress" (line ~352, detail label)
- "Next level:" (line ~365, label)
- "Start your journey" (line ~369, fallback next level text)
- Goal name fallback: "write a cover letter" (line ~327)

#### Empty State (lines ~378-382)
- "No active goals yet. Create your first goal!" (line ~379)

#### Active Goal Card Actions (lines ~374-376)
- "Continue quest" (line ~375, button text)

#### Achievements Section (lines ~457-526)
- "Achievements" (line ~462, section title)
- "View achievement" (line ~483, button text)

#### Completed Goals Section (lines ~528-598)
- "Start Date:" (line ~561, label)
- "End Date:" (line ~564, label)
- "Overall Mood:" (line ~568, label)
- Mood display texts from `getMoodDisplayText` function (lines ~247-253):
  - "Great" (for mood 'great')
  - "Okay" (for mood 'okay')
  - "Hard" (for mood 'hard')
- Relative date phrases from `formatCompletionDate` function (lines ~256-278):
  - "Today"
  - "Yesterday"
  - "{n} days ago"
  - Date format: "{month} {day}, {year}" (e.g., "Dec 25, 2023")

---

### 7. ❌ `app/(tabs)/focus.tsx` (FocusScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ✅ Present
**Translation Hook Used:** ✅ `const { t } = useTranslation();` is present

**Untranslated Strings:**

#### Header (lines ~377-397)
- "FOCUS SANCTUARY" (line ~389, header title)

#### Main Content (lines ~399-426)
- "Focus Sanctuary" (line ~411, main heading)
- "Atlas is coming soon" (line ~421, popup text)

#### Tree Stage Information (lines ~428-480)
- Stage badge format: "STAGE {number}: {NAME}" (lines ~447-448)
- Stage names array `STAGE_NAMES` (lines ~31-42):
  - "Seed"
  - "Seedling"
  - "Sprout"
  - "Sapling"
  - "Young Tree"
  - "Growing Tree"
  - "Mature Tree"
  - "Strong Tree"
  - "Mighty Tree"
  - "Ancient Tree"
- "HEIGHT" (line ~454, stat label)
- "VITALITY" (line ~465, stat label)
- "cm" (line ~457, unit)

#### Duration Selector Modal (lines ~482-536)
- "Select duration" (line ~494, modal title)
- "min." (line ~511, unit displayed for each duration option)

#### Action Buttons (lines ~538-581)
- "Start Growing" (line ~550, button text when timer not active)
- "Reset" (line ~563, button text when timer is active/paused)
- "I'm Done" (line ~576, button text when timer is active/paused)

#### Completion Modal (lines ~583-613)
- "I'm done" (line ~595, modal title)
- "Congratulations, you've completed your task!" (line ~600, modal message)

---

### 8. ❌ `app/(tabs)/chat.tsx` (ChatScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Initial Messages (lines ~50-56)
- "Hello! I'm Atlas. I'm here to support you throughout your journey." (line ~52)
- "What's on your mind right now?" (line ~56)

#### Message Input (lines ~161-196)
- "Type your message..." (line ~174, placeholder)
- "Send" (line ~189, button text - although this is a symbol "↑", the aria-label would need translation)

#### Error Messages (line ~91)
- "I'm sorry, I encountered an error. Please check your API key configuration and try again."

#### Header/Navigation (line ~138)
- "←" (back button symbol)

---

### 9. ❌ `app/(tabs)/me.tsx` (MeScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Profile Stats (lines ~221-240)
- "Zodiac" (line ~225, stat label)
- "Goals Completed" (line ~234, stat label)

#### Badges Section (lines ~242-279)
- "BADGES GAINED" (line ~247, section title)
- "View All" (line ~256, button text)
- "No badges yet..." (line ~274, empty state message)
- Badge names and descriptions in `badgeMap` (lines ~66-165):
  - Badge names: "first_goal", "three_goals", "early_bird", "night_owl", "consistent", "explorer", "focused", "resilient", "adventurer", "master", "teacher", "helper", "pioneer", "innovator", "legend"
  - Badge display names: "First Steps", "Triple Threat", "Early Bird", "Night Owl", etc.
  - Badge descriptions: "Completed your first goal", "Completed three goals", etc.
- Category names in `BADGE_CATEGORIES` (lines ~168-175):
  - "All Badges"
  - "Achievement"
  - "Time"
  - "Dedication"
  - "Exploration"

#### Saved Insights Section (lines ~281-311)
- "SAVED INSIGHTS" (line ~286, section title)
- "No saved insights yet..." (line ~306, empty state message)

#### Recent Answers Section (lines ~313-354)
- "RECENT ANSWERS" (line ~318, section title)
- "No answers yet..." (line ~349, empty state message)
- "Q: " (line ~333, question prefix)
- Question fallback: "How do you handle unexpected setbacks?" (line ~333)
- "Completed on " (line ~339, date prefix)

#### Completed Goals Section (lines ~356-396)
- "COMPLETED GOALS" (line ~361, section title)
- "No completed goals yet..." (line ~391, empty state message)

#### Date Formatting
- All date formats use `en-US` locale (lines ~191, 339, 379)

---

### 10. ❌ `app/progress.tsx` (ProgressScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Engagement Messages (lines ~31-57)
Arrays of hardcoded messages:
- `LOW_ENGAGEMENT_MESSAGES`:
  - "Every journey starts with a single step. You're here, that's what matters."
  - "Progress doesn't have to be perfect. Just showing up is a win."
  - "You're building something meaningful, one day at a time."
- `MODERATE_ENGAGEMENT_MESSAGES`:
  - "You're making steady progress. Keep this momentum going."
  - "Your consistency is paying off. The path ahead is clearer."
  - "You're showing up for yourself. That takes real courage."
- `HIGH_ENGAGEMENT_MESSAGES`:
  - "You're absolutely crushing it this week. This is your time."
  - "Your dedication is inspiring. You're unlocking your full potential."
  - "You're on fire. This is what transformation looks like."

#### Header (lines ~227-257)
- "'s weekly progress" (line ~246, appended to user name)

#### Stats Cards (lines ~259-326)
- "Days Active" (line ~267, card title)
- "days you engaged" (line ~270, card description)
- "Days of Streak" (line ~280, card title)
- "consecutive days" (line ~283, card description)
- "Actions Completed" (line ~293, card title)
- "tasks finished" (line ~296, card description)
- "Focus Hours" (line ~306, card title)
- "hours in flow" (line ~309, card description)

#### Weekly Activity Section (lines ~328-378)
- "This Week's Journey" (line ~333, section title)
- Day abbreviations (lines ~341-350):
  - "Sun"
  - "Mon"
  - "Tue"
  - "Wed"
  - "Thu"
  - "Fri"
  - "Sat"

#### Actions Buttons (lines ~380-408)
- "Claim Your Badge" (line ~389, button text)
- "New Goal" (line ~402, button text)

#### Badge Modal (lines ~440-488)
- "New Unlock" (line ~452, modal title)
- Badge messages within `BADGE_CATEGORIES` (lines ~60-145):
  - All badge types: "first_goal", "week_streak", "consistency", "explorer", "night_focus", "challenger"
  - Badge titles: "First Steps", "Week Warrior", "Steady Hands", "Pathfinder", "Night Owl", "Bold Move"
  - Badge messages: "You completed your first goal. The journey has begun.", etc.
- "Add to Profile" (line ~471, button text)
- "Share Achievement" (line ~477, button text)

---

### 11. ❌ `app/goal-map.tsx` (GoalMapScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Goal Name Fallback (line ~132)
- "GOAL NAME" (fallback when goal not found)

#### Stage Names (lines ~159-166)
- "Morning Mist"
- "Canopy Crossing"
- "Sunbeam Path"
- "Moonlit Meadow"
- "Crystal Lake"
- "Summit View"

#### Navigation (lines ~192-211)
- "←" (back button, line ~195)
- "i" (info button, line ~203)

#### Unlock Modal (lines ~213-255)
- "Level {number} Unlocked!" (line ~225, modal title)
- "Complete each level to unlock the next one." (line ~230, info modal message)

#### Unlock Banner (lines ~257-297)
- "New Quest Unlocked!" (line ~269, banner title)
- "Complete Stage {number} to enter {stageName}." (line ~275, banner message)
- "View" (line ~287, banner button text)

#### Map Cards (lines ~299-435)
- "Level {number}" (lines ~354, 374, 396, level label displayed on cards)

---

### 12. ❌ `app/level-detail.tsx` (LevelDetailScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Fallback Data (lines ~41-71)
All strings in `fallbackLevelData`:
- Level name: "Understanding Your Path"
- Description: Full multi-paragraph description
- All section headings: "Why This Step Matters", "How to Complete It", "Time Estimate", "Tips for Success", "Common Pitfalls to Avoid"

#### Loading State (line ~185)
- "Loading step..."

#### Step Title Fallback (line ~243)
- "chat about my fear" (when step name is missing)

#### Action Buttons (lines ~323-361)
- "I did it" (line ~336, button text)
- "I need time" (line ~349, button text)

#### Chat Modal (lines ~363-440)
- "Atlas is here" (line ~375, modal header)
- "Ask for more help..." (line ~408, input placeholder)
- "Send" (line ~425, button text)

#### Time Modal (lines ~442-484)
- "I understand you need time" (line ~454, modal title)
- Full explanatory message (lines ~459-461)
- "I'm ready to complete it right now" (line ~471, button text)

#### Parsed Description Headings
The app parses AI-generated descriptions and looks for specific heading patterns (lines ~250-319):
- "Why This Step Matters"
- "How to Complete It"
- "Time Estimate"
- "Tips for Success"
- "Common Pitfalls to Avoid"
- And any other bold headings from AI content

---

### 13. ❌ `app/ikigai-compass.tsx` (IkigaiCompassScreen)
**Status:** Partially translated - **NEEDS FULL IMPLEMENTATION**

**useTranslation Import:** ✅ Present
**Translation Hook Used:** ✅ `const { t } = useTranslation();` is present

**Untranslated Strings:**

#### Ikigai Sections Array (lines ~34-66)
All section data in `ikigaiSections`:
- Titles:
  - "What You Love"
  - "What You're Good At"
  - "What the World Needs"
  - "What You Can Be Paid For"
- Descriptions:
  - "Your passion and what brings you joy"
  - "Your skills and natural talents"
  - "Your mission and contribution to others"
  - "Your profession and financial sustainability"
- Placeholders:
  - "Describe what makes your heart light up..."
  - "Share your strengths and abilities..."
  - "How can you make a positive impact?"
  - "What value can you offer that people need?"

#### Main Header (lines ~179-181)
- "Your Ikigai Compass" (line ~179, main title)
- "Discover your reason for being by exploring these four dimensions" (line ~180, subtitle)

#### Save Button (line ~190)
- "Save"

#### Reason Section (lines ~205-231)
- "Reason for Being" (line ~210, section heading)
- "Generating your reason..." (line ~217, loading text)
- "Complete all sections to discover your Reason for Being" (line ~221, incomplete message)
- "Your Path Forward" (line ~225, forward path heading)
- Inspirational quote (line ~228): full quote text

#### Assistance Modal (lines ~233-288)
All helper texts in `AssistanceModal` for each section:
- What You Love helpers
- What You're Good At helpers
- What the World Needs helpers
- What You Can Be Paid For helpers

---

### 14. ❌ `app/level-complete.tsx` (LevelCompleteScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Header (line ~202)
- "Level {number} Complete"

#### Congratulations Message (lines ~206-209)
- "Congratulations {userName}, you did it! We are all so proud of you and there is no doubt that you will achieve {goalName} soon. Just remember, nothing beats the feeling of achieving the goal that you set for yourself."

#### Rewards Section (lines ~211-240)
- "Rewards Unlocked" (line ~216, section title)
- All `levelRewards` strings (lines ~119-165):
  - Badge names: "Great Researcher Badge", "Persistence Badge", "Brave Explorer Badge", etc.
  - Point awards: "Confidence + 25 Points", "Resilience + 30 Points", etc.
  - Skill unlocks: "Your Research Skills", "Your Focus & Determination", etc.

#### Share Button (line ~245)
- "Share"
- Default share message (line ~147): "I just completed Level {level} of my goal: {goal}! 🎉 #Destiny #PersonalGrowth"

#### Mood Feedback (lines ~253-283)
- "How did it feel?" (line ~258, question)
- Mood button labels (lines ~262, 268, 274):
  - "Great"
  - "Okay"
  - "Hard"

#### Navigation Buttons (lines ~285-299)
- "Back to Goals" (line ~290, button text)
- "See Next Level" (line ~296, button text)

#### Footer Message (line ~301)
- "We are so proud of you."

#### Goal Completion Modal (lines ~306-343)
- "CONGRATULATIONS, YOU'VE DONE IT!" (line ~318, modal title)
- "You've completed all levels and achieved your goal!" (line ~323, modal message)
- "Exit" (line ~337, button text)

---

### 15. ❌ `app/paywall.tsx` (PaywallScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Close Button (line ~73)
- "✕"

#### Header (lines ~78-84)
- "READY FOR YOUR Calling?" (line ~79, split across two lines in UI)
- "No commitment. Cancel anytime." (line ~82, subtitle)

#### Subscription Card (lines ~86-100)
- "Calling" (line ~91, card title)
- Description text (lines ~92-93): "Unlock your full potential with personalized insights, unlimited goal creation, and priority support."
- "Free trial enabled" (line ~99, badge text)

#### Free Trial Section (lines ~103-109)
- "Not sure? CHECK for free" (line ~107, free trial heading)

#### Pricing Details (lines ~111-149)
- "Today" (line ~117, label for today's date)
- Date from `getDueDate()` function (lines ~32-38), formatted with `en-US` locale
- Currency: "USD" (hardcoded in lines ~123, 132, 141)
- Price displays: "0.00 USD", "9.99 USD", "6.99 USD"
- "Skip free trial" (line ~145, text link)

#### Action Buttons (lines ~151-169)
- "Try free" (line ~160, primary button text)
- "Calling Starts" (line ~166, secondary button text)

---

### 16. ❌ `app/completed-goals.tsx` (CompletedGoalsScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Header (lines ~172-189)
- "←" (back button, line ~178)
- "GROWTH HISTORY" (line ~182, header subtitle)
- "ACHIEVED GOALS" (line ~183, header title)
- "U" (line ~187, default profile initial when no username)

#### Impact Score Card (lines ~198-223)
- "Total Impact Score" (line ~200, label)
- "XP" (line ~203, unit)
- Stat labels (lines ~207, 211, 215):
  - "COMPLETED"
  - "CONSISTENCY"
  - "MILESTONES"

#### Recent Successes Section (lines ~226-233)
- "RECENT SUCCESSES" (line ~228, section title)
- "↓" (line ~230, filter icon)
- "Latest First" (line ~231, filter text)

#### Empty State (line ~236)
- "No completed goals yet. Complete goals to see them here!"

#### Goal Cards (lines ~243-280)
- "✓" (line ~247, checkmark icon)
- Goal completion text: "Completed {date}" (line ~251)
- Category names (not directly hardcoded, but derived):
  - "Focus", "Zen", "Health", "Skill"
- "+{xp} XP Earned" (line ~272, XP text)
- "Details" (line ~275, button text)
- "→" (line ~276, arrow symbol)

#### Dynamic Descriptions (lines ~87-96)
Generated description patterns:
- "Successfully completed all {n} steps. {goalName} achieved!"
- "Successfully completed {goalName}. Great achievement!"

#### Next Goal Card (lines ~287-301)
- "👑" (line ~289, crown emoji)
- "Ready for the next one?" (line ~290, title)
- "You've cleared all current major objectives. Time to level up." (line ~292-293, subtext)
- "+" (line ~298, plus icon)
- "Set New Goal" (line ~299, button text)

#### Date Formatting
- Dates formatted with `en-US` locale (lines ~142, 161)

---

### 17. ❌ `app/account.tsx` (AccountScreen)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Alert Dialog (lines ~15-17)
- "Reset Language Selection" (alert title)
- "This will clear your language preference and take you back to the language selection screen. Continue?" (alert message)
- "Cancel" (line ~20, button text)
- "Reset" (line ~24, button text)

#### Error Alert (line ~36)
- "Error" (alert title)
- "Failed to reset language selection." (alert message)

#### Page Content (lines ~50-66)
- "Account" (line ~50, page title)
- "Manage your profile and settings" (line ~51, subtitle)
- "Language Settings" (line ~54, section title)
- "Resetting..." (line ~61, button loading state)
- "Change Language" (line ~61, button text)
- "Reset your language selection to choose a different language" (line ~65, description)

---

### 18. ❌ `components/ClarityMap.tsx` (ClarityMap component)
**Status:** No translation support - **NEEDS IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Placeholder Examples (lines ~72-78)
All strings in `placeholderExamples`:
- "I feel overwhelmed by my to-do list"
- "I'm excited about starting a new project"
- "I'm worried about an upcoming deadline"
- "I wish I had more time for myself"
- "I'm frustrated with my progress"
- "I'm grateful for my support system"

#### Dump Stage (lines ~542-580)
- "Clear your mind" (line ~555, stage title)
- "Release whatever feels heavy or unclear right now" (line ~556, stage subtitle)
- "Need inspiration?" (line ~574, link text)
- "Add" (line ~579, button text)

#### Dump Stage Continue (line ~582)
- "Continue" (button text)

#### Sort Stage (lines ~598-679)
- "Ready to sort?" (line ~611, stage title)
- "Tap the category this thought belongs to" (line ~612, instruction)
- "{current} of {total} sorted" (line ~615, progress text)
- Category titles and subtitles (lines ~626, 638, 650):
  - "Urgent in My Heart" / "Needs my attention now"
  - "Explore This" / "Worth thinking about"
  - "Can Let Go For Now" / "Doesn't serve me today"

#### Confirm Stage (lines ~681-733)
- "You sure?" (line ~694, stage title)
- "That's where these thoughts belong." (line ~695, subtitle)
- "Edit" (line ~706, button text)
- "Continue" (line ~709, button text)

#### Insight Stage (lines ~735-837)
- "Your Clarity Insight" (line ~748, stage title)
- Parsed insight headings (lines ~755-809):
  - "Acknowledgment"
  - "Energy"
  - "Space"
  - "Let Go"
  - "Momentum"
  - "Encouragement"
  - (And any other bold headings from AI-generated insights)
- "Save This Insight" (line ~819, button text)
- "Insight is saved" (line ~820, saved state text)
- "Turn into a Path" (line ~827, button text)
- "Find this insight in the me section" (line ~832, saved popup text)

#### Goal Creation Messages (lines ~404-413)
- "Goal Added to Queue" (line ~406, success title when queue is full)
- "Goal Created!" (line ~406, success title when goal is created)
- Success messages (lines ~408-410):
  - "Your goal '{name}' has been added to the queue. You can start it from the queue list."
  - "Your goal '{name}' has been created successfully! You can now start your journey."
- "Creating your goal with actionable steps..." (line ~419, loading message)
- "OK" (line ~435, modal button)

#### Help Modal (lines ~839-862)
- "What counts as heavy or unclear?" (line ~851, modal title)
- Bullet points (lines ~853-857):
  - "Worries keeping you stuck"
  - "Excitement you want to explore"
  - "Frustrations slowing you down"
  - "Gratitude worth remembering"
  - "Anything unclear in your mind"
- "✕" (line ~860, close button)

---

### 19. ⚠️ `components/WelcomeScreen.tsx` (WelcomeScreen component)
**Status:** Appears unused/legacy - **REVIEW NEEDED**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Content (lines ~7-28)
- "HEY YOU!" (line ~7, header)
- "Congratulations on taking one extra{"\n"}step towards your destiny." (lines ~8-10, subtitle)
- "Continue" (line ~27, button text)

**Note:** This component appears to be a legacy/unused screen as it's not referenced in the current app routing.

---

### 20. ⚠️ `components/LoginBottomSheet.tsx` (LoginBottomSheet component)
**Status:** Partially implemented - **NEEDS FULL IMPLEMENTATION**

**useTranslation Import:** ❌ Not present
**Translation Hook Used:** ❌ Not used

**Untranslated Strings:**

#### Modal Content (lines ~156-177)
- "Sign In" (line ~156, modal title)
- "Sign in with Apple" (line ~162, button text)
- "Sign in with Google" (line ~169, button text)
- "Sign in with Email" (line ~176, button text)

---

### 21. ✅ `components/PaperTextureBackground.tsx`
**Status:** No user-facing text - no translation needed

---

### 22. ❌ `components/screens/*` (Legacy/Unused Screens)
**Status:** Appear to be legacy components - **REVIEW NEEDED**

The following files in `components/screens/` appear to be old/duplicate versions of main app screens and may not be in active use:
- `components/screens/HomeScreen.tsx`
- `components/screens/GoalsScreen.tsx`
- `components/screens/LandingScreen.tsx`
- `components/screens/OnboardingScreen.tsx`
- `components/screens/FocusScreen.tsx`
- `components/screens/ChatScreen.tsx`
- `components/screens/AccountScreen.tsx`
- `components/screens/LessonScreen.tsx`
- `components/screens/ChapterScreen.tsx`

**Recommendation:** Verify if these are still used. If not, remove them to avoid confusion.

---

## Translation Implementation Checklist

### Phase 1: High Priority (User-Facing Core Flows)
1. ❌ `app/(tabs)/index.tsx` - Home screen (daily questions, Atlas chat)
2. ❌ `app/(tabs)/goals.tsx` - Goals screen (active/completed goals)
3. ❌ `app/(tabs)/chat.tsx` - Chat screen (Atlas conversation)
4. ❌ `app/(tabs)/me.tsx` - Profile screen (badges, insights)
5. ❌ `app/level-detail.tsx` - Level detail screen (quest steps)
6. ❌ `app/level-complete.tsx` - Level completion screen
7. ❌ `app/goal-map.tsx` - Goal map visualization

### Phase 2: Medium Priority (Supporting Features)
8. ❌ `app/(tabs)/focus.tsx` - Focus sanctuary timer
9. ❌ `app/progress.tsx` - Weekly progress tracking
10. ❌ `app/ikigai-compass.tsx` - Ikigai compass (partially done)
11. ❌ `components/ClarityMap.tsx` - Brain dump & clarity insights
12. ❌ `app/completed-goals.tsx` - Completed goals history

### Phase 3: Lower Priority (Secondary Screens)
13. ❌ `app/account.tsx` - Account settings
14. ❌ `app/paywall.tsx` - Subscription screen
15. ❌ `components/LoginBottomSheet.tsx` - Login modal
16. ❌ `components/WelcomeScreen.tsx` - Welcome screen (if still used)

---

## Implementation Steps for Each Screen

For each screen marked as ❌ or ⚠️, follow these steps:

### 1. Add Translation Hook
```typescript
import { useTranslation } from 'react-i18next';

// Inside component:
const { t } = useTranslation();
```

### 2. Create Translation Keys
Add all identified hardcoded strings to:
- `utils/translations/en.json`
- `utils/translations/ru.json`

Organize by screen namespace:
```json
{
  "screenName": {
    "key": "English text",
    "anotherKey": "More text"
  }
}
```

### 3. Replace Hardcoded Strings
Replace all hardcoded strings with `t()` calls:
```typescript
// Before:
<Text>Hello, user</Text>

// After:
<Text>{t('screenName.greeting')}</Text>
```

### 4. Handle Dynamic Content
For strings with variables, use interpolation:
```typescript
// Before:
<Text>Hello, {userName}</Text>

// After:
<Text>{t('screenName.greeting', { name: userName })}</Text>
```

### 5. Handle Arrays/Objects
For arrays of options, use `returnObjects: true`:
```typescript
const options = t('screenName.options', { returnObjects: true });
```

### 6. Test Both Languages
- Switch to Russian in language selection
- Navigate through all screens
- Verify all text displays in Russian
- Check for layout issues with longer translations

---

## Notes

- **Dynamic/AI-Generated Content**: Content generated by AI (e.g., astrology reports, level descriptions, insights) may need special handling. Consider whether to translate the prompts sent to the AI or post-process the responses.

- **Date/Number Formatting**: Use `i18n.language` to determine locale for date/number formatting:
  ```typescript
  date.toLocaleDateString(i18n.language, { ... })
  ```

- **Hardcoded Emojis**: Emojis (✕, ←, →, ✓, etc.) are universal and don't need translation, but consider using icon components for consistency.

- **Layout Testing**: Russian translations are typically 15-30% longer than English. Test UI layouts to ensure text doesn't overflow or wrap awkwardly.

---

## Current Translation Coverage

**Fully Translated:** 4 screens
- `app/onboarding.tsx`
- `app/landing.tsx`
- `app/language-selection.tsx`
- `app/new-goal.tsx`

**Untranslated:** 15 screens
**Partially Translated:** 1 screen (`app/ikigai-compass.tsx`)
**Legacy/Review Needed:** 9 component files

**Total Coverage:** ~20% complete (4 out of 20 active screens)

---

*Last Updated: 2025*
*Generated via systematic code review*
