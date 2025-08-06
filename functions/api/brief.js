// CORS preflight
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

export async function onRequestPost(ctx) {
  try {
    return await handle(ctx);
  } catch (e) {
    console.error('FATAL /api/brief:', e);
    return json(ctx, 200, { ok: false, stage: 'fatal', error: String(e) });
  }
}

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

async function handle({ request, env }) {
  const origin   = request.headers.get('origin') || '';
  const allowed  = (env.ORIGIN_ALLOWED || '').split(',').map(s => s.trim()).filter(Boolean);
  if (origin && allowed.length && !allowed.includes(origin)) {
    return json({ request, env }, 200, { ok: false, stage: 'cors', origin, allowed });
  }

  // parse body (JSON или form-data)
  let body = {};
  try {
    const ct = (request.headers.get('content-type') || '').toLowerCase();
    if (ct.includes('application/json')) body = await request.json();
    else body = Object.fromEntries((await request.formData()).entries());
  } catch (e) {
    console.error('parse error:', e);
    return json({ request, env }, 200, { ok: false, stage: 'parse', error: String(e) });
  }

  // honeypot
  if (body.company) {
    return json({ request, env }, 200, { ok: true, spam: true });
  }

  const name     = (body.name    || '').trim();
  const email    = (body.email   || '').trim();
  const project  = (body.project || '').trim();
  const budget   = (body.budget  || '').trim();
  const message  = (body.message || '').trim();
  const pageUrl  = (body.pageUrl || '').trim();
  const timestamp = body.timestamp || new Date().toISOString();

  if (!name || !email || !project) {
    return json({ request, env }, 200, {
      ok: false, stage: 'validate',
      error: 'Missing required fields',
      fields: { name: !!name, email: !!email, project: !!project }
    });
  }

  const MAIL_FROM = env.MAIL_FROM;
  const MAIL_TO   = env.MAIL_TO;
  if (!MAIL_FROM || !MAIL_TO) {
    return json({ request, env }, 200, { ok: false, stage: 'env', error: 'MAIL_FROM or MAIL_TO not set' });
  }

  // Быстрый обход отправки на время отладки
  if (String(env.BYPASS_SEND || '') === '1') {
    return json({ request, env }, 200, { ok: true, bypass: true, received: { name, email, project, budget, message, pageUrl, timestamp } });
  }

  // Отправка письма (MailChannels)
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('x-real-ip');

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

  const mailRes = await sendViaMailChannels(payload, ip);
  if (!mailRes.ok) {
    // не роняем 5xx наружу, возвращаем ясную причину
    return json({ request, env }, 200, {
      ok: false,
      stage: 'mail',
      httpStatus: mailRes.status,
      error: mailRes.body?.slice?.(0, 200) || String(mailRes.body)
    });
  }

  // Telegram — не блокируем ответ
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
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      }).catch(() => {});
    }
  } catch (e) {
    console.error('telegram error:', e);
  }

  return json({ request, env }, 200, { ok: true, mail: { status: 202 } });
}

function json({ request, env }, status, data) {
  const origin = (request && request.headers.get('origin')) || '*';
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': origin
    }
  });
}
