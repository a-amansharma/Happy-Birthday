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

    var connected = HB.rel && HB.rel.data && HB.rel.data.status === 'connected';
    var waiting = HB.rel && HB.rel.data && HB.rel.data.status === 'waiting';

    var waitingBanner = '';
    if (waiting && !connected) {
      waitingBanner =
        '<div class="card" style="text-align:center;padding:18px 22px;border-left:3px solid var(--accent,#c084fc)">' +
          '<p style="margin:0;font-weight:800;color:var(--ink)">Waiting for your person to connect… ♡</p>' +
          '<p style="margin:6px 0 0;font-size:13px;color:var(--ink-soft);font-weight:600">Share your code from the Partner page, or they can enter it on their phone.</p>' +
        '</div>';
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

      waitingBanner +

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

  window.addEventListener('hb:relchange', function () {
    var cp = HB.currentPath();
    if (cp === '/home' || cp === '/') {
      var main = document.getElementById('main');
      if (main) renderHome(main);
    }
  });

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return iso; }
  }
})();
