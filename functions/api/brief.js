// OPTIONS (CORS preflight)
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

// POST /api/brief
export async function onRequestPost({ request, env }) {
  const origin   = request.headers.get('origin') || '';
  const allowed  = (env.ORIGIN_ALLOWED || '').split(',').map(s => s.trim()).filter(Boolean);
  const headers  = { 'content-type':'application/json', 'access-control-allow-origin': origin || '*' };

  try {
    if (origin && allowed.length && !allowed.includes(origin)) {
      return new Response(JSON.stringify({ ok:false, stage:'cors', origin, allowed }), { status:403, headers });
    }

    // parse body
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    let body = {};
    if (ct.includes('application/json')) body = await request.json();
    else body = Object.fromEntries((await request.formData()).entries());

    // honeypot
    if (body.company) {
      return new Response(JSON.stringify({ ok:true, spam:true }), { status:200, headers });
    }

    const name      = (body.name    || '').trim();
    const email     = (body.email   || '').trim();
    const project   = (body.project || '').trim();
    const budget    = (body.budget  || '').trim();
    const message   = (body.message || '').trim();
    const pageUrl   = (body.pageUrl || '').trim();
    const timestamp = body.timestamp || new Date().toISOString();

    if (!name || !email || !project) {
      return new Response(JSON.stringify({
        ok:false, stage:'validate', error:'Missing required fields',
        fields:{ name:!!name, email:!!email, project:!!project }
      }), { status:400, headers });
    }

    const MAIL_FROM = env.MAIL_FROM;
    const MAIL_TO   = env.MAIL_TO;
    if (!MAIL_FROM || !MAIL_TO) {
      return new Response(JSON.stringify({ ok:false, stage:'env', error:'MAIL_FROM or MAIL_TO not set' }), {
        status:500, headers
      });
    }

    // На время отладки можно включить BYPASS_SEND=1 в переменных среды
    if (String(env.BYPASS_SEND || '') === '1') {
      return new Response(JSON.stringify({
        ok:true, bypass:true,
        received:{ name, email, project, budget, message, pageUrl, timestamp }
      }), { status:200, headers });
    }

    // MailChannels
    const mailPayload = {
      personalizations: [{ to: [{ email: MAIL_TO }] }],
      from: { email: MAIL_FROM, name: 'Etern8 Tech' },
      headers: { 'Reply-To': email },
      subject: `New Brief — ${name} / ${project}`,
      content: [{
        type: 'text/plain',
        value:
`Name: ${name}
Email: ${email}
Project: ${project}
Budget: ${budget}
Message: ${message}

Page: ${pageUrl}
Time: ${timestamp}`
      }]
    };

    let mailRes, mailText = '';
    try {
      mailRes  = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(mailPayload)
      });
      mailText = await mailRes.text();
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, stage:'mail-fetch', error:String(e) }), { status:502, headers });
    }

    if (!mailRes.ok) {
      return new Response(JSON.stringify({ ok:false, stage:'mail', status:mailRes.status, error:mailText }), { status:502, headers });
    }

    // Telegram — необязательно, не блокирует ответ
    try {
      if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
        const text =
`New lead:
Name: ${name}
Email: ${email}
Project: ${project}
Budget: ${budget}
${message ? `Message: ${message}\n` : ''}${pageUrl ? `Page: ${pageUrl}\n` : ''}Time: ${timestamp}`;
        const payload = { chat_id: env.TELEGRAM_CHAT_ID, text };
        if (env.TELEGRAM_THREAD_ID) payload.message_thread_id = Number(env.TELEGRAM_THREAD_ID);
        await fetch(
          `https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,
          {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
      }
    } catch (_) {}

    return new Response(JSON.stringify({ ok:true, mail:{ status: mailRes.status } }), { status:200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, stage:'runtime', error:String(e) }), { status:500, headers });
  }
}
