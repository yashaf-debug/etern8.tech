// functions/api/brief.js
// Robust handler with health mode, safe parsing and explicit MailChannels errors.

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

export async function onRequestPost(context) {
  const { request, env } = context;
  const origin = request.headers.get('origin') || '';
  const allowed = (env.ORIGIN_ALLOWED || '').split(',').map(s => s.trim()).filter(Boolean);
  const headersJSON = (o = {}) => ({
    'content-type': 'application/json',
    'access-control-allow-origin': origin || '*',
    ...o
  });

  try {
    // CORS allow-list (skip if not configured)
    if (origin && allowed.length && !allowed.includes(origin)) {
      return new Response(JSON.stringify({ ok: false, stage: 'cors', error: 'Forbidden origin', origin, allowed }), {
        status: 403, headers: headersJSON()
      });
    }

    // --- HEALTH MODE ---
   // If HEALTH_MODE=1 -> just echo back; helps verify that the function runs and CORS is fine.
    if (String(env.HEALTH_MODE || '') === '1') {
      return new Response(JSON.stringify({ ok: true, health: true, note: 'Function is alive' }), {
        status: 200, headers: headersJSON()
      });
    }

    // --- SAFE BODY PARSE (JSON or formdata) ---
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    let body = {};
    try {
      if (ct.includes('application/json')) {
        body = await request.json();
      } else if (ct.includes('application/x-www-form-urlencoded')) {
        const form = await request.formData();
        body = Object.fromEntries(form.entries());
      } else {
        // attempt formData fallback
        try {
          const form = await request.formData();
          body = Object.fromEntries(form.entries());
        } catch (_) {
          body = {};
        }
      }
    } catch (e) {
      return new Response(JSON.stringify({ ok:false, stage:'parse', error: String(e) }), {
        status: 400, headers: headersJSON()
      });
    }

    // honeypot
    if (body.company) {
      return new Response(JSON.stringify({ ok: true, spam: true }), {
        status: 200, headers: headersJSON()
      });
    }

    const name = (body.name || '').trim();
    const email = (body.email || '').trim();
    const project = (body.project || '').trim();
    const budget = (body.budget || '').trim();
    const message = (body.message || '').trim();
    const pageUrl = (body.pageUrl || '').trim();
    const timestamp = body.timestamp || new Date().toISOString();

    if (!name || !email || !project) {
      return new Response(JSON.stringify({ ok:false, stage:'validate', error:'Missing required fields', fields:{ name:!!name, email:!!email, project:!!project } }), {
        status: 400, headers: headersJSON()
      });
    }

    // --- ENV VALIDATION ---
    const MAIL_FROM = env.MAIL_FROM;
    const MAIL_TO   = env.MAIL_TO;
    if (!MAIL_FROM || !MAIL_TO) {
      return new Response(JSON.stringify({
        ok:false, stage:'env', error:'MAIL_FROM or MAIL_TO not set',
        have: { MAIL_FROM: !!MAIL_FROM, MAIL_TO: !!MAIL_TO }
      }), { status: 500, headers: headersJSON() });
    }

    // --- BYPASS SEND (useful while fixing DNS/SPF) ---
    if (String(env.BYPASS_SEND || '') === '1') {
      return new Response(JSON.stringify({ ok:true, bypass:true, received:{ name, email, project, budget, message, pageUrl, timestamp } }), {
        status: 200, headers: headersJSON()
      });
    }

    // --- MailChannels payload ---
    const payload = {
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
      mailRes = await fetch('https://api.mailchannels.net/tx/v1/send', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      mailText = await mailRes.text();
    } catch (e) {
      // network/resolve error
      return new Response(JSON.stringify({ ok:false, stage:'mail-fetch', error:String(e) }), {
        status: 502, headers: headersJSON()
      });
    }

    if (!mailRes.ok) {
      // explicit error from MailChannels
      return new Response(JSON.stringify({ ok:false, stage:'mail', status: mailRes.status, error: mailText }), {
        status: 502, headers: headersJSON()
      });
    }

    // Optional: Telegram alert (non-blocking)
    try {
      if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
        const text =
`New lead:
Name: ${name}
Email: ${email}
Project: ${project}
Budget: ${budget}
${message ? `Message: ${message}\n` : ''}${pageUrl ? `Page: ${pageUrl}\n` : ''}Time: ${timestamp}`;
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text })
        });
      }
    } catch (_) {}

    return new Response(JSON.stringify({ ok:true, mail:{ status: mailRes.status } }), {
      status: 200, headers: headersJSON()
    });
  } catch (e) {
    // final catch-all to avoid Cloudflare 502
   return new Response(JSON.stringify({ ok:false, stage:'runtime', error: String(e) }), {
      status: 500,
      headers: { 'content-type':'application/json', 'access-control-allow-origin': origin || '*' }
    });
  }
}

