import { supabase } from './_lib/supabase.js';
import { gcalFetch, getCalendarId } from './_lib/google-auth.js';
import {
  mapDayScheduleToEvents,
  mapSaturdayScheduleToEvents,
  toGoogleEvent,
  type GCalEventSpec,
} from './_lib/event-mapper.js';

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

    const calendarId = getCalendarId();

    // Load people and activities for name resolution
    const [peopleRes, activitiesRes] = await Promise.all([
      supabase.from('people').select('id, name'),
      supabase.from('activities').select('id, name, is_recurring, recurrence_day, default_time, icon'),
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

      // Use actual schedule or a minimal default (so recurring activities still sync)
      const effectiveSchedule = schedule || { date, is_no_gan: false };
      desiredEvents = mapDayScheduleToEvents(effectiveSchedule, people, activities);
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
    const results = { created: 0, updated: 0, deleted: 0, skipped: 0 };

    // Process each desired event: create or update
    for (const spec of desiredEvents) {
      const existing = maps.find(
        m => m.event_type === spec.eventType && m.event_index === spec.eventIndex,
      );

      if (existing) {
        if (existing.last_synced_hash === spec.hash) {
          results.skipped++;
          continue;
        }

        // Update existing Google Calendar event
        const updateRes = await gcalFetch(
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing.gcal_event_id)}`,
          { method: 'PUT', body: JSON.stringify(toGoogleEvent(spec)) },
        );

        if (!updateRes.ok) {
          throw new Error(`GCal update failed: ${await updateRes.text()}`);
        }

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
        const createRes = await gcalFetch(
          `/calendars/${encodeURIComponent(calendarId)}/events`,
          { method: 'POST', body: JSON.stringify(toGoogleEvent(spec)) },
        );

        if (!createRes.ok) {
          throw new Error(`GCal insert failed: ${await createRes.text()}`);
        }

        const created = await createRes.json();
        const gcalEventId = created.id;
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
        const deleteRes = await gcalFetch(
          `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(map.gcal_event_id)}`,
          { method: 'DELETE' },
        );

        // 404/410 means already deleted — that's fine
        if (!deleteRes.ok && deleteRes.status !== 404 && deleteRes.status !== 410) {
          throw new Error(`GCal delete failed: ${await deleteRes.text()}`);
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

export const config = {
  runtime: 'edge',
};
