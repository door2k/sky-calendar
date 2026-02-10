import { supabase } from './_lib/supabase.js';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Check if tokens exist
    const { data: tokens } = await supabase
      .from('gcal_tokens')
      .select('updated_at, expiry_date')
      .eq('id', 'default')
      .maybeSingle();

    if (!tokens) {
      return new Response(JSON.stringify({
        status: 'not_configured',
        message: 'Google Calendar not connected',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }

    // Check last sync
    const { data: syncState } = await supabase
      .from('gcal_sync_state')
      .select('last_sync_at, sync_token')
      .eq('id', 'default')
      .maybeSingle();

    // Count recent sync mappings
    const { count } = await supabase
      .from('gcal_event_map')
      .select('id', { count: 'exact', head: true });

    // Check if refresh token exists — access tokens expire hourly but auto-refresh on use
    const { data: fullTokens } = await supabase
      .from('gcal_tokens')
      .select('refresh_token')
      .eq('id', 'default')
      .maybeSingle();

    return new Response(JSON.stringify({
      status: fullTokens?.refresh_token ? 'connected' : 'token_expired',
      lastSync: syncState?.last_sync_at ?? null,
      hasSyncToken: !!syncState?.sync_token,
      mappedEvents: count ?? 0,
      tokenUpdatedAt: tokens.updated_at,
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('gcal status error:', error);
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}

export const config = {
  runtime: 'edge',
};
