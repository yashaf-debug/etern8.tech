export async function onRequestPost({ request, env }) {
  try {
    const origin = request.headers.get('origin') || '';
    const allowed = (env.ORIGIN_ALLOWED || '').split(',').map(s=>s.trim());
    if (origin && allowed.length && !allowed.includes(origin)) return new Response('Forbidden origin',{status:403});
    const body = await request.json();
    if (body.company) return new Response('OK',{status:200}); // honeypot
    const name=(body.name||'').trim(), email=(body.email||'').trim(), project=(body.project||'').trim();
    const budget=(body.budget||'').trim(), message=(body.message||'').trim();
    const pageUrl=(body.pageUrl||'').trim(), timestamp=body.timestamp||new Date().toISOString();
    if(!name||!email||!project) return new Response('Missing required fields',{status:400});
    const mailPayload={ personalizations:[{to:[{email: env.MAIL_TO}]}],
      from:{email: env.MAIL_FROM, name:'Etern8 Tech'},
      headers:{'Reply-To': email},
      subject:`New Brief — ${name} / ${project}`,
      content:[{type:'text/plain', value:
`Name: ${name}
Email: ${email}
Project: ${project}
Budget: ${budget}
Message: ${message}

Page: ${pageUrl}
Time: ${timestamp}`}]
    };
    await fetch('https://api.mailchannels.net/tx/v1/send',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(mailPayload)});
    if (env.TELEGRAM_TOKEN && env.TELEGRAM_CHAT_ID) {
      const text=`New lead:
Name: ${name}
Email: ${email}
Project: ${project}
Budget: ${budget}
${message?`Message: ${message}\n`:''}${pageUrl?`Page: ${pageUrl}\n`:''}Time: ${timestamp}`;
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_TOKEN}/sendMessage`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({chat_id: env.TELEGRAM_CHAT_ID, text})});
    }
    if (env.NOTION_TOKEN && env.NOTION_DB) {
      await fetch('https://api.notion.com/v1/pages',{method:'POST',headers:{Authorization:`Bearer ${env.NOTION_TOKEN}`,'Notion-Version':'2022-06-28','content-type':'application/json'},
        body: JSON.stringify({parent:{database_id: env.NOTION_DB},properties:{
          Name:{title:[{text:{content:name}}]}, Email:{email}, Project:{rich_text:[{text:{content:project}}]},
          Budget:{rich_text:[{text:{content:budget}}]}, Message:{rich_text:[{text:{content:message||'-'}}]},
          Page:{url: pageUrl||'https://etern8.tech'}, Time:{date:{start: timestamp}}
        }})});
    }
    return new Response(JSON.stringify({ok:true}),{status:200,headers:{'content-type':'application/json','access-control-allow-origin':origin||'*'}});
  } catch(e){ console.error(e); return new Response('Server error',{status:500}); }
}
export function onRequestOptions({ request }) {
  const origin = request.headers.get('origin') || '*';
  return new Response(null,{status:204,headers:{'access-control-allow-origin':origin,'access-control-allow-methods':'POST, OPTIONS','access-control-allow-headers':'content-type'}});
}
