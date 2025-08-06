import { sendMailViaMC } from '../_shared/mail.js';
import { sendToTelegram } from '../_shared/tg.js';

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
    if (!request.headers.get('content-type')?.includes('application/json')) {
      return json({ ok:false, stage:'validate', error:'Unsupported content-type' }, 415);
    }
    const data = await request.json().catch(() => ({}));
    const req = pick(data, ['name','email','project','budget','message','pageUrl','timestamp']);
    const missing = ['name','email','project'].filter(k => !String(req[k]||'').trim());
    if (missing.length) {
      return json({ ok:false, stage:'validate', error:'Missing required fields', fields:{ missing } }, 400);
    }

    const MAIL_FROM = env.MAIL_FROM || 'noreply@etern8.tech';
    const MAIL_TO   = env.MAIL_TO   || 'hello@etern8.tech';

    const text = [
      `New brief from website`,
      `Name: ${req.name}`,
      `Email: ${req.email}`,
      `Project: ${req.project}`,
      req.budget  ? `Budget: ${req.budget}`   : null,
      req.message ? `Message: ${req.message}` : null,
      req.pageUrl ? `Page: ${req.pageUrl}`    : null,
      req.timestamp ? `Time: ${req.timestamp}`: null,
    ].filter(Boolean).join('\n');

    const mail = await sendMailViaMC({
      fromEmail  : MAIL_FROM,
      toEmail    : MAIL_TO,
      replyToEmail: req.email,
      replyToName : req.name,
      subject    : `New Brief — ${req.project} — ${req.name}`,
      text
    });

    // Telegram fallback всегда — чтобы не потерять лиды
    const tg = await sendToTelegram({
      botToken: env.TG_BOT_TOKEN,
      chatId  : env.TG_CHAT_ID,
      text    : `Brief: ${req.name} <${req.email}>\n${req.project}\n${req.budget||''}\n${(req.message||'').slice(0,300)}`
    });

    return json({
      ok: mail.status === 202,
      stage: 'mail',
      httpStatus: mail.status,
      mail: { status: mail.status, server: mail.server, body: mail.body.slice(0, 400) },
      tg,
      received: req
    });

  } catch (e) {
    return json({ ok:false, stage:'exception', error:String(e?.message||e) }, 500);
  }
}

function json(obj, status=200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*'
    }
  });
}
function pick(src, keys){ const o={}; for(const k of keys) if(k in src) o[k]=src[k]; return o; }
