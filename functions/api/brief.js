export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type'
    }
  });
}

export async function onRequestPost({ request, env }) {
  try {
    const data = await request.json().catch(() => ({}));
    const errors = {};
    if (!data.name)    errors.name = 'required';
    if (!data.email)   errors.email = 'required';
    if (!data.project) errors.project = 'required';
    if (Object.keys(errors).length) {
      return json({ ok:false, stage:'validate', error:'Missing required fields', fields:errors }, 400);
    }

    const MAIL_FROM = env.MAIL_FROM;
    const MAIL_TO   = env.MAIL_TO;
    const RESEND    = env.RESEND_API_KEY;

    if (!MAIL_FROM || !MAIL_TO) {
      return json({ ok:false, stage:'config', error:'MAIL_FROM/MAIL_TO missing' }, 500);
    }
    if (!RESEND) {
      return json({ ok:false, stage:'config', error:'RESEND_API_KEY missing' }, 500);
    }

    const subject = `New brief: ${data.project}`;
    const textBody = [
      `Name: ${data.name}`,
      `Email: ${data.email}`,
      `Project: ${data.project}`,
      `Budget: ${data.budget || '-'}`,
      `Message: ${data.message || '-'}`,
      `Page: ${data.pageUrl || '-'}`,
      `Time: ${data.timestamp || new Date().toISOString()}`
    ].join('\n');

    const htmlBody = `
      <h2>New brief</h2>
      <p><b>Name:</b> ${escapeHtml(data.name)}</p>
      <p><b>Email:</b> ${escapeHtml(data.email)}</p>
      <p><b>Project:</b> ${escapeHtml(data.project)}</p>
      <p><b>Budget:</b> ${escapeHtml(data.budget || '-')}</p>
      <p><b>Message:</b><br>${escapeHtml(data.message || '-').replace(/\n/g,'<br>')}</p>
      <p><b>Page:</b> ${escapeHtml(data.pageUrl || '-')}</p>
      <p><b>Time:</b> ${escapeHtml(data.timestamp || new Date().toISOString())}</p>
    `;

    // ---- Resend ----
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${RESEND}`
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [MAIL_TO],
        reply_to: data.email,
        subject,
        text: textBody,
        html: htmlBody
      })
    });

    const rText = await r.text();
    const ok = r.ok; // 200/201

    // Telegram fallback (не критично)
    let tg = { ok:false, reason:'tg-not-configured' };
    if (env.TG_BOT_TOKEN && env.TG_CHAT_ID) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
          method:'POST',
          headers:{ 'content-type':'application/json' },
          body: JSON.stringify({
            chat_id: env.TG_CHAT_ID,
            text: `Etern8 Brief\n\n${textBody}`,
            parse_mode: 'HTML',
            disable_web_page_preview: true
          })
        });
        tg = { ok: tgRes.ok, status: tgRes.status };
      } catch(e) { tg = { ok:false, error: String(e) }; }
    }

    return json({
      ok,
      provider: 'resend',
      httpStatus: r.status,
      bodyPreview: rText.slice(0, 400),
      received: { name: data.name, email: data.email, project: data.project },
      tg
    }, ok ? 200 : 502);

  } catch (e) {
    return json({ ok:false, stage:'exception', error:String(e) }, 500);
  }
}

function json(obj, status=200){
  return new Response(JSON.stringify(obj), {
    status, headers:{ 'content-type':'application/json; charset=utf-8', 'access-control-allow-origin':'*' }
  });
}
function escapeHtml(s=''){return s.replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]));}

