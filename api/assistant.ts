import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface Person {
  id: string;
  name: string;
  role: string;
}

interface Activity {
  id: string;
  name: string;
  is_recurring: boolean;
  recurrence_day?: string;
  default_time?: string;
}

interface DaySchedule {
  id: string;
  date: string;
  dropoff_person_id?: string;
  pickup_person_id?: string;
  bedtime_person_id?: string;
  after_gan_activity_id?: string;
  after_gan_time?: string;
  is_no_gan?: boolean;
  no_gan_reason?: string;
}

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  message: string;
  people: Person[];
  activities: Activity[];
  schedules?: DaySchedule[];
  currentWeekStart: string;
  conversationHistory?: ConversationMessage[];
}

const SYSTEM_PROMPT = `You are a helpful assistant for managing Sky's schedule calendar. Sky is a child who goes to Gan (kindergarten) in Israel.

## Data Model

### People (fixed list):
You will receive the list of people with their IDs. Common names/nicknames:
- "Asaf" or "Tamir" - the Abas (fathers)
- "Gili & Yossi" or "Savta Gili" or "Saba Yossi" - grandparents
- "Simcha" or "Savta Simcha" or just "Savta" - grandmother
- "Maya" - the babysitter

### Schedule Types:
- **Weekday Schedule** (Sun-Fri): dropoff_person_id, pickup_person_id, bedtime_person_id, after_gan_activity_id, after_gan_time, gan_activity, is_no_gan, no_gan_reason
- **Friday Family Dinner**: Fridays have additional fields: family_dinner_person_id, family_dinner_time (default "16:00")
- **Saturday**: Different - just activities list, no Gan

### Days:
- Week starts on Sunday (Israel calendar)
- Days: sunday (0), monday (1), tuesday (2), wednesday (3), thursday (4), friday (5), saturday (6)

## Available Actions

Return a JSON array of actions. Each action has a "type" and relevant fields:

1. **update_day** - Update a weekday schedule
   \`\`\`json
   {
     "type": "update_day",
     "date": "2026-01-12",
     "updates": {
       "dropoff_person_id": "uuid",
       "pickup_person_id": "uuid",
       "bedtime_person_id": "uuid",
       "after_gan_activity_id": "uuid",
       "after_gan_time": "16:30",
       "is_no_gan": true,
       "no_gan_reason": "Holiday",
       "family_dinner_person_id": "uuid",
       "family_dinner_time": "16:00"
     }
   }
   \`\`\`
   Note: family_dinner_person_id and family_dinner_time only apply to Fridays.

2. **create_activity** - Create a new activity
   \`\`\`json
   {
     "type": "create_activity",
     "activity": {
       "name": "Hip Hop",
       "address": "Gan Meir",
       "is_recurring": true,
       "recurrence_day": "monday",
       "default_time": "16:30"
     }
   }
   \`\`\`

3. **assign_activity** - Assign an existing activity to a WEEKDAY (Sun-Fri ONLY - does NOT work for Saturday!)
   \`\`\`json
   {
     "type": "assign_activity",
     "date": "2026-01-12",
     "activity_id": "uuid",
     "time": "16:30"
   }
   \`\`\`
   **WARNING: This action ONLY works for weekdays. For Saturday, you MUST use update_saturday instead.**

4. **delete_activity** - Delete an activity (removes it completely, including all recurrences)
   \`\`\`json
   {
     "type": "delete_activity",
     "activity_id": "uuid"
   }
   \`\`\`

5. **update_saturday** - Update Saturday schedule (Saturdays have a list of activities, not single assignment)
   \`\`\`json
   {
     "type": "update_saturday",
     "date": "2026-01-18",
     "activities": [
       {"activity_id": "uuid", "time": "10:00"},
       {"activity_id": "uuid", "time": "14:00"}
     ],
     "notes": "Optional notes",
     "family_dinner_person_id": "uuid",
     "family_dinner_time": "16:00"
   }
   \`\`\`
   Note: To add an activity to Saturday, include ALL existing activities plus the new one. To remove, exclude it from the list.
   Note: family_dinner_person_id and family_dinner_time only apply to last Fridays (which use the saturday_schedules table).

6. **message** - Send a message back to the user (for confirmations or questions)
   \`\`\`json
   {
     "type": "message",
     "text": "I've updated the pickup assignments for this week."
   }
   \`\`\`

## Rules

1. When user says "next week", add 7 days to the currentWeekStart date
2. Match person names flexibly: "Gili" matches "Gili & Yossi", "savta" matches "Simcha"
3. **CRITICAL FOR WEEKDAYS (Sun-Fri): When creating an activity that should appear on a weekday schedule, you MUST include BOTH a "create_activity" action AND an "assign_activity" action.** The create_activity creates the activity definition, but it won't show on any day unless you also use assign_activity to schedule it.
4. **CRITICAL FOR SATURDAY: Saturday uses a completely different system - "assign_activity" does NOT work for Saturday!** When adding activities to Saturday, you MUST use "update_saturday" action. To add a new activity to Saturday: first use "create_activity", then use "update_saturday" with the activities array. The "assign_activity" action is ONLY for weekdays.
5. Always include a "message" action at the end to confirm what you did
6. If something is unclear, ask for clarification using a "message" action
7. Parse times flexibly: "4:30", "16:30", "4:30pm" all work

## Response Format

Always respond with valid JSON array.

**Example for creating and scheduling a WEEKDAY activity:**
\`\`\`json
[
  {"type": "create_activity", "activity": {"name": "Soccer", "is_recurring": true, "recurrence_day": "monday", "default_time": "16:00"}},
  {"type": "assign_activity", "date": "2026-01-12", "time": "16:00"},
  {"type": "message", "text": "Created soccer activity and scheduled it for Monday."}
]
\`\`\`
Note: The assign_activity action doesn't need activity_id when paired with create_activity - it will use the newly created activity's ID.

**Example for adding a SATURDAY activity:**
\`\`\`json
[
  {"type": "create_activity", "activity": {"name": "Swimming", "is_recurring": false}},
  {"type": "update_saturday", "date": "2026-01-18", "activities": [{"time": "10:00"}]},
  {"type": "message", "text": "Added swimming to Saturday at 10:00 AM."}
]
\`\`\`
Note: The update_saturday activities array item doesn't need activity_id when paired with create_activity - it will use the newly created activity's ID. The activities array replaces any existing activities, so include all desired activities.

**Example for updating a person:**
\`\`\`json
[
  {"type": "update_day", "date": "2026-01-12", "updates": {"pickup_person_id": "abc-123"}},
  {"type": "message", "text": "Updated Monday's pickup to Tamir."}
]
\`\`\``;

