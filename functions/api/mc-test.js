export async function onRequestPost({ env }) {
  try {
    const MAIL_FROM = env.MAIL_FROM;
    const MAIL_TO   = env.MAIL_TO;
    const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: MAIL_TO }] }],
        from: { email: MAIL_FROM, name: 'Etern8 Tech' },
        subject: 'MC test',
        content: [{ type: 'text/plain', value: 'Hello from Pages Functions' }]
      })
    });
    const text = await res.text().catch(()=> '');
    return new Response(JSON.stringify({ ok: res.ok, status: res.status, body: text.slice(0,200) }),
      { status: 200, headers: { 'content-type':'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error:String(e) }),
      { status: 200, headers: { 'content-type':'application/json' } });
  }
}
