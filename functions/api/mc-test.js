async function sendViaMailChannels(payload, clientIp) {
  const URL = 'https://api.mailchannels.net/tx/v1/send';
  try {
    const headers = { 'content-type': 'application/json' };
    if (clientIp) {
      headers['CF-Connecting-IP'] = clientIp;
      headers['X-Forwarded-For']  = clientIp;
    }
    // опционально: полезные идентификаторы
    headers['X-Entity-Ref-ID'] = crypto.randomUUID?.() || `${Date.now()}`;
    headers['X-Mailer']        = 'Etern8-Worker';

    const res  = await fetch(URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, status: res.status, body: text };
  } catch (e) {
    return { ok: false, status: 0, body: String(e) };
  }
}

export async function onRequestPost({ request, env }) {
  const MAIL_FROM = env.MAIL_FROM;
  const MAIL_TO   = env.MAIL_TO;
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip');

  const payload = {
    personalizations: [{ to: [{ email: MAIL_TO }] }],
    from: { email: MAIL_FROM, name: 'Etern8 Tech' },
    subject: 'MC test',
    content: [{ type: 'text/plain', value: 'Hello from Pages Functions' }]
  };

  const out = await sendViaMailChannels(payload, ip);
  return new Response(JSON.stringify(out), {
    status: 200, headers: { 'content-type':'application/json' }
  });
}

