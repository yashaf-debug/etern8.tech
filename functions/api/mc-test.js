import { sendMailViaMC } from '../_shared/mail.js';
import { sendToTelegram } from '../_shared/tg.js';

export async function onRequestPost({ env }) {
  const MAIL_FROM = env.MAIL_FROM || 'noreply@etern8.tech';
  const MAIL_TO   = env.MAIL_TO   || 'hello@etern8.tech';

  const text = 'MailChannels connectivity test from Cloudflare Pages.';
  const mail = await sendMailViaMC({
    fromEmail: MAIL_FROM,
    toEmail  : MAIL_TO,
    subject  : 'MC test',
    text
  });

  // Telegram дубль, чтобы точно не потерять
  const tg = await sendToTelegram({
    botToken: env.TG_BOT_TOKEN,
    chatId  : env.TG_CHAT_ID,
    text    : `MC test → status:${mail.status} server:${mail.server}\n${text}`
  });

  return new Response(JSON.stringify({
    ok: mail.status === 202,
    mail: { status: mail.status, server: mail.server, body: mail.body.slice(0, 400) },
    tg
  }), { headers: { 'content-type': 'application/json' }});
}
