document.addEventListener('DOMContentLoaded', () => {
  // Burger toggle
  const burger = document.getElementById('menu-toggle');
  const nav = document.getElementById('site-nav');
  if (burger && nav) {
    burger.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    // Close on link click
    nav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => nav.classList.remove('open'));
    });
  }

  // Brief form -> mailto (работает без сторонних сервисов)
  const form = document.getElementById('brief-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const data = new FormData(form);
      const to = 'hello@etern8.tech'; // при необходимости замените
      const subject = encodeURIComponent('New Brief — Etern8 Tech');
      const body = encodeURIComponent(
        `Name: ${data.get('name')}\nEmail: ${data.get('email')}\nProject: ${data.get('project')}\nBudget: ${data.get('budget')}\nMessage:\n${data.get('message') || ''}`
      );
      window.location.href = `mailto:${to}?subject=${subject}&body=${body}`;
    });
  }
});

