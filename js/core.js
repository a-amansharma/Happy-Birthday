/* ============================================================
   CORE — state, storage, router, toasts, audio, background
   Global namespace: window.HB
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'ourLittleWorld_v1';

  var DEFAULT_STATE = {
    onboarded: false,
    profile: {
      name: '',
      partner: '',
      age: '',
      partnerAge: '',
      relationship: '',
      vibes: [],
      chatStyle: [],
      story: '',
      theme: 'milk',
      togetherSince: ''
    },
    chatHistory: [],
    loveNotes: [],
    dailyAnswers: [],
    memories: [],
    specialDates: [],
    settings: {
      music: false,
      notifications: true,
      privacy: true
    }
  };

  function loadState() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return deepCopy(DEFAULT_STATE);
      var parsed = JSON.parse(raw);
      var merged = deepCopy(DEFAULT_STATE);
      deepMerge(merged, parsed);
      return merged;
    } catch (e) {
      return deepCopy(DEFAULT_STATE);
    }
  }

  function deepCopy(o) { return JSON.parse(JSON.stringify(o)); }
  function deepMerge(base, extra) {
    for (var k in extra) {
      var v = extra[k];
      if (v == null) continue; /* keep the default for missing/null values */
      if (v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])) {
        deepMerge(base[k], v);
      } else {
        base[k] = v;
      }
    }
    return base;
  }

  var HB = window.HB = window.HB || {};

  HB.state = loadState();

  HB.save = function () {
    try { localStorage.setItem(KEY, JSON.stringify(HB.state)); } catch (e) {}
  };

  HB.uid = function () {
    return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  };

  HB.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  /* Pascal-case a string: the first letter of every word becomes a capital,
     everything else is lowercase. A new word starts after whitespace or a
     sentence-ending . ! ? — so "hiii. hello" → "Hiii. Hello" and "HELLO" → "Hello".
     Pass initialCap=false to start mid-word (used to keep the caret in place). */
  HB.titleCase = function (str, initialCap) {
    if (str == null) return '';
    str = String(str);
    var out = '';
    var cap = initialCap === false ? false : true;
    for (var i = 0; i < str.length; i++) {
      var ch = str.charAt(i);
      if (ch === '.' || ch === '!' || ch === '?' || ch === '\n' || /\s/.test(ch)) {
        out += ch;
        cap = true;
      } else {
        out += cap ? ch.toUpperCase() : ch.toLowerCase();
        cap = false;
      }
    }
    return out;
  };

  /* Live auto-capitalization for text inputs: reformats on every keystroke while
     keeping the caret where the user is typing (re-case before and after caret). */
  HB.titleCaseInput = function (input) {
    if (!input) return;
    var sel = input.selectionStart || 0;
    var end = input.selectionEnd == null ? sel : input.selectionEnd;
    var raw = input.value;
    var before = HB.titleCase(raw.slice(0, sel));
    var last = before.charAt(before.length - 1);
    var after = HB.titleCase(raw.slice(end), /[.!?\s\n]/.test(last));
    var middle = raw.slice(sel, end);
    input.value = before + middle + after;
    var pos = before.length + middle.length;
    try { input.setSelectionRange(pos, pos); } catch (e) {}
  };

  HB.couple = function () {
    var p = HB.state.profile;
    if (p.name && p.partner) return HB.titleCase(p.name) + ' ♡ ' + HB.titleCase(p.partner);
    if (p.name) return HB.titleCase(p.name);
    return 'You two';
  };

  HB.firstNames = function () {
    var p = HB.state.profile;
    return { me: p.name ? HB.titleCase(p.name) : 'you', partner: p.partner ? HB.titleCase(p.partner) : 'your person' };
  };

  /* ---------------- Router (clean URLs via the History API) ----------------
     No more #/ hashes. Every route is a plain pathname under the app's base:
       GitHub Pages  → https://a-amansharma.github.io/Happy-Birthday/settings
       local/root    → https://localhost:PORT/settings
     The base is auto-detected (GitHub Pages project sites live in a subfolder),
     so the exact same code runs in both places. Back/forward use popstate;
     in-app navigation uses history.pushState — nothing ever reloads the page. */
  var ROUTE_NAMES = ['home', 'chat', 'notes', 'daily', 'memories', 'quiz', 'dates', 'special', 'partner', 'settings', 'onboarding', 'chatinfo', 'companion', 'more'];

  function detectBase() {
    var raw = window.location.pathname || '/';
    var p = raw.replace(/\/+$/, '');
    if (p === '') return '';
    var slash = p.lastIndexOf('/');
    var seg = p.substring(slash + 1);
    /* currently on a route (e.g. /Happy-Birthday/settings) → base is the prefix */
    if (ROUTE_NAMES.indexOf(seg) !== -1) {
      return p.substring(0, slash).replace(/\/+$/, '') || '';
    }
    if (seg === 'index.html') return p.substring(0, slash);
    /* not a route → we're at the app root itself (e.g. /Happy-Birthday) */
    return p;
  }

  HB.base = detectBase();

  /* The current route path (e.g. '/settings'), independent of the base. */
  HB.currentPath = function () {
    var p = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    var b = HB.base;
    if (b && p.indexOf(b) === 0) p = p.substring(b.length);
    p = p.replace(/\/+$/, '') || '/';
    return p;
  };

  var routes = {};
  var current = '';

  HB.route = function (path, render) { routes[path] = render; };

  HB.navigate = function (path, opts) {
    if (HB.currentPath() === path) {
      render();
    } else {
      window.history.pushState({}, '', HB.base + (path === '/' ? '/' : path));
      render();
    }
    if (opts && opts.scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  var renderTimer = null;

  function paint(main, path) {
    main.innerHTML = '';
    try {
      routes[path](main);
    } catch (e) {
      if (window.console) console.error('route render error:', path, e);
      var detail = 'Something unexpected happened on this screen.';
      if (e && e.message) {
        detail = String(e.message).replace(/^Error: /, '');
        if (detail.length > 90) detail = detail.slice(0, 90) + '…';
      }
      main.innerHTML = '<div class="page"><div class="section-title"><h3>Oops…</h3><span class="hand">something went wrong</span></div>' +
        '<p class="muted" style="font-size:12.5px;max-width:420px;margin:10px auto">' + HB.esc(detail) + '</p>' +
        '<button class="btn btn-soft btn-lg" onclick="HB.navigate(&#39;/home&#39;)">Go home ♡</button></div>';
    }
    HB.updateNav();
    window.scrollTo(0, 0);
    main.classList.remove('bb-leave');
    main.classList.add('bb-enter');
  }

  function render() {
    var path = HB.currentPath();
    if (!routes[path]) path = '/';
    current = path;
    var main = document.getElementById('main');
    if (!main) return;
    var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (renderTimer) { clearTimeout(renderTimer); renderTimer = null; }
    if (reduced || main.childElementCount === 0) {
      paint(main, path);
    } else {
      main.classList.remove('bb-enter');
      main.classList.add('bb-leave');
      renderTimer = setTimeout(function () {
        renderTimer = null;
        paint(main, path);
      }, 170);
    }
  }

  window.addEventListener('popstate', render);

  HB.updateNav = function () {
    var navItems = [
      { path: '/', icon: HB.icon('home'), label: 'Home' },
      { path: '/chat', icon: HB.icon('chat'), label: 'Chat', badge: '/chat' },
      { path: '/notes', icon: HB.icon('note'), label: 'Love Notes' },
      { path: '/daily', icon: HB.icon('sun'), label: 'Daily Question' },
      { path: '/memories', icon: HB.icon('camera'), label: 'Memories' },
      { path: '/quiz', icon: HB.icon('dice'), label: 'Couple Quiz' },
      { path: '/dates', icon: HB.icon('calendar'), label: 'Date Ideas' },
      { path: '/special', icon: HB.icon('heart'), label: 'Special Dates' },
      { path: '/partner', icon: HB.icon('sparkle'), label: 'Partner' },
      { path: '/settings', icon: HB.icon('gear'), label: 'Settings' }
    ];
    var sb = document.getElementById('sidebar');
    var bn = document.getElementById('bottom-nav');

    var logo = '<div class="sidebar-logo">' + (HB.chars && HB.chars.avatarImg ? HB.chars.avatarImg('bubu', 'cute', 'side-logo') : HB.bearMiniSVG()) +
      '<div><div class="logo-text">Our Little World</div><div class="logo-sub">' + HB.esc(HB.couple()) + '</div></div></div>';

    var items = navItems.map(function (n) {
      var active = current === n.path ? ' active' : '';
      var badge = n.badge
        ? '<i class="nav-badge' + ((HB.unreadCounts[n.badge] || 0) > 0 ? ' show' : '') + '" data-badge="' + n.badge + '">' + HB.badgeText(n.badge) + '</i>'
        : '';
      return '<button class="nav-item' + active + '" data-path="' + n.path + '">' + n.icon + '<span>' + n.label + '</span>' + badge + '</button>';
    }).join('');

    var footer = '<div class="sidebar-footer"><div class="sf-name">' + HB.esc(HB.couple()) + '</div>' +
      '<div class="sf-sub">made with ♡, just for you two</div></div>';

    sb.innerHTML = logo + items + footer;

    function bnItemHtml(n, path) {
      var active = current === path ? ' active' : '';
      var badge = n.badge
        ? '<i class="nav-badge' + ((HB.unreadCounts[n.badge] || 0) > 0 ? ' show' : '') + '" data-badge="' + n.badge + '">' + HB.badgeText(n.badge) + '</i>'
        : '';
      return '<button class="bn-item' + active + '" data-path="' + path + '">' +
        '<span class="bn-icon-wrap"><span class="bn-icon">' + n.icon + badge + '</span></span>' +
        '<span class="bn-label">' + n.label + '</span></button>';
    }

    var bnItems = navItems.slice(0, 5).map(function (n) { return bnItemHtml(n, n.path); }).join('') +
      bnItemHtml({ icon: HB.icon('more'), label: 'More' }, '/more');
    bn.innerHTML = '<nav class="bn-inner">' + bnItems + '</nav>';

    sb.querySelectorAll('.nav-item').forEach(function (el) {
      el.addEventListener('click', function () { HB.navigate(el.dataset.path); });
    });
    bn.querySelectorAll('[data-path]').forEach(function (el) {
      el.addEventListener('click', function () { HB.navigate(el.dataset.path); });
    });

    document.body.className = document.body.className.replace(/theme-[a-z]+/, '').trim();
    document.body.classList.add('theme-' + (HB.state.profile.theme || 'milk'));
  };

  /* Unread badges (used by realtime couple chat) */
  HB.unreadCounts = {};
  HB.badgeText = function (path) {
    var n = HB.unreadCounts[path] || 0;
    return n > 9 ? '9+' : n;
  };
  HB.setUnread = function (path, count) {
    HB.unreadCounts[path] = count || 0;
    var els = document.querySelectorAll('[data-badge="' + path + '"]');
    if (!els.length) { HB.updateNav(); return; }
    els.forEach(function (el) {
      if (count > 0) { el.textContent = HB.badgeText(path); el.classList.add('show'); }
      else { el.classList.remove('show'); }
    });
  };

  /* Mobile "more" menu */
  HB.route('/more', function (main) {
    var pages = [
      ['notes', 'Love Notes', '♡'], ['daily', 'Daily Question', '☀'], ['memories', 'Memories', '📸'],
      ['quiz', 'Couple Quiz', '🎲'], ['dates', 'Date Ideas', '🌙'], ['special', 'Special Dates', '⏳'],
      ['partner', 'Partner', '💞'], ['settings', 'Settings', '⚙']
    ];
    var cards = pages.map(function (p) {
      return '<button class="card card-hover dash-tile" data-path="/' + p[0] + '"><div class="dt-icon">' + p[2] + '</div><div class="dt-title">' + p[1] + '</div><div class="dt-go">Open →</div></button>';
    }).join('');
    main.innerHTML = '<div class="page"><div class="section-title"><h3>Everything</h3><span class="hand">all your little things</span></div><div class="dash-grid">' + cards + '</div></div>';
    main.querySelectorAll('[data-path]').forEach(function (el) {
      el.addEventListener('click', function () { HB.navigate(el.dataset.path); });
    });
  });

  /* ---------------- Toasts ---------------- */
  HB.toast = function (msg, emoji) {
    var box = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast';
    el.innerHTML = (emoji ? '<span class="t-emoji">' + emoji + '</span>' : '') + '<span>' + HB.esc(msg) + '</span>';
    box.appendChild(el);
    setTimeout(function () {
      el.classList.add('out');
      setTimeout(function () { el.remove(); }, 400);
    }, 2800);
  };

  /* ---------------- Modal ---------------- */
  HB.modal = function (opts) {
    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML =
      '<div class="modal" role="dialog">' +
      '<button class="modal-close" data-close>✕</button>' +
      '<div class="modal-title">' + HB.esc(opts.title) + '</div>' +
      (opts.text ? '<div class="modal-text">' + opts.text + '</div>' : '') +
      '<div class="modal-body">' + (opts.body || '') + '</div>' +
      '<div class="modal-actions"></div>' +
      '</div>';
    var actions = overlay.querySelector('.modal-actions');
    (opts.actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'btn ' + (a.kind || 'btn-soft') + ' btn-sm';
      b.textContent = a.label;
      b.addEventListener('click', function () {
        var res = a.onClick ? a.onClick(overlay) : true;
        if (res !== false) close();
      });
      actions.appendChild(b);
    });
    function close() {
      overlay.style.animation = 'fadeUp 0.25s reverse var(--ease)';
      setTimeout(function () { overlay.remove(); }, 250);
    }
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('[data-close]')) close();
    });
    document.body.appendChild(overlay);
    return overlay;
  };

  HB.confirm = function (title, text, onYes, yesLabel) {
    HB.modal({
      title: title,
      text: text,
      actions: [
        { label: 'Cancel', kind: 'btn-ghost' },
        { label: yesLabel || 'Yes, do it', kind: 'btn-danger', onClick: function (ov) { onYes(ov); return false; } }
      ]
    });
  };

  /* ---------------- Particles (hearts confetti) ---------------- */
  var canvas, ctx, parts = [], raf = null;

  function setupCanvas() {
    canvas = document.getElementById('particles');
    ctx = canvas.getContext('2d');
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener('resize', resize);
  }

  function spawnParticles(x, y, n) {
    for (var i = 0; i < n; i++) {
      parts.push({
        x: x, y: y,
        vx: (Math.random() - 0.5) * 6,
        vy: -Math.random() * 6 - 2,
        size: 10 + Math.random() * 14,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        life: 1,
        decay: 0.012 + Math.random() * 0.012,
        color: Math.random() > 0.5 ? '#E8A0A8' : '#C89F7B'
      });
    }
    if (!raf) loop();
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    parts = parts.filter(function (p) { return p.life > 0; });
    parts.forEach(function (p) {
      p.x += p.vx; p.y += p.vy; p.vy += 0.12; p.rot += p.vr; p.life -= p.decay;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.font = p.size + 'px serif';
      ctx.fillStyle = p.color;
      ctx.fillText('♥', -p.size / 2, p.size / 2);
      ctx.restore();
    });
    if (parts.length === 0) { cancelAnimationFrame(raf); raf = null; }
  }

  HB.burst = function (x, y, n) { spawnParticles(x, y, n || 18); };

  /* Heart trail on click */
  document.addEventListener('click', function (e) {
    if (e.target.closest('.btn, .nav-item, .bn-item, .dash-tile, .chip')) {
      HB.burst(e.clientX, e.clientY, 8);
    }
  });

  /* ---------------- Smooth romantic background music (Web Audio) ----------------
     A soft, dreamy I–vi–IV–V loop: warm bass, pad, gentle arpeggio + melody.
     No audio files needed — everything is synthesized, so it's tiny and offline-safe. */
  var audioCtx = null, musicGain = null, musicFilter = null, musicTimer = null, musicOn = false;

  var ROMANTIC_BPM = 64;
  var ROMANTIC_CHORDS = [
    { bass: 36, pad: [60, 64, 67, 72] },  // Cmaj7
    { bass: 33, pad: [57, 60, 64, 69] },  // Am7
    { bass: 29, pad: [53, 57, 60, 65] },  // Fmaj7
    { bass: 31, pad: [55, 59, 62, 67] },  // Gsus4
    { bass: 36, pad: [60, 64, 67, 72] },  // Cmaj7
    { bass: 33, pad: [57, 60, 64, 69] },  // Am7
    { bass: 29, pad: [53, 57, 60, 65] },  // Fmaj7
    { bass: 35, pad: [59, 62, 67, 71] }   // G7 → resolves back to C
  ];

  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  function ensureAudio() {
    if (!audioCtx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      audioCtx = new AC();
      musicGain = audioCtx.createGain();
      musicGain.gain.value = 0;
      musicFilter = audioCtx.createBiquadFilter();
      musicFilter.type = 'lowpass';
      musicFilter.frequency.value = 1500;
      musicGain.connect(audioCtx.destination);
      musicFilter.connect(musicGain);
      musicGain.gain.linearRampToValueAtTime(0.15, audioCtx.currentTime + 3);
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
  }

  function tone(midi, when, dur, vol, type) {
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = mtof(midi);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(vol, when + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    osc.connect(g); g.connect(musicFilter);
    osc.start(when); osc.stop(when + dur + 0.05);
  }

  var nextBar = 0, barIndex = 0;

  function playBar(chord, t, barDur) {
    var beat = barDur / 4;
    // warm bass
    tone(chord.bass, t, barDur * 0.95, 0.22, 'sine');
    // soft pad
    chord.pad.forEach(function (m) {
      tone(m, t, barDur * 0.98, 0.05, 'triangle');
    });
    // gentle arpeggio on each beat
    for (var b = 0; b < 4; b++) {
      var note = chord.pad[b % chord.pad.length];
      tone(note + 12, t + beat * b, beat * 0.9, 0.07, 'sine');
      tone(note, t + beat * b + beat / 2, beat * 0.8, 0.032, 'sine');
    }
    // dreamy melody
    tone(chord.pad[3] + 12, t + beat * 1.5, beat * 2.6, 0.075, 'triangle');
    tone(chord.pad[2] + 12, t + beat * 3, beat * 2.2, 0.055, 'triangle');
  }

  function tick() {
    if (!musicOn || !audioCtx) return;
    var barDur = (60 / ROMANTIC_BPM) * 4;
    while (nextBar < audioCtx.currentTime + 1.6) {
      playBar(ROMANTIC_CHORDS[barIndex % ROMANTIC_CHORDS.length], nextBar, barDur);
      barIndex++;
      nextBar += barDur;
    }
  }

  HB.music = {
    toggle: function () {
      ensureAudio();
      musicOn = !musicOn;
      if (musicOn) {
        nextBar = audioCtx.currentTime + 0.1;
        tick();
        musicTimer = setInterval(tick, 400);
      } else {
        clearInterval(musicTimer);
        musicTimer = null;
      }
      HB.state.settings.music = musicOn;
      HB.save();
      var btn = document.getElementById('music-btn');
      if (btn) btn.classList.toggle('playing', musicOn);
      HB.toast(musicOn ? 'Soft romantic music is playing ♡' : 'Music paused — sweet silence ♡', musicOn ? '🎵' : '🌙');
    },
    isOn: function () { return musicOn; }
  };

  /* ---------------- Ambient background ---------------- */
  HB.buildAmbient = function () {
    var starsBox = document.getElementById('bg-stars');
    var floatBox = document.getElementById('bg-floating');
    starsBox.innerHTML = '';
    floatBox.innerHTML = '';
    for (var i = 0; i < 26; i++) {
      var s = document.createElement('span');
      s.className = 'star';
      s.style.left = Math.random() * 100 + '%';
      s.style.top = Math.random() * 100 + '%';
      s.style.animationDelay = (Math.random() * 4) + 's';
      s.style.animationDuration = (3 + Math.random() * 4) + 's';
      s.style.width = s.style.height = (3 + Math.random() * 4) + 'px';
      starsBox.appendChild(s);
    }
    var icons = ['♥', '☆', '🌷', '❁', '♡', '✧', '☁', '🌸'];
    for (var j = 0; j < 16; j++) {
      var f = document.createElement('span');
      f.className = 'floater';
      f.textContent = icons[j % icons.length];
      f.style.left = Math.random() * 96 + '%';
      f.style.fontSize = (12 + Math.random() * 18) + 'px';
      f.style.animationDuration = (14 + Math.random() * 20) + 's';
      f.style.animationDelay = (Math.random() * 14) + 's';
      f.style.setProperty('--fo', (0.25 + Math.random() * 0.4).toFixed(2));
      floatBox.appendChild(f);
    }
  };

  /* ---------------- Icons ---------------- */
  HB.icon = function (name) {
    var I = {
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>',
      chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z"/></svg>',
      note: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
      sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>',
      camera: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>',
      dice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1.1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1.1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1.1" fill="currentColor"/></svg>',
      calendar: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      heart: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
      gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
      more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
      send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/></svg>',
      copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
      refresh: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
      share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
      trash: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
      back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
      sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg>'
    };
    return I[name] || '';
  };

  /* ---------------- Boot ---------------- */
  HB.ready = window.__sbReady || Promise.resolve();
  HB.onReady = function () {};

  HB.boot = function () {
    setupCanvas();
    HB.buildAmbient();

    var btn = document.getElementById('music-btn');
    btn.addEventListener('click', function () { HB.music.toggle(); });

    // Music always starts OFF: the icon shows the muted "slant-cross" state.
    // It only plays after the user taps the button (browsers also require a gesture).
    musicOn = false;
    HB.state.settings.music = false;
    HB.save();
    btn.classList.remove('playing');

    render();

    // After backend is ready (if configured), hand control to the app layer
    HB.ready.then(function () {
      try { HB.onReady(); } catch (e) { if (window.console) console.error(e); }
    });
  };
})();
