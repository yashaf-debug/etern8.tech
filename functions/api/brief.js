import { sendMailViaMC } from '../_shared/mail.js';

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
    if (request.headers.get('content-type')?.includes('application/json') !== true) {
      return json({ ok:false, stage:'validate', error:'Unsupported content-type' }, 415);
    }

    const data = await request.json().catch(() => ({}));
    const fields = pick(data, ['name','email','project','budget','message','pageUrl','timestamp']);

    const missing = ['name','email','project'].filter(k => !String(fields[k]||'').trim());
    if (missing.length) {
      return json({ ok:false, stage:'validate', error:'Missing required fields', fields:{ missing } }, 400);
    }

    const MAIL_FROM = env.MAIL_FROM || 'noreply@etern8.tech';
    const MAIL_TO   = env.MAIL_TO   || 'hello@etern8.tech';

    const text = [
      `New brief from website`,
      `Name: ${fields.name}`,
      `Email: ${fields.email}`,
      `Project: ${fields.project}`,
      fields.budget  ? `Budget: ${fields.budget}`   : null,
      fields.message ? `Message: ${fields.message}` : null,
      fields.pageUrl ? `Page: ${fields.pageUrl}`    : null,
      fields.timestamp ? `Time: ${fields.timestamp}`: null,
    ].filter(Boolean).join('\n');

    const { status, body } = await sendMailViaMC({
      fromEmail: MAIL_FROM,
      fromName : 'Etern8 Tech',
      toEmail  : MAIL_TO,
      toName   : 'Etern8 Inbound',
      subject  : `New Brief — ${fields.project} — ${fields.name}`,
      text,
      replyToEmail: fields.email,
      replyToName : fields.name
    });

    return json({
      ok: status === 202,
      stage: 'mail',
      mail: { status, body: body?.slice(0, 500) },
      received: fields
    });

  } catch (e) {
    return json({ ok:false, stage:'exception', error:String(e?.message||e) }, 500);
  }
}

// helpers
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
