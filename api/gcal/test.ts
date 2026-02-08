export default async function handler(req: Request): Promise<Response> {
  return new Response(JSON.stringify({ ok: true, time: Date.now() }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
