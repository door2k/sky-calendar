# Sky's Schedule Calendar - Project Brain

> **Last Updated:** 2026-02-02
> **Status:** Active Development
> **Live URL:** https://sky-calendar.vercel.app

## What Is This Project?

A website to manage Sky's (a child) weekly and monthly schedule in Israel. Shows daily routines (drop-off, Gan activities, pickup, after-school activities, bedtime) with support for themes, printing, and an AI assistant.

**Sky** is the child. **Gan** = kindergarten in Hebrew.

## Tech Stack

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS
- **Database:** Supabase (PostgreSQL)
- **Hosting:** Vercel
- **State Management:** React Query (TanStack Query)
- **Routing:** React Router DOM
- **AI Assistant:** Claude API (Anthropic) via serverless edge function

## Key URLs

- **Live Site:** https://sky-calendar.vercel.app
- **GitHub:** https://github.com/door2k/sky-calendar
- **Supabase Dashboard:** https://supabase.com/dashboard/project/thzesmfiecccpvuzuscd
- **Supabase SQL Editor:** https://supabase.com/dashboard/project/thzesmfiecccpvuzuscd/sql/new

## Claude Automation Expectations

**IMPORTANT:** Claude should handle infrastructure tasks autonomously via browser automation:
- **Supabase:** Connect directly to run SQL migrations, check data, etc. Don't ask user to run SQL manually.
- **Vercel:** Connect directly to trigger deployments, check logs, etc. Don't ask user to deploy manually.
- **User login:** User will handle OAuth/login flows when needed, then Claude continues autonomously.

The user expects Claude to be proactive about connecting to these services rather than asking the user to do it.

## Environment Variables (Vercel)

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `ANTHROPIC_API_KEY` - Claude API key (for AI assistant)
- `SUPABASE_URL` - Supabase project URL (non-VITE, for API routes)
- `SUPABASE_ANON_KEY` - Supabase anon key (non-VITE, for API routes)

## Database Schema

### Tables

1. **people** - Fixed list of caregivers
   - id (uuid), name, role, created_at
   - Current people: Asaf (Aba), Tamir (Aba), Gili & Yossi (Savta & Saba), Simcha (Savta), Maya (Babysitter)

2. **activities** - Recurring or one-time activities
   - id (uuid), name, name_he, address, address_he, maps_url, contact_phone, note, note_he, icon, is_recurring, recurrence_day, default_time, created_at

3. **day_schedules** - Weekday schedules (Sun-Fri ONLY)
   - id, date, dropoff_person_id, pickup_person_id, bedtime_person_id, after_gan_activity_id, after_gan_time, gan_activity, gan_activity_he, is_no_gan, no_gan_reason, no_gan_reason_he, notes, notes_he, created_at, updated_at
   - **Friday-specific:** family_dinner_person_id, family_dinner_time (default "16:00")

4. **saturday_schedules** - Saturday schedules AND last Friday of month (DIFFERENT structure - no Gan)
   - id, date, **activities** (JSONB array of `{activity_id, time}`), **activities_he** (JSONB), notes, notes_he, created_at, updated_at
   - **Last Friday-specific:** family_dinner_person_id, family_dinner_time (default "16:00")
   - **CRITICAL:** Saturday uses `activities` JSONB array, NOT `after_gan_activity_id`


6. **schedule_audit_log** - Audit trail for all schedule/activity changes
   - id (serial), table_name, record_date, action (INSERT/UPDATE/DELETE), old_data (JSONB), new_data (JSONB), changed_by, created_at
   - Populated by `log_schedule_change()` trigger on day_schedules/saturday_schedules and `log_activity_change()` trigger on activities
5. **settings** - App settings
   - current_theme, theme_randomized_week, previous_week_theme

### CRITICAL: Weekday vs Saturday Data Model

This caused bugs - document it clearly:

| Field | Weekdays (Sun-Fri) | Saturday |
|-------|-------------------|----------|
| Table | `day_schedules` | `saturday_schedules` |
| Activity storage | `after_gan_activity_id` (single UUID) | `activities` (JSONB array) |
| API action | `assign_activity` | `update_saturday` |
| Can have multiple activities | No (one after-gan activity) | Yes (array of activities) |

## Features Implemented

### Core Features
- [x] Weekly view with day cards (Sun-Sat)
- [x] Monthly calendar view
- [x] Theme picker (Bluey, Peppa Pig, Spiderman, Blippi)
- [x] Random weekly theme selection
- [x] "Today" date badge in header
- [x] Edit day modal for weekdays
- [x] Activity popup with details/maps link
- [x] Add activity modal
- [x] Print views (weekly and monthly)
- [x] No-Gan day marking with reasons
- [x] Friday Family Dinner - all Fridays show family dinner slot with large avatar and time

