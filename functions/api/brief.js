export async function onRequestPost({ request }) {
  let raw = '';
  try { raw = await request.text(); } catch(_) {}
  return new Response(JSON.stringify({
    ok: true,
    stub: true,
    contentType: request.headers.get('content-type'),
    raw
  }), { status: 200, headers: { 'content-type':'application/json' } });
}

export async function onRequestOptions({ request }) {
  const origin = request.headers.get('origin') || '*';
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}
