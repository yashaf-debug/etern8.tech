// Etern8 Tech — unified header/lang/form script

document.addEventListener('DOMContentLoaded', () => {
  // Increase chance for good LCP
  const heroImg = document.querySelector('.hero img');
  if (heroImg) heroImg.setAttribute('fetchpriority', 'high');
  // --- Language switcher active state ---
  const path = location.pathname;
  const currentLang = path.startsWith('/ru/') ? 'ru'
    : path.startsWith('/ar/') ? 'ar'
    : 'en';
  document.querySelectorAll('.language-switcher .lang').forEach(a => {
    const t = a.textContent.trim().toLowerCase();
    a.classList.toggle('active', t === currentLang);
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

  // --- Neutralize any "mailto:" anchors (safety) ---
  document.querySelectorAll('a[href^="mailto:"]').forEach(a => {
    a.replaceWith(a.textContent || '');
  });

  // --- Brief form handler (EN + RU + AR) ---
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
        const successMsgs = {
          en: 'Thanks! We\u2019ll reply within 24 hours.',
          ru: 'Спасибо! Ответим в течение 24 часов.',
          ar: 'شكرًا! سنرد خلال 24 ساعة.'
        };
        notice.textContent = successMsgs[currentLang];
        if (window.gtag) {
          gtag('event', 'generate_lead', {
            event_category: 'form',
            event_label: window.location.pathname,
            value: 1,
            currency: 'USD'
          });
        }
        form.reset();
      } catch (err) {
        console.error(err);
        notice.style.color = '#c62828';
        const errorMsgs = {
          en: 'Oops. Please try again or email hello@etern8.tech.',
          ru: 'Ошибка. Попробуйте ещё раз или напишите hello@etern8.tech.',
          ar: 'حدث خطأ. حاول مرة أخرى أو أرسل بريدًا إلى hello@etern8.tech.'
        };
        notice.textContent = errorMsgs[currentLang];
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});

document.addEventListener('click', e => {
  const a = e.target.closest('[data-ga]');
  if (!a || !window.gtag) return;
  const name = a.getAttribute('data-ga');
  gtag('event', name, {
    event_category: 'cta',
    event_label: location.pathname,
    value: 1
  });
});
