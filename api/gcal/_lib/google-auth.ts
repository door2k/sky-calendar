import { supabase } from './supabase.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars');
}

const GCAL_BASE = 'https://www.googleapis.com/calendar/v3';

export async function getAccessToken(): Promise<string> {
  const { data: tokens, error } = await supabase
    .from('gcal_tokens')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error || !tokens) {
    throw new Error(`Failed to load gcal_tokens: ${error?.message ?? 'no row'}`);
  }

  // If token is expired, refresh it
  if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: tokens.refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshResponse.ok) {
      throw new Error(`Token refresh failed: ${await refreshResponse.text()}`);
    }

    const newTokens = await refreshResponse.json();

    await supabase.from('gcal_tokens').update({
      access_token: newTokens.access_token,
      expiry_date: Date.now() + (newTokens.expires_in * 1000),
      updated_at: new Date().toISOString(),
    }).eq('id', 'default');

    return newTokens.access_token;
  }

  return tokens.access_token;
}

export function getCalendarId(): string {
  const id = process.env.GCAL_CALENDAR_ID;
  if (!id) throw new Error('Missing GCAL_CALENDAR_ID env var');
  return id;
}

// Generic Google Calendar API fetch helper
export async function gcalFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = await getAccessToken();
  return fetch(`${GCAL_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}
