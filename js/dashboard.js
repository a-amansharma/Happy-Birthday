/* ============================================================
   DASHBOARD — personalized home
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var TILES = [
    { path: '/chat', icon: '💬', title: 'Talk to Us', sub: 'Your little companion is waiting', accent: '#F8BBD0' },
    { path: '/chat', icon: '💞', title: 'Ask About Us', sub: 'Answer & plans for two', accent: '#FFD3B6' },
    { path: '/memories', icon: '📸', title: 'Our Memories', sub: 'Your favorite moments', accent: '#F9C9A4' },
    { path: '/notes', icon: '💌', title: 'Love Notes', sub: 'Little things worth saying', accent: '#F5B7C6' },
    { path: '/daily', icon: '☀️', title: 'Daily Question', sub: 'One sweet question a day', accent: '#FFE5A3' },
    { path: '/quiz', icon: '🎲', title: 'Relationship Quiz', sub: 'Playful, never serious', accent: '#D8C6F5' },
    { path: '/dates', icon: '🎈', title: 'Fun Together', sub: 'Personalized date ideas', accent: '#A7E0C3' },
    { path: '/special', icon: '⏳', title: 'Special Dates', sub: 'Your love timer & countdowns', accent: '#F5C6D0' },
    { path: '/settings', icon: '⚙️', title: 'Settings', sub: 'Tune your little world', accent: '#BFC9E8' }
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
    var ages = '';
    if (p.age && p.partnerAge) ages = '<div class="rh-ages">' + HB.esc(p.age) + ' & ' + HB.esc(p.partnerAge) + ' — a sweet little duo ♡</div>';
    else if (p.age) ages = '<div class="rh-ages">' + HB.esc(p.age) + ' years of you ♡</div>';

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
        '<div class="rh-bears">' + HB.bearCoupleSVG() + '</div>' +
        '<div class="rh-main">' +
          '<h2>' + HB.esc(HB.couple()) + '</h2>' +
          (p.relationship ? '<div class="rh-tags">' + tags + '</div>' : '') +
          (ages || '') +
          (p.togetherSince ? '<div class="rh-ages">Together since ' + HB.esc(formatDate(p.togetherSince)) + '</div>' : '') +
        '</div>' +
      '</div>' +

      '<div class="section-title"><h3>Quick actions</h3><span class="hand">pick your little adventure</span></div>' +
      '<div class="dash-grid">' + tiles + '</div>' +
      '</div>';

    main.querySelectorAll('[data-path]').forEach(function (el) {
      el.addEventListener('click', function () { HB.navigate(el.dataset.path); });
    });

    // "Talk to us" & "Ask about us" both go to chat, second one triggers relationship intro
    main.querySelectorAll('.dash-tile')[1] && main.querySelectorAll('.dash-tile')[1].addEventListener('click', function () {
      setTimeout(function () {
        HB.state.chatPendingIntent = 'relationship';
        HB.save();
      }, 50);
    });
  }

  HB.renderHome = renderHome;
  HB.route('/home', renderHome);

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    } catch (e) { return iso; }
  }
})();
