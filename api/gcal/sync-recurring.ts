import { supabase } from './_lib/supabase.js';
import { gcalFetch, getCalendarId } from './_lib/google-auth.js';
import {
  mapDayScheduleToEvents,
  toGoogleEvent,
  type GCalEventSpec,
} from './_lib/event-mapper.js';

const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const calendarId = getCalendarId();

    const [peopleRes, activitiesRes] = await Promise.all([
      supabase.from('people').select('id, name'),
      supabase.from('activities').select('id, name, is_recurring, recurrence_day, default_time, icon'),
    ]);

    const people = peopleRes.data ?? [];
    const activities = activitiesRes.data ?? [];
    const table = 'day_schedules';
    const results: Record<string, unknown>[] = [];

    const today = new Date();
    for (let i = 0; i < 28; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const date = d.toISOString().split('T')[0];

      // Load schedule (may be null)
      const { data: schedule } = await supabase
        .from('day_schedules')
        .select('*')
        .eq('date', date)
        .maybeSingle();

      const effectiveSchedule = schedule || { date, is_no_gan: false };
      const desiredEvents = mapDayScheduleToEvents(effectiveSchedule, people, activities);

      if (desiredEvents.length === 0) continue;

      // Load existing mappings
      const { data: existingMaps } = await supabase
        .from('gcal_event_map')
        .select('*')
        .eq('source_table', table)
        .eq('source_date', date);

      const maps = existingMaps ?? [];
      const dayResult = { date, created: 0, updated: 0, deleted: 0, skipped: 0 };

      for (const spec of desiredEvents) {
        const existing = maps.find(
          m => m.event_type === spec.eventType && m.event_index === spec.eventIndex,
        );

        if (existing) {
          if (existing.last_synced_hash === spec.hash) {
            dayResult.skipped++;
            continue;
          }

          const updateRes = await gcalFetch(
            `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(existing.gcal_event_id)}`,
            { method: 'PUT', body: JSON.stringify(toGoogleEvent(spec)) },
          );

          if (!updateRes.ok) {
            throw new Error(`GCal update failed for ${date}: ${await updateRes.text()}`);
          }

          await supabase
            .from('gcal_event_map')
            .update({ last_synced_hash: spec.hash, last_synced_at: new Date().toISOString() })
            .eq('id', existing.id);

          dayResult.updated++;
        } else {
          const createRes = await gcalFetch(
            `/calendars/${encodeURIComponent(calendarId)}/events`,
            { method: 'POST', body: JSON.stringify(toGoogleEvent(spec)) },
          );

          if (!createRes.ok) {
            throw new Error(`GCal insert failed for ${date}: ${await createRes.text()}`);
          }

          const created = await createRes.json();
          if (!created.id) throw new Error('Google Calendar returned no event ID');

          await supabase.from('gcal_event_map').insert({
            source_table: table,
            source_date: date,
            event_type: spec.eventType,
            event_index: spec.eventIndex,
            gcal_event_id: created.id,
            origin: 'sky',
            last_synced_hash: spec.hash,
            last_synced_at: new Date().toISOString(),
          });

          dayResult.created++;
        }
      }

      // Delete orphaned mappings
      for (const map of maps) {
        const stillDesired = desiredEvents.find(
          e => e.eventType === map.event_type && e.eventIndex === map.event_index,
        );

        if (!stillDesired) {
          const deleteRes = await gcalFetch(
            `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(map.gcal_event_id)}`,
            { method: 'DELETE' },
          );

          if (!deleteRes.ok && deleteRes.status !== 404 && deleteRes.status !== 410) {
            throw new Error(`GCal delete failed for ${date}: ${await deleteRes.text()}`);
          }

          await supabase.from('gcal_event_map').delete().eq('id', map.id);
          dayResult.deleted++;
        }
      }

      if (dayResult.created || dayResult.updated || dayResult.deleted) {
        results.push(dayResult);
      }
    }

    return new Response(JSON.stringify({ ok: true, synced: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('sync-recurring error:', error);
    return new Response(
      JSON.stringify({
        error: 'Sync recurring failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}

export const config = {
  runtime: 'edge',
};