### AI Assistant (Claude-Powered)
- [x] Natural language schedule updates
- [x] Understands flexible phrasing ("set Tamir for drop-off every day except Thursday")
- [x] Creates activities AND assigns them to schedules
- [x] Asks clarifying questions when needed
- [x] Bulk updates (multiple days at once)
- [x] Saturday activity support (uses `update_saturday` action)
- [x] Delete activity support
- [x] Conversation history (maintains context across messages)

**Supported Commands:**
- "Set Tamir for pickup on Monday and Tuesday"
- "Set Tamir for drop-off every day except Thursday and Friday"
- "Add a hip hop class on Mondays at 4:30pm in Gan Meir"
- "Mark Friday as no gan because of a holiday"
- "Add a pizza party to Saturday at 6pm"
- "Delete the swimming activity"

## Project Structure

```
sky-calendar/
├── api/
│   ├── assistant.ts        # Claude API serverless function (edge runtime)
│   └── translate.ts        # EN→HE translation endpoint (Claude Sonnet)
├── src/
│   ├── components/
│   │   ├── AIAssistant.tsx  # AI chat interface + action executor
│   │   ├── DayCard.tsx      # Day card component
│   │   ├── ThemePicker.tsx  # Theme selector
│   │   ├── ActivityPopup.tsx
│   │   ├── EditDayModal.tsx
│   │   └── AddActivityModal.tsx
│   ├── hooks/
│   │   ├── usePeople.ts
│   │   ├── useActivities.ts
│   │   ├── useSchedule.ts   # Has useUpdateDaySchedule, useUpdateSaturdaySchedule
│   │   └── useTheme.ts
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   ├── translate.ts     # Client-side translation helpers
│   │   ├── i18n-field.ts    # lf() helper for lang-aware field access
│   │   ├── themes.ts        # Theme definitions
│   │   └── scheduleParser.ts # (legacy, not used)
│   ├── pages/
│   │   ├── WeekView.tsx     # Main weekly view (has AI assistant)
│   │   ├── MonthView.tsx    # Monthly calendar view
│   │   ├── PrintWeek.tsx
│   │   └── PrintMonth.tsx
│   ├── types/
│   │   └── index.ts
│   ├── App.tsx
│   └── main.tsx
├── BRAIN.md                 # This file - project state
├── package.json
├── vercel.json
└── tailwind.config.js
```

## AI Assistant Architecture

### How It Works

1. **Frontend (`AIAssistant.tsx`):**
   - Sends user message + context (people, activities, schedules, week dates) to `/api/assistant`
   - Receives JSON array of actions
   - Executes actions in sorted order (create before assign/update)

2. **Backend (`api/assistant.ts`):**
   - Receives context and builds a system prompt with explicit week dates
   - Calls Claude API (claude-sonnet-4-20250514)
   - Returns JSON array of actions

### Action Types

```typescript
type ActionType =
  | 'update_day'       // Update weekday schedule fields
  | 'create_activity'  // Create new activity definition
  | 'assign_activity'  // Assign activity to WEEKDAY (NOT Saturday!)
  | 'delete_activity'  // Delete an activity
  | 'update_saturday'  // Update Saturday schedule (ONLY way to add Saturday activities)
  | 'message'          // Send message back to user
```

### Action Execution Order

Actions are sorted before execution to handle dependencies:
1. `create_activity` (0) - Must run first to get new activity ID
2. `update_day` (1)
3. `assign_activity` (2) - Uses activity ID from step 1
4. `delete_activity` (3)
5. `update_saturday` (4) - Uses activity ID from step 1
6. `message` (5)

## Translation System (EN→HE)

Free-form text is auto-translated to Hebrew on save using a translate-then-save pattern.

### How It Works
1. User saves a schedule/activity in the UI
2. React Query mutation hooks intercept the save
3. Calls `/api/translate` with the English text fields
4. `/api/translate` calls Claude Sonnet with a name map (Tamir=טמיר, Asaf=אסף, etc.)
5. Both EN and HE values are upserted to Supabase atomically
6. Hebrew view reads `_he` columns via `lf(obj, field, lang)` helper

### Key Files
- `api/translate.ts` — Vercel edge function, calls Claude for translation
- `src/lib/translate.ts` — `translateFields()` and `translateSaturdayActivities()` client helpers
- `src/lib/i18n-field.ts` — `lf(obj, field, lang)` returns `obj[field_he]` or `obj[field]` based on lang

### Translated Fields
| Table | Fields |
|-------|--------|
| `day_schedules` | `gan_activity_he`, `no_gan_reason_he`, `notes_he` |
| `saturday_schedules` | `notes_he`, `activities_he` (JSONB with `custom_name_he`) |
| `activities` | `name_he`, `note_he`, `address_he` |

