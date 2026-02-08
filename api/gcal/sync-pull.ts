import { supabase } from './lib/supabase.js';
import { getCalendarClient } from './lib/google-auth.js';

const CALENDAR_ID = process.env.GCAL_CALENDAR_ID;
const CRON_SECRET = process.env.CRON_SECRET;
const COOLDOWN_MS = 60_000; // 60 seconds after push before we process pull changes

if (!CALENDAR_ID) throw new Error('Missing GCAL_CALENDAR_ID env var');

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Verify cron secret (Vercel sends it as Authorization header)
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const calendar = await getCalendarClient();

    // Load sync state
    const { data: syncState } = await supabase
      .from('gcal_sync_state')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    // Fetch events from Google Calendar
    const listParams: Record<string, unknown> = {
      calendarId: CALENDAR_ID,
      singleEvents: true,
    };

    if (syncState?.sync_token) {
      listParams.syncToken = syncState.sync_token;
    } else {
      // First sync: get events from 30 days ago
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      listParams.timeMin = timeMin.toISOString();
      listParams.maxResults = 250;
    }

    let nextPageToken: string | undefined;
    let newSyncToken: string | undefined;
    const results = { processed: 0, skipped: 0, deleted: 0, errors: 0 };

    do {
      if (nextPageToken) listParams.pageToken = nextPageToken;

      let response;
      try {
        response = await calendar.events.list(listParams as unknown as Parameters<typeof calendar.events.list>[0]);
      } catch (err: unknown) {
        // If syncToken is invalid (410 Gone), do a full sync
        const status = (err as { code?: number })?.code;
        if (status === 410) {
          // Clear sync token and retry with time-based query
          await supabase
            .from('gcal_sync_state')
            .upsert({ id: 'default', sync_token: null, updated_at: new Date().toISOString() });

          return new Response(JSON.stringify({
            ok: true,
            message: 'Sync token expired, cleared for full re-sync on next run',
          }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        throw err;
      }

      const events = response.data.items ?? [];
      newSyncToken = response.data.nextSyncToken ?? undefined;
      nextPageToken = response.data.nextPageToken ?? undefined;

      for (const event of events) {
        // Only process events that originated from sky-calendar
        const skySource = event.extendedProperties?.private?.sky_source;
        if (skySource !== 'sky-calendar') {
          results.skipped++;
          continue;
        }

        const gcalEventId = event.id;
        if (!gcalEventId) continue;

        // Check if this event was recently pushed (cool-down)
        const { data: mapping } = await supabase
          .from('gcal_event_map')
          .select('*')
          .eq('gcal_event_id', gcalEventId)
          .maybeSingle();

        if (mapping) {
          const lastSynced = new Date(mapping.last_synced_at).getTime();
          if (Date.now() - lastSynced < COOLDOWN_MS) {
            results.skipped++;
            continue;
          }
        }

        // Handle deleted events
        if (event.status === 'cancelled') {
          if (mapping) {
            // Clear the corresponding field in Supabase
            await clearScheduleField(mapping);
            await supabase.from('gcal_event_map').delete().eq('id', mapping.id);
            results.deleted++;
          }
          continue;
        }

        // Handle modified events — parse title back to schedule data
        if (mapping) {
          await updateScheduleFromEvent(event, mapping);
          results.processed++;
        }
      }
    } while (nextPageToken);

    // Save new sync token
    if (newSyncToken) {
      await supabase.from('gcal_sync_state').upsert({
        id: 'default',
        sync_token: newSyncToken,
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    return new Response(JSON.stringify({ ok: true, ...results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sync-pull error:', error);
    return new Response(JSON.stringify({
      error: 'Sync pull failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

// Parse person name from event title back to person ID
async function resolvePersonId(name: string): Promise<string | null> {
  if (!name) return null;
  const { data: people } = await supabase.from('people').select('id, name');
  if (!people) return null;
  const match = people.find(p =>
    p.name.toLowerCase().includes(name.toLowerCase()) ||
    name.toLowerCase().includes(p.name.toLowerCase()),
  );
  return match?.id ?? null;
}

// Clear a schedule field when Google Calendar event is deleted
async function clearScheduleField(mapping: Record<string, unknown>) {
  const table = mapping.source_table as string;
  const date = mapping.source_date as string;
  const eventType = mapping.event_type as string;

  if (table === 'day_schedules') {
    const updates: Record<string, unknown> = {};
    switch (eventType) {
      case 'dropoff': updates.dropoff_person_id = null; break;
      case 'pickup': updates.pickup_person_id = null; break;
      case 'gan_activity': updates.gan_activity = null; break;
      case 'after_gan':
        updates.after_gan_activity_id = null;
        updates.after_gan_time = null;
        break;
      case 'no_gan':
        updates.is_no_gan = false;
        updates.no_gan_reason = null;
        break;
      default: return;
    }
    await supabase.from('day_schedules').update(updates).eq('date', date);
  } else if (table === 'saturday_schedules') {
    // Remove the specific activity from the array
    const eventIndex = mapping.event_index as number;
    const { data: schedule } = await supabase
      .from('saturday_schedules')
      .select('activities')
      .eq('date', date)
      .maybeSingle();

    if (schedule?.activities) {
      const activities = [...schedule.activities];
      activities.splice(eventIndex, 1);
      await supabase
        .from('saturday_schedules')
        .update({ activities })
        .eq('date', date);
    }
  }
}

// Update Supabase schedule from a modified Google Calendar event
async function updateScheduleFromEvent(
  event: { summary?: string | null },
  mapping: Record<string, unknown>,
) {
  const table = mapping.source_table as string;
  const date = mapping.source_date as string;
  const eventType = mapping.event_type as string;
  const summary = event.summary ?? '';

  if (table === 'day_schedules') {
    const updates: Record<string, unknown> = {};

    switch (eventType) {
      case 'dropoff': {
        // Parse "🌅 Dropoff — PersonName"
        const match = summary.match(/Dropoff\s*[—-]\s*(.+)/);
        if (match) {
          const personId = await resolvePersonId(match[1].trim());
          if (personId) updates.dropoff_person_id = personId;
        }
        break;
      }
      case 'pickup': {
        const match = summary.match(/Pickup\s*[—-]\s*(.+)/);
        if (match) {
          const personId = await resolvePersonId(match[1].trim());
          if (personId) updates.pickup_person_id = personId;
        }
        break;
      }
      case 'no_gan': {
        const match = summary.match(/No Gan\s*[—-]\s*(.+)/);
        if (match) {
          updates.is_no_gan = true;
          updates.no_gan_reason = match[1].trim();
        }
        break;
      }
      default: break;
    }

    if (Object.keys(updates).length > 0) {
      await supabase.from('day_schedules').update(updates).eq('date', date);
    }
  }

  // Update last_synced_at to prevent re-triggering push
  await supabase
    .from('gcal_event_map')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', mapping.id);
}
