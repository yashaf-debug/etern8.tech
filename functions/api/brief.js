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

export async function onRequestPost({ request }) {
  const origin = request.headers.get('origin') || '*';
  const headers = {
    'content-type': 'application/json',
    'access-control-allow-origin': origin || '*'
  };

  try {
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    let body = {};
    if (ct.includes('application/json')) {
      body = await request.json();
    } else {
      const form = await request.formData();
      body = Object.fromEntries(form.entries());
    }

    // honeypot
    if (body.company) {
      return new Response(JSON.stringify({ ok: true, spam: true }), { status: 200, headers });
    }

    const name    = (body.name    || '').trim();
   const email   = (body.email   || '').trim();
    const project = (body.project || '').trim();

    if (!name || !email || !project) {
      return new Response(JSON.stringify({
        ok: false, stage: 'validate', error: 'Missing required fields',
        fields: { name: !!name, email: !!email, project: !!project }
      }), { status: 400, headers });
    }

    return new Response(JSON.stringify({ ok: true, stage: 'parsed', received: { name, email, project } }), {
      status: 200, headers
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, stage: 'runtime', error: String(e) }), {
      status: 500, headers
    });
  }
}
