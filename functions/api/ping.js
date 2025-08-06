export async function onRequestGet() {
  return new Response(JSON.stringify({ ok: true, ping: 'pong' }), {
    status: 200,
    headers: { 'content-type': 'application/json' }
  });
}
