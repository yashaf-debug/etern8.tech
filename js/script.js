document.addEventListener('DOMContentLoaded', () => {
  const burger = document.getElementById('menu-toggle');
  const nav = document.getElementById('site-nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }
  const isRU = location.pathname.startsWith('/ru/');
  document.querySelectorAll('.language-switcher .lang').forEach(a => {
    const t = a.textContent.trim();
    a.classList.toggle('active', (isRU && t === 'RU') || (!isRU && t === 'EN'));
  });

  const form = document.getElementById('brief-form');
  if (form) {
    const API_URL = '/api/brief';
    const submitBtn = form.querySelector('button[type="submit"]');
    const notice = document.createElement('div');
    notice.style.marginTop = '10px';
    notice.style.fontSize = '.95rem';
    form.appendChild(notice);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      notice.textContent = '';
      submitBtn.disabled = true;
      const data = Object.fromEntries(new FormData(form).entries());
      data.pageUrl = window.location.href;
      data.timestamp = new Date().toISOString();
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        if (!res.ok) throw new Error('Bad status ' + res.status);
        notice.style.color = '#2e7d32';
        notice.textContent = 'Thanks! We received your brief. We’ll reply within 24 hours.';
        form.reset();
      } catch (err) {
        console.error(err);
        notice.style.color = '#c62828';
        notice.textContent = 'Oops. Please try again or email hello@etern8.tech.';
      } finally {
        submitBtn.disabled = false;
      }
    });
  }
});