// Helper to format date as YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Helper to add days to a date
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Generate week dates from a start date
function getWeekDates(weekStart: string): { day: string; date: string }[] {
  const startDate = new Date(weekStart + 'T00:00:00');
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days.map((day, index) => ({
    day,
    date: formatDate(addDays(startDate, index)),
  }));
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: RequestBody = await req.json();
    const { message, people, activities, schedules = [], currentWeekStart, conversationHistory = [] } = body;

    // Generate explicit dates for each day of the week
    const weekDates = getWeekDates(currentWeekStart);
    const weekDatesStr = weekDates.map(d => `- ${d.day}: ${d.date}`).join('\n');

    // Build full schedule context (people assignments + activities)
    const findPerson = (id?: string) => id ? people.find(p => p.id === id)?.name : null;
    const scheduleContextStr = schedules.length > 0
      ? schedules
          .map(s => {
            const dayInfo = weekDates.find(d => d.date === s.date);
            const dayLabel = dayInfo?.day || s.date;
            const parts: string[] = [];
            const dropoff = findPerson(s.dropoff_person_id);
            if (dropoff) parts.push(`Dropoff: ${dropoff}`);
            const pickup = findPerson(s.pickup_person_id);
            if (pickup) parts.push(`Pickup: ${pickup}`);
            const bedtime = findPerson(s.bedtime_person_id);
            if (bedtime) parts.push(`Bedtime: ${bedtime}`);
            if (s.after_gan_activity_id) {
              const activity = activities.find(a => a.id === s.after_gan_activity_id);
              parts.push(`Activity: ${activity?.name || 'Unknown'} at ${s.after_gan_time || 'unspecified'}`);
            }
            if (s.is_no_gan) parts.push(`No Gan${s.no_gan_reason ? ': ' + s.no_gan_reason : ''}`);
            if (parts.length === 0) return null;
            return `- ${dayLabel} (${s.date}): ${parts.join(' | ')}`;
          })
          .filter(Boolean)
          .join('\n') || '(no assignments this week)'
      : '(no schedule data provided)';

    const contextInfo = `
## Current Context

**This Week's Dates (USE THESE EXACT DATES):**
${weekDatesStr}

**People:**
${people.map(p => `- ${p.name} (${p.role}): ID="${p.id}"`).join('\n')}

**Activities (definitions):**
${activities.length > 0 ? activities.map(a => `- ${a.name}${a.is_recurring ? ` (recurring: ${a.recurrence_day} at ${a.default_time})` : ''}: ID="${a.id}"`).join('\n') : '(none yet)'}

**Current Schedule This Week (who does what each day):**
${scheduleContextStr}

IMPORTANT: When updating days, use the exact dates listed above. For example, if this week's Sunday is 2026-01-11, use "2026-01-11" for Sunday.
IMPORTANT: "Activities (definitions)" shows what activities EXIST. "Current Schedule" shows what's actually ASSIGNED to days this week — including dropoff, pickup, bedtime persons, and after-gan activities.`;

    // Build messages array with conversation history
    const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    // Add context as first user message
    messages.push({
      role: 'user',
      content: contextInfo + '\n\nI will now give you requests. Respond with a JSON array of actions for each.',
    });
    messages.push({
      role: 'assistant',
      content: 'Understood! I have the context about Sky\'s schedule, the people, activities, and this week\'s dates. Please tell me what you need and I\'ll respond with the appropriate actions.',
    });

    // Add conversation history (limit to last 10 exchanges to avoid token limits)
    const recentHistory = conversationHistory.slice(-20);
    for (const msg of recentHistory) {
      messages.push({
        role: msg.role,
        content: msg.role === 'user'
          ? `User request: ${msg.content}\n\nRespond with a JSON array of actions.`
          : msg.content,
      });
    }

    // Add current message
    messages.push({
      role: 'user',
      content: `User request: ${message}\n\nRespond with a JSON array of actions.`,
    });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    // Extract the text content
    const textContent = response.content.find(c => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    // Parse the JSON from the response
    let actions;
    try {
      // Try to extract JSON from the response (might be wrapped in markdown code blocks)
      const jsonMatch = textContent.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        actions = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch {
      // If parsing fails, return a message action with the raw response
      actions = [{ type: 'message', text: textContent.text }];
    }

    return new Response(JSON.stringify({ actions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Assistant API error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const config = {
  runtime: 'edge',
};
