/* ============================================================
   DASHBOARD — personalized home + connection status
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
    var bond = connected && HB.rel.bondLabel ? HB.rel.bondLabel() : '';

    var connectCard = '';
    if (window.HB && HB.db && HB.db.configured() && HB.auth && HB.auth.user()) {
      if (connected) {
        connectCard =
          '<button class="card card-hover connect-card" data-path="/partner">' +
            '<div class="cc-scene" data-du></div>' +
            '<div><div class="cc-title">You two are connected ♡</div>' +
            '<div class="cc-sub">' + HB.esc(HB.couple()) + (bond ? ' · ' + HB.esc(bond) : '') + '</div></div>' +
            '<span class="cc-dot on"></span></button>';
      } else {
        var waiting = HB.rel.data.status === 'waiting';
        connectCard =
          '<button class="card card-hover connect-card" data-path="/partner">' +
            '<div class="cc-scene" data-du></div>' +
            '<div><div class="cc-title">' + (waiting ? 'Waiting for your person…' : 'Connect with your person') + '</div>' +
            '<div class="cc-sub">' + (waiting ? 'Share your code or wait for their code.' : 'Open the Partner page to share or enter your code.') + '</div></div>' +
            '<span class="cc-dot"></span></button>';
      }
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

      (connectCard ? '<div class="connect-wrap">' + connectCard + '</div>' : '') +

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
    if (hero) {
      hero.innerHTML = connected ? HB.dudu.scene({ pose: 'hug', duX: 120 }) : HB.dudu.scene({ pose: 'look' });
      HB.dudu.landingSequence(hero);
    }

    var ccScene = main.querySelector('.cc-scene');
    if (ccScene) ccScene.innerHTML = connected ? HB.dudu.scene({ pose: 'together', duX: 112 }) : HB.dudu.scene({ pose: 'wait' });
  }

  HB.renderHome = renderHome;
  HB.route('/home', renderHome);

  /* Keep the home screen in sync (e.g. partner connects while you're here) */
  window.addEventListener('hb:relchange', function () {
    if (location.hash === '#/home' || location.hash === '#/') {
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