### Fallback Behavior
- If translation fails (network error, API error), save proceeds without Hebrew — English is shown as fallback
- Static dictionary translations in `i18n.tsx` are overridden by DB Hebrew values when available

## Current State

### What's Working
- Weekly view displays correctly with all schedule data
- Monthly view displays calendar grid with activities
- AI assistant understands natural language and updates database
- AI assistant uses correct dates (explicit week date mapping)
- Drop-off, pickup, bedtime assignments work
- Activity creation and assignment to schedules works
- Saturday activities work (after fixing missing column)
- Themes change correctly
- "Today" badge shows current date in both weekly and monthly views

### Known Issues / TODO
- [x] Monthly view shows grid but activities may not display - **FIXED**
- [x] AI sometimes gets confused about exact dates - **FIXED: explicit week dates**
- [x] Saturday activities don't save - **FIXED: added `activities` column**
- [ ] No authentication yet (public edit access)
- [ ] No Google Calendar sync yet

### Feature Requests (Backlog)
- [x] Add images/photos for people - `PersonAvatar.tsx` + `PeopleEditor.tsx`
- [x] URL should not change when switching weeks - State-based navigation in `WeekView.tsx`
- [x] AI assistant available in monthly view - AIAssistant imported in `MonthView.tsx`
- [x] Combined print view (weekly + monthly calendar on same page) - `PrintCombined.tsx`
- [x] Voice input for AI assistant (speech-to-text) - Web Speech API in `AIAssistant.tsx`
- [x] Highlight today's card in weekly view - `isToday` prop in `DayCard.tsx`
- [x] "Go to this week" button - "This Week" button in `WeekView.tsx`
- [x] Redesign print views - Fun gradients, emojis, DAY_VIBES in `PrintWeek.tsx`
- [x] Track who created each event - Fields exist (`created_by`, `updated_by`), UI partial

## Development Notes

### Israel Calendar
- Week starts on **Sunday** (weekStartsOn: 0)
- No Gan on Saturday (rest day, can have activities)
- Last Friday of month is typically no-Gan

### Deploying Changes
```bash
# Build and deploy
npm run build
git add -A && git commit -m "description"
git push origin main
npx vercel --prod --yes
```

### Testing AI Assistant
- The AI assistant only works in production (Vercel edge functions)
- **IMPORTANT:** When testing, prefix activity names with "TEST" (e.g., "TEST - pizza party")
- Clean up test data after testing by deleting from Supabase SQL Editor

### Debugging Tips

**If AI assistant says it did something but nothing changed:**
1. Add debug logging to `AIAssistant.tsx` `executeActions()` function
2. Check browser console for errors
3. Common issues:
   - Missing database column (check Supabase table structure)
   - Wrong action type (Saturday needs `update_saturday`, not `assign_activity`)
   - Action ordering (create must happen before assign)

**Checking database directly:**
- Go to Supabase SQL Editor: https://supabase.com/dashboard/project/thzesmfiecccpvuzuscd/sql/new
- Query activities: `SELECT * FROM activities;`
- Query Saturday schedules: `SELECT * FROM saturday_schedules WHERE date = '2026-01-17';`

### Vercel Logs
```bash
npx vercel logs sky-calendar.vercel.app --since 5m
```

## Changelog

### 2026-02-02 (Data Loss Fix)
- **CRITICAL BUG FIX: Partial upsert data loss** in `useSchedule.ts`
  - **Root cause:** `.upsert(partialObject, { onConflict: 'date' })` replaces the entire row. When EditDayModal or AI assistant sent only changed fields, all other columns (like `after_gan_activity_id`) got wiped to NULL.
  - **Impact:** Bats event on Feb 2 was deleted when an unrelated field was edited.
  - **Fix:** Both `useUpdateDaySchedule` and `useUpdateSaturdaySchedule` now fetch the existing row, merge with spread operator (`{ ...existing, ...schedule }`), then upsert the merged object.
- **Added `schedule_audit_log` table + triggers** on `day_schedules`, `saturday_schedules`, and `activities` tables. All INSERT/UPDATE/DELETE operations are logged with old_data and new_data JSONB columns.
- **Restored bats event** (`after_gan_activity_id`, `after_gan_time`) for Feb 2.
- **Fixed Hebrew input in ActivityAutocomplete** (`EditDayModal.tsx`): handleInputChange now matches translated activity names; added `isTypingRef` to prevent useEffect from clearing text during Hebrew IME composition.
- **Added `icon` column to `activities` table**: `useCreateActivity` was setting `icon` field but column did not exist in DB, causing silent INSERT failures.
- **Fixed audit trigger on activities table**: `log_schedule_change()` referenced `NEW.date` which does not exist on activities. Created separate `log_activity_change()` function without date reference.

