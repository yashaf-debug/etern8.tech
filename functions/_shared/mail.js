export async function sendMailViaMC({
  fromEmail,
  fromName,
  toEmail,
  toName,
  replyToEmail,
  replyToName,
  subject,
  text
}) {
  const payload = {
    personalizations: [{ to: [{ email: toEmail, name: toName || 'Etern8 Inbound' }] }],
    from: { email: fromEmail, name: fromName || 'Etern8 Tech' },
    reply_to: replyToEmail ? { email: replyToEmail, name: replyToName || '' } : undefined,
    sender_domain: fromEmail?.split('@')[1],
    subject,
    content: [{ type: 'text/plain', value: text }]
  };

  const res = await fetch('https://api.mailchannels.net/tx/v1/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const body = await res.text();
  const server = res.headers.get('server') || '';
  return { status: res.status, body, server };
}
