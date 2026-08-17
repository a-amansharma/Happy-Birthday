/* ============================================================
   DASHBOARD — personalized home
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var TILES = [
    { path: '/chat', icon: '💬', title: 'Our Chat', sub: 'Your real-time messages, just for two', accent: '#F8BBD0' },
    { path: '/companion', icon: '🐻', title: 'Your Companion', sub: 'Your cozy AI companion, just for you', accent: '#FFD3B6' },
    { path: '/partner', icon: '💞', title: 'Your Partner', sub: 'Connection, code & bond', accent: '#D8C6F5' },
    { path: '/memories', icon: '📸', title: 'Our Memories', sub: 'Your favorite moments', accent: '#F9C9A4' },
    { path: '/notes', icon: '💌', title: 'Love Notes', sub: 'Little things worth saying', accent: '#F5B7C6' },
    { path: '/daily', icon: '☀️', title: 'Daily Question', sub: 'One sweet question a day', accent: '#FFE5A3' },
    { path: '/quiz', icon: '🎲', title: 'Daily Bond Quiz', sub: 'Playful, never serious', accent: '#D8C6F5' },
    { path: '/dates', icon: '🎈', title: 'Fun Together', sub: 'Personalized date ideas', accent: '#A7E0C3' },
    { path: '/special', icon: '⏳', title: 'Special Dates', sub: 'Your love timer & countdowns', accent: '#F5C6D0' }
  ];

  function renderHome(main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var p = HB.state.profile;
    var n = HB.firstNames();
    var rel = (p.relationship || '').toLowerCase();
    var relEmoji = { couple: '💑', 'best friends': '🧸', crush: '💘', 'long distance': '🌍', 'newly together': '🌱', married: '💍', 'talking stage': '💬', "it's complicated": '🌀' }[rel.toLowerCase()] || '✨';

    var connected = HB.rel && HB.rel.data && HB.rel.data.status === 'connected';
    var waiting = HB.rel && HB.rel.data && HB.rel.data.status === 'waiting';

    /* When waiting — show the waiting screen with pairing code instead
       of the normal dashboard. This is the "home" view while waiting. */
    if (waiting && !connected) {
      var code = HB.rel.data.me && HB.rel.data.me.pairing_code || 'LOVE-?????';
      main.innerHTML =
        '<div class="page">' +
        '<div class="dash-hello">' +
          '<h1>Waiting for <span class="hand">' + HB.esc(n.partner) + '</span> ♡</h1>' +
          '<p>Your little world is ready — share your code and they\'ll join you in a moment.</p>' +
        '</div>' +
        '<div class="waiting-card">' +
          '<div class="waiting-dudu" data-wait-du></div>' +
          '<div class="waiting-emoji">💕</div>' +
          '<h2 class="waiting-title">Your Pairing Code</h2>' +
          '<div class="waiting-code">' + HB.esc(code) + '</div>' +
          '<button class="btn btn-primary waiting-copy" id="waiting-copy">' + HB.icon('copy') + ' Copy Code</button>' +
          '<p class="waiting-hint">Send this to your person — they\'ll enter it on their phone to join you.</p>' +
        '</div>' +
        '</div>';

      var hero = main.querySelector('[data-wait-du]');
      if (hero && HB.chars) HB.chars.hero(hero, { which: 'both', actions: ['wait', 'love', 'happy'], size: 'hero', alt: 'Waiting for your person' });

      var copyBtn = main.querySelector('#waiting-copy');
      if (copyBtn) copyBtn.addEventListener('click', function () {
        var btn = this;
        navigator.clipboard.writeText(code).then(function () {
          btn.innerHTML = '✓ Copied 💕';
          setTimeout(function () { btn.innerHTML = HB.icon('copy') + ' Copy Code'; }, 1600);
          HB.toast('Code copied — send it to your person ♡', '💌');
        }).catch(function () {
          HB.toast('Couldn\'t copy — long-press the code instead ♡', '🐻');
        });
      });

      /* Auto-transition when partner connects */
      window.addEventListener('hb:relchange', function onConnect() {
        if (HB.rel.data.status === 'connected') {
          window.removeEventListener('hb:relchange', onConnect);
          HB.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
          HB.toast('You\'re connected! Welcome to your little world ♡', '🎉');
          if (HB.currentPath() === '/home') renderHome(main);
        }
      });
      return;
    }

    var timeOfDay = '';
    var h = new Date().getHours();
    if (h < 12) timeOfDay = 'Good morning';
    else if (h < 17) timeOfDay = 'Good afternoon';
    else timeOfDay = 'Good evening';

    var tags = '';
    if (p.relationship) tags += '<span class="rh-tag">' + relEmoji + ' ' + HB.esc(p.relationship) + '</span>';
    if (p.vibes && p.vibes.length) {
      var vibeEmoji = {};
      HB.VIBES.forEach(function (v) { vibeEmoji[v.label] = v.emoji; });
      var vibeLabels = p.vibes.slice(0, 2).map(function (v) { return typeof v === 'string' ? v : v.label; });
      tags += '<span class="rh-tag">' + vibeLabels.map(function (l) { return (vibeEmoji[l] || '✨') + ' ' + HB.esc(l); }).join('</span><span class="rh-tag">') + '</span>';
    }

    var tiles = TILES.map(function (t) {
      return '<button class="dash-tile" data-path="' + t.path + '">' +
        '<div class="dt-icon" style="background:linear-gradient(135deg,' + t.accent + ',transparent);color:var(--ink)">' + t.icon + '</div>' +
        '<div><div class="dt-title">' + t.title + '</div><div class="dt-sub">' + t.sub + '</div></div>' +
        '<span class="dt-go">Open <span>→</span></span>' +
        '</button>';
    }).join('');

    main.innerHTML =
      '<div class="page">' +
      '<div class="dash-hello">' +
        '<h1>' + timeOfDay + ', <span class="hand">' + HB.esc(n.me) + '</span> ♡</h1>' +
        '<p>Welcome back to your little world with <span class="hand" style="font-size:1.2em">' + HB.esc(n.partner) + '</span>.</p>' +
      '</div>' +

      '<div class="relation-hero">' +
        '<div class="rh-dudu" data-hero></div>' +
        '<div class="rh-main">' +
          '<h2>' + HB.esc(HB.couple()) + '</h2>' +
          (p.relationship ? '<div class="rh-tags">' + tags + '</div>' : '') +
          (p.togetherSince ? '<div class="rh-ages">Together since ' + HB.esc(formatDate(p.togetherSince)) + '</div>' : '') +
        '</div>' +
      '</div>' +

      '<div class="section-title"><h3>Quick actions</h3><span class="hand">pick your little adventure</span></div>' +
      '<div class="dash-grid">' + tiles + '</div>' +
      '</div>';

    main.querySelectorAll('[data-path]').forEach(function (el) {
      el.addEventListener('click', function () { HB.navigate(el.dataset.path); });
    });

    var hero = main.querySelector('[data-hero]');
    if (hero && HB.chars) HB.chars.hero(hero, { which: 'both', size: 'hero', alt: 'Bubu ♡ Dudu' });
  }

  HB.renderHome = renderHome;
  HB.route('/home', renderHome);

  /* Register this listener ONCE — it checks the current path
     before re-rendering, so it's safe across multiple calls. */
  var _dashRelWired = false;
  if (!_dashRelWired) {
    _dashRelWired = true;
    window.addEventListener('hb:relchange', function () {
      var cp = HB.currentPath();
      if (cp === '/home' || cp === '/') {
        var main = document.getElementById('main');
        if (main) renderHome(main);
      }
    });
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return iso; }
  }
})();
