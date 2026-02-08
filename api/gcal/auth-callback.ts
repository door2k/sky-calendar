import { supabase } from './_lib/supabase.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  throw new Error('Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET env vars');
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  if (error) {
    return new Response(`OAuth error: ${error}`, { status: 400 });
  }

  if (!code) {
    return new Response('Missing authorization code', { status: 400 });
  }

  const redirectUri = `${url.protocol}//${url.host}/api/gcal/auth-callback`;

  try {
    // Exchange code for tokens using raw fetch
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenRes.ok) {
      throw new Error(`Token exchange failed: ${await tokenRes.text()}`);
    }

    const tokens = await tokenRes.json();

    // Persist tokens to Supabase
    const { error: dbError } = await supabase.from('gcal_tokens').upsert({
      id: 'default',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: Date.now() + (tokens.expires_in * 1000),
      scope: tokens.scope ?? 'https://www.googleapis.com/auth/calendar',
      updated_at: new Date().toISOString(),
    });

    if (dbError) throw dbError;

    // Redirect back to the app
    return Response.redirect(`${url.protocol}//${url.host}/`, 302);
  } catch (err) {
    console.error('OAuth callback error:', err);
    return new Response(
      `Failed to exchange token: ${err instanceof Error ? err.message : 'Unknown error'}`,
      { status: 500 },
    );
  }
}

export const config = {
  runtime: 'edge',
};
