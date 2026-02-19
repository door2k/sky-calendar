import { supabase } from './_lib/supabase.js';
import { gcalFetch, getCalendarId } from './_lib/google-auth.js';

/**
 * Google Calendar push notification webhook.
 * Google POSTs here when events change on the watched calendar.
 * We verify the channel ID matches our stored watch, then run a pull sync.
 */
export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const channelId = req.headers.get('x-goog-channel-id');
  const resourceState = req.headers.get('x-goog-resource-state');

  // Google sends a "sync" notification when the watch is first created — acknowledge it
  if (resourceState === 'sync') {
    return new Response('OK', { status: 200 });
  }

  // Only process "exists" notifications (something changed)
  if (resourceState !== 'exists') {
    return new Response('OK', { status: 200 });
  }

  // Verify this is our watch
  const { data: watch } = await supabase
    .from('gcal_watch')
    .select('*')
    .eq('channel_id', channelId)
    .maybeSingle();

  if (!watch) {
    console.error('Webhook received for unknown channel:', channelId);
    return new Response('Unknown channel', { status: 404 });
  }

  // Run the pull sync logic (same as sync-pull but without auth check)
  try {
    const calendarId = getCalendarId();
    const COOLDOWN_MS = 60_000;

    const { data: syncState } = await supabase
      .from('gcal_sync_state')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    const params = new URLSearchParams({ singleEvents: 'true' });

    if (syncState?.sync_token) {
      params.set('syncToken', syncState.sync_token);
    } else {
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 30);
      params.set('timeMin', timeMin.toISOString());
      params.set('maxResults', '250');
    }

    let nextPageToken: string | undefined;
    let newSyncToken: string | undefined;
    const results = { processed: 0, skipped: 0, deleted: 0, errors: 0, external_imported: 0 };

    do {
      if (nextPageToken) params.set('pageToken', nextPageToken);

      const listRes = await gcalFetch(
        `/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
      );

      if (!listRes.ok) {
        if (listRes.status === 410) {
          await supabase
            .from('gcal_sync_state')
            .upsert({ id: 'default', sync_token: null, updated_at: new Date().toISOString() });
          return new Response(JSON.stringify({ ok: true, message: 'Sync token expired, cleared' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`GCal list failed: ${await listRes.text()}`);
      }

      const data = await listRes.json();
      const events = data.items ?? [];
      newSyncToken = data.nextSyncToken ?? undefined;
      nextPageToken = data.nextPageToken ?? undefined;

      for (const event of events) {
        const skySource = event.extendedProperties?.private?.sky_source;
        if (skySource !== 'sky-calendar') {
          const gcalId = event.id;
          if (!gcalId) continue;

          if (event.status === 'cancelled') {
            await supabase.from('gcal_external_events').delete().eq('gcal_event_id', gcalId);
            results.external_imported++;
            continue;
          }

          const allDay = !!event.start?.date;
          let eventDate: string;
          let startTime: string | null = null;
          let endTime: string | null = null;

          if (allDay) {
            eventDate = event.start.date;
          } else if (event.start?.dateTime) {
            const dt = new Date(event.start.dateTime);
            eventDate = dt.toLocaleDateString('en-CA', { timeZone: 'Asia/Jerusalem' });
            startTime = event.start.dateTime;
            endTime = event.end?.dateTime ?? null;
          } else {
            results.skipped++;
            continue;
          }

          const { error: upsertError } = await supabase
            .from('gcal_external_events')
            .upsert({
              gcal_event_id: gcalId,
              date: eventDate,
              summary: event.summary ?? null,
              location: event.location ?? null,
              start_time: startTime,
              end_time: endTime,
              all_day: allDay,
              gcal_etag: event.etag ?? null,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'gcal_event_id' });

          if (upsertError) {
            results.errors++;
          } else {
            results.external_imported++;
          }
          continue;
        }

        const gcalEventId = event.id;
        if (!gcalEventId) continue;

        const { data: mapping } = await supabase
          .from('gcal_event_map')
          .select('*')
          .eq('gcal_event_id', gcalEventId)
          .maybeSingle();

        if (mapping) {
          const lastSynced = new Date(mapping.last_synced_at as string).getTime();
          if (Date.now() - lastSynced < COOLDOWN_MS) {
            results.skipped++;
            continue;
          }
        }

        if (event.status === 'cancelled') {
          if (mapping) {
            await clearScheduleField(mapping);
            await supabase.from('gcal_event_map').delete().eq('id', mapping.id);
            results.deleted++;
          }
          continue;
        }

        if (mapping) {
          await updateScheduleFromEvent(event, mapping);
          results.processed++;
        }
      }
    } while (nextPageToken);

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
    console.error('webhook sync error:', error);
    return new Response(JSON.stringify({
      error: 'Webhook sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

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

  await supabase
    .from('gcal_event_map')
    .update({ last_synced_at: new Date().toISOString() })
    .eq('id', mapping.id);
}

export const config = {
  runtime: 'edge',
};
