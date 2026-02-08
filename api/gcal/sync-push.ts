import { supabase } from './lib/supabase.js';
import { getCalendarClient } from './lib/google-auth.js';
import {
  mapDayScheduleToEvents,
  mapSaturdayScheduleToEvents,
  toGoogleEvent,
  type GCalEventSpec,
} from './lib/event-mapper.js';

const CALENDAR_ID = process.env.GCAL_CALENDAR_ID;

if (!CALENDAR_ID) {
  throw new Error('Missing GCAL_CALENDAR_ID env var');
}

interface PushRequest {
  date: string;
  table: 'day_schedules' | 'saturday_schedules';
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: PushRequest = await req.json();
    const { date, table } = body;

    if (!date || !table) {
      return new Response(JSON.stringify({ error: 'Missing date or table' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Load people and activities for name resolution
    const [peopleRes, activitiesRes] = await Promise.all([
      supabase.from('people').select('id, name'),
      supabase.from('activities').select('id, name'),
    ]);

    const people = peopleRes.data ?? [];
    const activities = activitiesRes.data ?? [];

    // Load the schedule for this date
    let desiredEvents: GCalEventSpec[] = [];

    if (table === 'day_schedules') {
      const { data: schedule } = await supabase
        .from('day_schedules')
        .select('*')
        .eq('date', date)
        .maybeSingle();

      if (schedule) {
        desiredEvents = mapDayScheduleToEvents(schedule, people, activities);
      }
    } else {
      const { data: schedule } = await supabase
        .from('saturday_schedules')
        .select('*')
        .eq('date', date)
        .maybeSingle();

      if (schedule) {
        desiredEvents = mapSaturdayScheduleToEvents(schedule, activities);
      }
    }

    // Load existing mappings for this date+table
    const { data: existingMaps } = await supabase
      .from('gcal_event_map')
      .select('*')
      .eq('source_table', table)
      .eq('source_date', date);

    const maps = existingMaps ?? [];
    const calendar = await getCalendarClient();

    const results = { created: 0, updated: 0, deleted: 0, skipped: 0 };

    // Process each desired event: create or update
    for (const spec of desiredEvents) {
      const existing = maps.find(
        m => m.event_type === spec.eventType && m.event_index === spec.eventIndex,
      );

      if (existing) {
        // Check if hash changed
        if (existing.last_synced_hash === spec.hash) {
          results.skipped++;
          continue;
        }

        // Update existing Google Calendar event
        await calendar.events.update({
          calendarId: CALENDAR_ID,
          eventId: existing.gcal_event_id,
          requestBody: toGoogleEvent(spec),
        });

        await supabase
          .from('gcal_event_map')
          .update({
            last_synced_hash: spec.hash,
            last_synced_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        results.updated++;
      } else {
        // Create new Google Calendar event
        const created = await calendar.events.insert({
          calendarId: CALENDAR_ID,
          requestBody: toGoogleEvent(spec),
        });

        const gcalEventId = created.data.id;
        if (!gcalEventId) throw new Error('Google Calendar returned no event ID');

        await supabase.from('gcal_event_map').insert({
          source_table: table,
          source_date: date,
          event_type: spec.eventType,
          event_index: spec.eventIndex,
          gcal_event_id: gcalEventId,
          origin: 'sky',
          last_synced_hash: spec.hash,
          last_synced_at: new Date().toISOString(),
        });

        results.created++;
      }
    }

    // Delete mappings that no longer have a corresponding desired event
    for (const map of maps) {
      const stillDesired = desiredEvents.find(
        e => e.eventType === map.event_type && e.eventIndex === map.event_index,
      );

      if (!stillDesired) {
        try {
          await calendar.events.delete({
            calendarId: CALENDAR_ID,
            eventId: map.gcal_event_id,
          });
        } catch (err: unknown) {
          // 404/410 means already deleted — that's fine
          const status = (err as { code?: number })?.code;
          if (status !== 404 && status !== 410) throw err;
        }

        await supabase.from('gcal_event_map').delete().eq('id', map.id);
        results.deleted++;
      }
    }

    return new Response(JSON.stringify({ ok: true, date, table, ...results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sync-push error:', error);
    return new Response(
      JSON.stringify({
        error: 'Sync push failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}
