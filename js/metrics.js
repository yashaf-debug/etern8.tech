// /js/metrics.js
(function () {
  if (window.ym) return; // защита от повторной инициализации
  (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){ (m[i].a=m[i].a||[]).push(arguments) };
      m[i].l=1*new Date();
      // защита от повторной подгрузки по src
      for (var j = 0; j < e.scripts.length; j++) {
        if (e.scripts[j].src === r) return;
      }
      k=e.createElement(t), a=e.getElementsByTagName(t)[0];
      k.async=1; k.src=r; a.parentNode.insertBefore(k,a);
  })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js?id=103785298', 'ym');

  // на всякий случай определяем dataLayer, если его нет (ecommerce будет его использовать)
  window.dataLayer = window.dataLayer || [];

  ym(103785298, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: "dataLayer",
    accurateTrackBounce: true,
    trackLinks: true
  });
})();
