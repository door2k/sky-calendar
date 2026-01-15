# Sky's Schedule Calendar - Project Brain

> **Last Updated:** 2026-01-15
> **Status:** Active Development
> **Live URL:** https://sky-calendar.vercel.app

## What Is This Project?

A website to manage Sky's (a child) weekly and monthly schedule in Israel. Shows daily routines (drop-off, Gan activities, pickup, after-school activities, bedtime) with support for themes, printing, and an AI assistant.

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
- **Supabase:** https://supabase.com/dashboard/project/thzesmfiecccpvuzuscd

## Environment Variables (Vercel)

- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `ANTHROPIC_API_KEY` - Claude API key (for AI assistant)

## Database Schema

### Tables

1. **people** - Fixed list of caregivers
   - Asaf (Aba), Tamir (Aba), Gili & Yossi (Savta & Saba), Simcha (Savta), Maya (Babysitter)

2. **activities** - Recurring or one-time activities
   - name, address, maps_url, contact_phone, note, is_recurring, recurrence_day, default_time

3. **day_schedules** - Weekday schedules (Sun-Fri)
   - date, dropoff_person_id, pickup_person_id, bedtime_person_id, after_gan_activity_id, after_gan_time, gan_activity, is_no_gan, no_gan_reason, notes

4. **saturday_schedules** - Saturday schedules (no Gan)
   - date, activities (JSONB array), notes

5. **settings** - App settings
   - current_theme, theme_randomized_week, previous_week_theme

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

### AI Assistant (Claude-Powered)
- [x] Natural language schedule updates
- [x] Understands flexible phrasing ("set Tamir for drop-off every day except Thursday")
- [x] Creates activities AND assigns them to schedules
- [x] Asks clarifying questions when needed
- [x] Bulk updates (multiple days at once)

**Supported Commands:**
- "Set Tamir for pickup on Monday and Tuesday"
- "Set Tamir for drop-off every day except Thursday and Friday"
- "Add a hip hop class on Mondays at 4:30pm in Gan Meir"
- "Mark Friday as no gan because of a holiday"

## Project Structure

```
sky-calendar/
├── api/
│   └── assistant.ts        # Claude API serverless function
├── src/
│   ├── components/
│   │   ├── AIAssistant.tsx  # AI chat interface
│   │   ├── DayCard.tsx      # Day card component
│   │   ├── ThemePicker.tsx  # Theme selector
│   │   ├── ActivityPopup.tsx
│   │   ├── EditDayModal.tsx
│   │   └── AddActivityModal.tsx
│   ├── hooks/
│   │   ├── usePeople.ts
│   │   ├── useActivities.ts
│   │   ├── useSchedule.ts
│   │   └── useTheme.ts
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client
│   │   ├── themes.ts        # Theme definitions
│   │   └── scheduleParser.ts # (legacy, not used)
│   ├── pages/
│   │   ├── WeekView.tsx
│   │   ├── MonthView.tsx
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

## Current State

### What's Working
- Weekly view displays correctly with all schedule data
- Monthly view displays calendar grid with activities
- AI assistant understands natural language and updates database
- AI assistant uses correct dates (explicit week date mapping)
- Drop-off, pickup, bedtime assignments work
- Activity creation and assignment to schedules works
- Themes change correctly
- "Today" badge shows current date in both weekly and monthly views

### Known Issues / TODO
- [x] Monthly view shows grid but activities may not display (needs verification) - **FIXED: Verified working**
- [x] AI sometimes gets confused about exact dates (says Monday but means Tuesday) - **FIXED: Added explicit week dates to API prompt**
- [ ] No authentication yet (public edit access)
- [ ] No Google Calendar sync yet

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

### Testing AI Assistant Locally
The AI assistant requires the `ANTHROPIC_API_KEY` environment variable. It only works in production (Vercel) since it uses edge functions.

## Design Document

Full design spec is at: `/Users/tamir/docs/plans/2025-01-15-sky-calendar-design.md`

## Changelog

### 2026-01-15
- **Fixed AI date offset bug**: Added `getWeekDates()` helper in `api/assistant.ts` that generates explicit dates for each day of the week, preventing Claude from miscalculating dates
- **Verified monthly view**: Confirmed monthly calendar displays activities correctly
- **Tested AI assistant**: Confirmed "set Asaf for drop-off on Sunday" correctly updates Sunday (Jan 11)
- **Added recurring activities to monthly view**: Recurring activities now show on all their recurrence days (● blue = scheduled, ○ purple = recurring)
- **Added delete activity support**: AI assistant can now delete activities (removes references from schedules first to avoid FK constraint errors)
- **Added conversation history**: AI assistant now maintains context across messages in a session

---

*This BRAIN.md serves as the single source of truth for any Claude instance working on this project.*
