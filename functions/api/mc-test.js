const MC_URLS = [
  'https://cf.mailchannels.net/tx/v1/send',
  'https://api.mailchannels.net/tx/v1/send', // fallback
];

async function sendViaMailChannels(payload) {
  let last;
  for (const url of MC_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const text = await res.text().catch(() => '');
      if (res.ok) return { ok: true, status: res.status, body: text };
      if (res.status !== 401) return { ok: false, status: res.status, body: text };
      last = { ok: false, status: res.status, body: text };
    } catch (e) {
      last = { ok: false, status: 0, body: String(e) };
    }
  }
  return last || { ok: false, status: 0, body: 'No attempt made' };
}

export async function onRequestPost({ env }) {
  try {
    const MAIL_FROM = env.MAIL_FROM;
    const MAIL_TO   = env.MAIL_TO;
    const res = await sendViaMailChannels({
      personalizations: [{ to: [{ email: MAIL_TO }] }],
      from: { email: MAIL_FROM, name: 'Etern8 Tech' },
      subject: 'MC test',
      content: [{ type: 'text/plain', value: 'Hello from Pages Functions' }]
    });
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, body: res.body.slice(0,200) }),
      { status: 200, headers: { 'content-type':'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }),
      { status: 200, headers: { 'content-type':'application/json' } });
  }
}
