export async function onRequestOptions() {
  // CORS / preflight (на всякий случай)
  return new Response(null, {
    status: 204,
    headers: corsHeaders()
  });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 1) Аккуратно читаем JSON
    let data = {};
    try {
      data = await request.json();
    } catch {
      return json({ ok: false, stage: 'parse', error: 'Invalid JSON body' }, 400);
    }

    // 2) Валидация обязательных полей
    const miss = {};
    if (!data.name)    miss.name = 'required';
    if (!data.email)   miss.email = 'required';
    if (!data.project) miss.project = 'required';
    if (Object.keys(miss).length) {
      return json({ ok:false, stage:'validate', error:'Missing required fields', fields:miss }, 400);
    }

    // 3) Переменные окружения (и в Preview, и в Production!)
    const MAIL_FROM = env.MAIL_FROM;
    const MAIL_TO   = env.MAIL_TO;
    const RESEND    = env.RESEND_API_KEY;
    const TG_TOKEN  = env.TG_BOT_TOKEN;
    const TG_CHAT   = env.TG_CHAT_ID;

    if (!MAIL_FROM || !MAIL_TO) {
      return json({ ok:false, stage:'config', error:'MAIL_FROM/MAIL_TO missing' }, 200);
    }
    if (!RESEND) {
      return json({ ok:false, stage:'config', error:'RESEND_API_KEY missing' }, 200);
    }

    // 4) Письмо
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
      <p><b>Name:</b> ${esc(data.name)}</p>
      <p><b>Email:</b> ${esc(data.email)}</p>
      <p><b>Project:</b> ${esc(data.project)}</p>
      <p><b>Budget:</b> ${esc(data.budget || '-')}</p>
      <p><b>Message:</b><br>${esc(data.message || '-').replace(/\n/g,'<br>')}</p>
      <p><b>Page:</b> ${esc(data.pageUrl || '-')}</p>
      <p><b>Time:</b> ${esc(data.timestamp || new Date().toISOString())}</p>
    `;

    // 5) Отправка через Resend (никаких throw наружу)
    let mail = { ok: false };
    try {
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

      const body = await r.text();   // Resend часто возвращает JSON; но читаем как текст, чтобы не падать
      mail = { ok: r.ok, status: r.status, body: body.slice(0, 500) };

    } catch (e) {
      mail = { ok:false, error: String(e) };
    }

    // 6) Автоответ пользователю (если email валиден)
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    let autoReply = { ok:false, reason:'skip' };
    if (emailRe.test(data.email)) {
      const isRU = (data.pageUrl || '').includes('/ru/');
      const replySubject = isRU
        ? 'Спасибо — Заявка получена'
        : 'Thanks — Etern8 Tech brief received';
      const replyText = isRU
        ? 'Мы получили ваш бриф и ответим в течение 24 часов.'
        : 'We received your brief and will reply within 24 hours.';
      try {
        const r2 = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${RESEND}`
          },
          body: JSON.stringify({
            from: MAIL_FROM,
            to: [data.email],
            subject: replySubject,
            text: replyText
          })
        });
        autoReply = { ok: r2.ok, status: r2.status };
      } catch (e) {
        autoReply = { ok:false, error:String(e) };
      }
    }

    // 7) Телеграм (опционально)
    let tg = { ok:false, reason:'tg-not-configured' };
    if (TG_TOKEN && TG_CHAT) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${TG_TOKEN}/sendMessage`, {
          method:'POST',
          headers:{ 'content-type':'application/json' },
          body: JSON.stringify({
            chat_id: TG_CHAT,
            text: `Etern8 Brief\n\n${textBody}`,
            disable_web_page_preview: true
          })
        });
        tg = { ok: tgRes.ok, status: tgRes.status };
      } catch (e) {
        tg = { ok:false, error:String(e) };
      }
    }

    // 8) Никогда не 5xx с нашей стороны — только JSON
    return json({
      ok: !!mail.ok,
      stage: 'mail',
      mail,
      tg,
      autoReply,
      received: { name: data.name, email: data.email, project: data.project }
    }, 200);

  } catch (e) {
    // На всякий случай: капсулируем всё
    return json({ ok:false, stage:'exception', error:String(e) }, 200);
  }
}

// helpers
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 
      'content-type': 'application/json; charset=utf-8',
      ...corsHeaders()
    }
  });
}
function corsHeaders() {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'POST,OPTIONS',
    'access-control-allow-headers': 'content-type'
  };
}
function esc(s=''){ return String(s).replace(/[&<>"]/g,c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }

