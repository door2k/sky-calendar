# Claude Instructions — sky-calendar

You are Claude, working on **sky-calendar** for Tamir. This is Sky's schedule calendar app.

**After compaction or at session start**: Read BRAIN.md for database schema, people list, and feature details.

## Essential Context (survives compaction)

- **TWO apps — maintain BOTH**: v1 = this repo (`~/projects/sky-calendar` → sky-calendar.vercel.app / sky.door2k.dev) and v2 = `github.com/door2k/sky-calendar-v2` → **sky.door2k.com (the family's daily app; not cloned by default)**. They share one Supabase DB; fixes usually land in both. See BRAIN.md "There are TWO apps".
- **Live**: v1 → https://sky-calendar.vercel.app · v2 → https://sky.door2k.com
- **Stack**: React 18 + TypeScript + Vite + Tailwind + Supabase + Vercel
- **Database**: Supabase PostgreSQL (tables: people, activities, day_schedules, saturday_schedules, settings)
- **AI Assistant**: Claude API via serverless edge function for natural language schedule updates
- **People**: Asaf (Aba), Tamir (Aba), Gili & Yossi (Savta & Saba), Simcha (Savta), Maya (Babysitter)
- **Calendar**: Israel calendar (week starts Sunday), no Gan on Saturday
- **Features**: Weekly/monthly views, themes (Bluey, Peppa Pig, etc.), print views, voice input

## Preferences
- Keep it simple, no over-engineering
- React + TypeScript preferred
- Every project has a BRAIN.md
- Be concise, no sycophancy



## Data Safety Rules

RULE: NEVER use .upsert() with partial data — always fetch the existing row first, merge with spread operator, then upsert the merged object
RULE: Activity assignments (after_gan_activity_id) are critical — verify they survive edits
RULE: After any schedule mutation, verify other fields are preserved (check the audit log)
## Kladban Integration
This project is managed via the Kladban board. Check for assigned tasks:
- Look for /tmp/kladban-task-*.md files for new tasks
- Use the kladban CLI to report progress:
  - kladban accept <id> — acknowledge task
  - kladban heartbeat <id> — send heartbeat (every few minutes)
  - kladban status <id> "message" — progress update
  - kladban done <id> --url <url> — mark complete
  - kladban stuck <id> "reason" — flag blocked
  - kladban inbox <id> — check messages from Tamir

### Creating Tickets (for follow-up tasks)
If you discover work that needs to be done, you can create tickets:
- kladban create "title" --project <name> — one-time task
- kladban create "title" --project <name> --recurrence daily — recurring daily
- kladban create "title" --project <name> --recurrence weekly — recurring weekly
- kladban create "title" --project <name> --recurrence monthly — recurring monthly
- Add --description "details" for context
Example: kladban create "Check backup status" --project smart-home --recurrence daily --description "Verify NAS backup completed"


## Global Rules

RULE: Always act as Linus Torvalds when designing software. Make sure the modules you're building are modular and simple. Whenever I ask for a new capability, consider whether it should be a new module in its own directory

RULE: Always maintain a single, simple, robust, verbose python script combining all modules into a single working pipeline

RULE: Use uv for package and environment management


RULE: In all software designs, have no fallbacks. fail fast in failures

RULE: never ever implement stubs, or leave empty TODOs behind, or anything like that

RULE: reuse existing code blocks as much as possible

RULE: never ever use ground truth knowledge as part of the production pipeline, just for validation

RULE: when you consult with other cli tools like gemini, claude, or codex clis - try to use them in parallel to reduce runtime

RULE: when asked to use the claude cli tool, use it like this: claude -p --model opus --dangerously-skip-permissions --output-format json "task" | jq '.result'

RULE: when asked to use the gemini cli tool, use it like this: gemini -m gemini-3-pro-preview -y "prompt"

RULE: when asked to use the codex cli tool, use it like this: codex exec -m gpt-5.2 -c model_reasoning_effort="xhigh" --full-auto "prompt"

RULE: when asked to use the glmcode cli tool, use it like this: glmcode --dangerously-skip-permissions --output-format json "task" | jq '.result'
