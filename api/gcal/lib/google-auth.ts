import { google } from 'googleapis';
import { supabase } from './supabase.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars');
}

export async function getGoogleAuth() {
  // Load tokens from Supabase
  const { data: tokens, error } = await supabase
    .from('gcal_tokens')
    .select('*')
    .eq('id', 'default')
    .single();

  if (error || !tokens) {
    throw new Error(`Failed to load gcal_tokens: ${error?.message ?? 'no row'}`);
  }

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
  );

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    scope: tokens.scope,
    token_type: 'Bearer',
  });

  // Auto-refresh: listen for new tokens and persist them
  oauth2Client.on('tokens', async (newTokens) => {
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (newTokens.access_token) update.access_token = newTokens.access_token;
    if (newTokens.refresh_token) update.refresh_token = newTokens.refresh_token;
    if (newTokens.expiry_date) update.expiry_date = newTokens.expiry_date;

    await supabase
      .from('gcal_tokens')
      .update(update)
      .eq('id', 'default');
  });

  // Force refresh if expired
  const now = Date.now();
  if (tokens.expiry_date && tokens.expiry_date < now) {
    const { credentials } = await oauth2Client.refreshAccessToken();
    oauth2Client.setCredentials(credentials);
  }

  return oauth2Client;
}

export async function getCalendarClient() {
  const auth = await getGoogleAuth();
  return google.calendar({ version: 'v3', auth });
}