### 2026-02-02
- **Auto-translate to Hebrew on save**: Free-form text (gan activities, notes, activity names/addresses) auto-translated via Claude Sonnet before saving to Supabase
  - New endpoint: `api/translate.ts` (Vercel edge function)
  - New helpers: `src/lib/translate.ts`, `src/lib/i18n-field.ts`
  - Modified hooks: `useSchedule.ts`, `useActivities.ts` — translate before upsert
  - Modified components: `DayCard.tsx`, `ActivityPopup.tsx`, `MonthView.tsx`, print views — use `lf()` for Hebrew field access
  - Added `_he` columns to all 3 tables (day_schedules, saturday_schedules, activities)
  - Ran one-time migration to backfill existing data (29 days, 4 saturdays, 19 activities)
  - Added `SUPABASE_URL` and `SUPABASE_ANON_KEY` env vars to Vercel (non-VITE prefix for API routes)

### 2026-01-28
- **Major print view redesign** (`PrintWeek.tsx`, `PrintCombined.tsx`):
  - Fixed image loading: now waits for all images to load before triggering print dialog
  - Fixed data mismatch: last Friday correctly shows as no-gan and sources family dinner from `saturday_schedules`
  - New layout: picture centered, name below (vertical stacking)
  - Removed emoji icons (🌅🌆🌙) for cleaner look
  - Gan activity now displays between drop-off and pickup (correct order)
  - Removed bedtime from print views (unused field)
  - Removed labels - order makes the meaning clear
- **Updated backlog**: Marked AI assistant in monthly view, voice input, and print redesign as completed

### 2026-01-22
- **Added Friday Family Dinner feature**: All Fridays now have a family dinner slot
  - Shows hosting person with large (2x) avatar
  - Editable time (default 4pm)
  - Works for both regular Fridays (day_schedules) and last Fridays (saturday_schedules)
  - Added to print views
  - AI assistant can set family dinner via update_day and update_saturday actions
- **Updated Feature Backlog**: Marked completed features (images, URL navigation, combined print, today highlight, this week button, creator tracking)
- **Database migration COMPLETED** (ran via Supabase SQL Editor):
  ```sql
  ALTER TABLE day_schedules
  ADD COLUMN family_dinner_person_id uuid REFERENCES people(id),
  ADD COLUMN family_dinner_time text DEFAULT '16:00';

  ALTER TABLE saturday_schedules
  ADD COLUMN family_dinner_person_id uuid REFERENCES people(id),
  ADD COLUMN family_dinner_time text DEFAULT '16:00';
  ```
- **Added Claude Automation Expectations** section to BRAIN.md

### 2026-01-15
- **Fixed Saturday activity bug**: Root cause was missing `activities` JSONB column in `saturday_schedules` table
- **Added `activities` column**: `ALTER TABLE saturday_schedules ADD COLUMN activities jsonb DEFAULT '[]'::jsonb;`
- **Fixed action ordering**: Actions now sorted so `create_activity` runs before `assign_activity`/`update_saturday`
- **Cleaned up test data**: Removed test activities (swimming, park playdate, movie night, pizza party)
- **Established testing convention**: Prefix test activities with "TEST"

### 2026-01-15 (Earlier)
- **Fixed AI date offset bug**: Added `getWeekDates()` helper in `api/assistant.ts`
- **Verified monthly view**: Confirmed monthly calendar displays activities correctly
- **Added recurring activities to monthly view**: ● blue = scheduled, ○ purple = recurring
- **Added delete activity support**: AI can delete activities (removes refs first)
- **Added conversation history**: AI maintains context across messages in session
- **Fixed Saturday activity support**: Added `update_saturday` action type

## Quick Reference

### Common SQL Queries

```sql
-- See all activities
SELECT * FROM activities ORDER BY name;

-- See Saturday schedule for a date
SELECT * FROM saturday_schedules WHERE date = '2026-01-17';

-- Clear Saturday activities
UPDATE saturday_schedules SET activities = '[]'::jsonb WHERE date = '2026-01-17';

-- Delete test activities
DELETE FROM activities WHERE name LIKE 'TEST%';

-- See all people
SELECT * FROM people;
```

### Key Files to Check When Debugging

1. `api/assistant.ts` - Claude API integration, action definitions
2. `src/components/AIAssistant.tsx` - Action execution logic
3. `src/hooks/useSchedule.ts` - Supabase mutations for schedules

---

*This BRAIN.md serves as the single source of truth for any Claude instance working on this project.*
