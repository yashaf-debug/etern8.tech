export async function sendToTelegram({ botToken, chatId, text }) {
  if (!botToken || !chatId) return { ok:false, reason:'tg-not-configured' };
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
  const body = await res.text();
  return { ok: res.ok, status: res.status, body: body.slice(0, 400) };
}
