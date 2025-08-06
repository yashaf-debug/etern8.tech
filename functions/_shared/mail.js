export async function sendMailViaMC({ fromEmail, fromName, toEmail, toName, subject, text }) {
  const payload = {
    personalizations: [{ to: [{ email: toEmail, name: toName || 'Etern8 Inbound' }] }],
    from: { email: fromEmail, name: fromName || 'Etern8 Tech' },
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
