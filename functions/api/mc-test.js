import { sendMailViaMC } from '../_shared/mail.js';

export async function onRequestPost({ env }) {
  const MAIL_FROM = env.MAIL_FROM || 'noreply@etern8.tech';
  const MAIL_TO   = env.MAIL_TO   || 'hello@etern8.tech';

  const { status, body } = await sendMailViaMC({
    fromEmail: MAIL_FROM,
    fromName : 'Etern8 Tech',
    toEmail  : MAIL_TO,
    toName   : 'Etern8 Inbound',
    subject  : 'MC connectivity test',
    text     : 'This is a MailChannels test via Cloudflare Pages.'
  });

  return new Response(JSON.stringify({
    ok: status === 202,
    status,
    body: body?.slice(0, 2000)
  }), { headers: { 'content-type': 'application/json' } });
}
