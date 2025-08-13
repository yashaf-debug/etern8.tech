// Etern8 Tech — unified header/lang/form script

document.addEventListener('DOMContentLoaded', () => {
  // --- Language switcher active state ---
  const isRU = location.pathname.startsWith('/ru/');
  document.querySelectorAll('.language-switcher .lang').forEach(a => {
    const t = a.textContent.trim();
    a.classList.toggle('active', (isRU && t === 'RU') || (!isRU && t === 'EN'));
  });

  // --- Burger toggle ---
  const burger = document.getElementById('menu-toggle');
  const nav = document.getElementById('site-nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    nav.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => nav.classList.remove('open'))
    );
  }

  // --- Brief form handler (EN + RU) ---
  const form = document.getElementById('brief-form');
  if (form) {
    // не даём браузеру идти по action
    form.removeAttribute('action');

    // honeypot
    if (!form.querySelector('input[name="company"]')) {
      const hp = document.createElement('input');
      hp.type = 'text';
      hp.name = 'company';
      hp.autocomplete = 'off';
      hp.tabIndex = -1;
      hp.ariaHidden = 'true';
      hp.style.display = 'none';
      form.prepend(hp);
    }

    const API_URL = '/api/brief';
    const submitBtn = form.querySelector('button[type="submit"]');
    let notice = form.querySelector('.form-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'form-notice';
      notice.style.marginTop = '10px';
      notice.style.fontSize = '.95rem';
      form.appendChild(notice);
    }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      notice.textContent = '';
      if (submitBtn) submitBtn.disabled = true;

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
        notice.textContent = isRU
          ? 'Спасибо! Ответим в течение 24 часов.'
          : 'Thanks! We’ll reply within 24 hours.';
        form.reset();
      } catch (err) {
        console.error(err);
        notice.style.color = '#c62828';
        notice.textContent = isRU
          ? 'Ошибка. Попробуйте ещё раз или напишите hello@etern8.tech.'
          : 'Oops. Please try again or email hello@etern8.tech.';
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});