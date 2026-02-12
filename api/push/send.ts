import { supabase } from './_lib/supabase.js';
import { sendPushNotification } from './_lib/web-push-edge.js';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidEmail = process.env.VAPID_EMAIL;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidEmail) {
    return new Response(JSON.stringify({ error: 'VAPID keys not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { title, body, url } = await req.json();

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, keys');

  if (!subscriptions?.length) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const payload = JSON.stringify({ title, body, url: url || '/' });
  let sent = 0;
  const expired: string[] = [];

  for (const sub of subscriptions) {
    try {
      const response = await sendPushNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        payload,
        vapidPublicKey,
        vapidPrivateKey,
        vapidEmail,
      );

      if (response.status === 201) {
        sent++;
      } else if (response.status === 404 || response.status === 410) {
        expired.push(sub.id);
      }
    } catch {
      // Failed to send to this subscription, skip
    }
  }

  // Clean up expired subscriptions
  if (expired.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', expired);
  }

  return new Response(JSON.stringify({ sent, expired: expired.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

export const config = { runtime: 'edge' };
