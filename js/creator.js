/* ============================================================
   CREATOR — about, version, creator links & Buy-Me-a-Coffee
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var CREATOR = {
    instagram: 'https://www.instagram.com/_ar.sharma/',
    linkedin: 'https://www.linkedin.com/in/a-amansharma/',
    copyright: '© 2026 Rishi. All rights reserved.'
  };

  function version() {
    return (window.APP_CONFIG && APP_CONFIG.APP_VERSION) || '1.0.0';
  }

  /* Card used in Settings */
  function html() {
    return '' +
      '<div class="card settings-card creator-card">' +
        '<h3><span class="sc-emoji">🍄</span> Made with love</h3>' +
        '<p class="muted" style="font-size:13px;font-weight:600;margin-top:4px">' + CREATOR.copyright + '</p>' +
        '<p class="muted" style="font-size:13px;font-weight:600">A little world, hand-built for two hearts — by one.</p>' +
        '<div class="creator-links">' +
          '<a class="creator-link" href="' + CREATOR.instagram + '" target="_blank" rel="noopener nofollow">' +
            '<span class="cl-icon">📸</span><span><b>Instagram</b><i>@_ar.sharma</i></span></a>' +
          '<a class="creator-link" href="' + CREATOR.linkedin + '" target="_blank" rel="noopener nofollow">' +
            '<span class="cl-icon">💼</span><span><b>LinkedIn</b><i>a-amansharma</i></span></a>' +
        '</div>' +
        '<div class="row" style="align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">' +
          '<span class="ver-chip">v' + version() + '</span>' +
          '<button class="btn btn-soft btn-sm" data-coffee>☕ Buy me a coffee</button>' +
        '</div>' +
      '</div>';
  }

  function wire(root) {
    var btn = root.querySelector('[data-coffee]');
    if (btn) btn.addEventListener('click', openCoffee);
  }

  function openCoffee() {
    var qr = 'images/my-qr.webp';
    HB.modal({
      title: 'Buy me a coffee ☕',
      text: 'If this little world makes your heart smile, a coffee keeps the love (and the code) brewing.',
      body:
        '<div class="coffee-qr">' +
          '<img src="' + HB.esc(qr) + '" alt="QR code — buy me a coffee" />' +
        '</div>' +
        '<p class="muted" style="font-size:12.5px;font-weight:600;text-align:center;margin-top:10px">Scan with your phone camera ♡</p>',
      actions: [
        { label: 'Maybe later ♡', kind: 'btn-ghost' }
      ]
    });
  }

  HB.creator = { html: html, wire: wire, openCoffee: openCoffee, version: version, links: CREATOR };
})();
