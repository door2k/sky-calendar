import { supabase } from './_lib/supabase.js';
import { gcalFetch, getCalendarId } from './_lib/google-auth.js';

const CRON_SECRET = process.env.CRON_SECRET;
const WEBHOOK_URL = 'https://sky.door2k.dev/api/gcal/webhook';
// Watch expires after 7 days (Google max for calendar is ~30 days, 7 is safe)
const WATCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Register or renew a Google Calendar push notification watch.
 * Call via cron (daily) or manually. Idempotent — stops existing watch first.
 *
 * GET /api/gcal/watch — register/renew the watch
 * DELETE /api/gcal/watch — stop the current watch
 */
export default async function handler(req: Request): Promise<Response> {
  const authHeader = req.headers.get('authorization');
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method === 'DELETE') {
    return stopWatch();
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const calendarId = getCalendarId();

    // Check existing watch
    const { data: existing } = await supabase
      .from('gcal_watch')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    // If watch exists and hasn't expired, skip renewal
    if (existing?.expiration) {
      const expiresAt = Number(existing.expiration);
      const remainingMs = expiresAt - Date.now();
      // Renew if less than 1 day remaining
      if (remainingMs > 24 * 60 * 60 * 1000) {
        return new Response(JSON.stringify({
          ok: true,
          message: 'Watch still active',
          channel_id: existing.channel_id,
          expires_at: new Date(expiresAt).toISOString(),
          remaining_hours: Math.round(remainingMs / (60 * 60 * 1000)),
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      // Stop old watch before creating new one
      await stopExistingWatch(existing, calendarId);
    }

    // Create new watch
    const channelId = `sky-cal-${Date.now()}`;
    const expiration = Date.now() + WATCH_TTL_MS;

    const watchRes = await gcalFetch(
      `/calendars/${encodeURIComponent(calendarId)}/events/watch`,
      {
        method: 'POST',
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: WEBHOOK_URL,
          expiration: expiration,
        }),
      },
    );

    if (!watchRes.ok) {
      const err = await watchRes.text();
      throw new Error(`Watch registration failed: ${err}`);
    }

    const watchData = await watchRes.json();

    // Store watch info
    await supabase.from('gcal_watch').upsert({
      id: 'default',
      channel_id: watchData.id,
      resource_id: watchData.resourceId,
      expiration: watchData.expiration,
      created_at: new Date().toISOString(),
    });

    return new Response(JSON.stringify({
      ok: true,
      message: 'Watch registered',
      channel_id: watchData.id,
      resource_id: watchData.resourceId,
      expires_at: new Date(Number(watchData.expiration)).toISOString(),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('watch error:', error);
    return new Response(JSON.stringify({
      error: 'Watch registration failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

async function stopExistingWatch(
  watch: Record<string, unknown>,
  calendarId: string,
) {
  try {
    await gcalFetch('/channels/stop', {
      method: 'POST',
      body: JSON.stringify({
        id: watch.channel_id,
        resourceId: watch.resource_id,
      }),
    });
  } catch {
    // Ignore errors stopping old watch — it may have already expired
  }
}

async function stopWatch(): Promise<Response> {
  const { data: watch } = await supabase
    .from('gcal_watch')
    .select('*')
    .eq('id', 'default')
    .maybeSingle();

  if (!watch) {
    return new Response(JSON.stringify({ ok: true, message: 'No active watch' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    await gcalFetch('/channels/stop', {
      method: 'POST',
      body: JSON.stringify({
        id: watch.channel_id,
        resourceId: watch.resource_id,
      }),
    });
  } catch {
    // Ignore
  }

  await supabase.from('gcal_watch').delete().eq('id', 'default');

  return new Response(JSON.stringify({ ok: true, message: 'Watch stopped' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = {
  runtime: 'edge',
};
