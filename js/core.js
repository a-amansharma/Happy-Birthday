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
      notifications: true
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

  /* First-and-first initials for the couple chip — e.g. Aman & Stuti →
     "AS", and on Stuti's phone "SA". The couple photo replaces this. */
  HB.coupleInitials = function () {
    if (HB.dp && HB.dp.initials) return HB.dp.initials();
    var p = HB.state.profile;
    var m = String(p.name || '').trim().charAt(0) || '';
    var t = String(p.partner || '').trim().charAt(0) || '';
    return ((m + t).toUpperCase()) || '♥';
  };

  HB.firstNames = function () {
    var p = HB.state.profile;
    return { me: p.name ? HB.titleCase(p.name) : 'you', partner: p.partner ? HB.titleCase(p.partner) : 'your person' };
  };

  /* Navigation lock: true when the user is "waiting" — onboarded,
     has a profile with a pairing code, but not yet connected. */
  HB.isWaiting = function () {
    if (!HB.state.onboarded) return false;
    if (HB.rel && HB.rel.data) {
      return HB.rel.data.status === 'waiting';
    }
    return false;
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
    if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
      console.log('[NAVIGATION] navigate:', path, '(current:', HB.currentPath() + ')');
    }
    if (HB.currentPath() === path) {
      render();
    } else {
      window.history.pushState({}, '', HB.base + (path === '/' ? '/' : path));
      render();
    }
    if (opts && opts.scrollTop) window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  function paint(main, path) {
    main.innerHTML = '';
    try {
      routes[path](main);
    } catch (e) {
      if (window.console) console.error('[NAVIGATION] route render error:', path, e);
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
    if (HB.presence && HB.presence.syncActive) HB.presence.syncActive();
    window.scrollTo(0, 0);
    main.classList.remove('bb-leave');
    main.classList.add('bb-enter');
  }

  function render() {
    var path = HB.currentPath();
    if (!routes[path]) path = '/';
    current = path;

    /* Navigation lock: when Person 1 is waiting (has pairing code
       but not connected), all pages except /, /home, /settings,
       and /partner redirect to the waiting screen. */
    if (HB.isWaiting && HB.isWaiting() && path !== '/' && path !== '/settings' && path !== '/home' && path !== '/partner') {
      current = '/home';
      path = '/home';
    }

    var main = document.getElementById('main');
    if (!main) return;
    paint(main, path);
  }

  window.addEventListener('popstate', render);

  HB.updateNav = function () {
    var navItems = [
      { path: '/', icon: HB.icon('home'), label: 'Home' },
      { path: '/chat', icon: HB.icon('chat'), label: 'Chat', badge: '/chat' },
      { path: '/notes', icon: HB.icon('note'), label: 'Love Notes', short: 'Notes' },
      { path: '/daily', icon: HB.icon('sun'), label: 'Daily Question', short: 'Daily' },
      { path: '/memories', icon: HB.icon('camera'), label: 'Memories', short: 'Memories' },
      { path: '/quiz', icon: HB.icon('dice'), label: 'Couple Quiz', short: 'Quiz' },
      { path: '/dates', icon: HB.icon('calendar'), label: 'Date Ideas', short: 'Ideas' },
      { path: '/special', icon: HB.icon('heart'), label: 'Special Dates', short: 'Special' },
      { path: '/partner', icon: HB.icon('sparkle'), label: 'Partner', short: 'Partner' },
      { path: '/settings', icon: HB.icon('gear'), label: 'Settings', short: 'Settings' }
    ];

    /* Determine which nav path is active. We match the current route
       against each nav item's path. For the root "/" we also accept
       "/home" as equivalent. */
    var activePath = current;
    if (activePath === '/home') activePath = '/';
    /* Also handle "/more" on mobile — no single sidebar item for it */
    if (activePath === '/more') activePath = null;

    var sb = document.getElementById('sidebar');
    var bn = document.getElementById('bottom-nav');

    var duoInner = (HB.dp && HB.dp.duo)
      ? HB.dp.duo()
      : '<span class="duo-cluster"><span class="duo-ring duo-top"><span class="duo-let">♥</span></span><span class="duo-ring duo-bot"><span class="duo-let">♥</span></span></span>';
    var logo = '<div class="sidebar-logo"><div class="duo-dp" data-duo-dp title="' +
      'You two — change either of your little pictures">' + duoInner +
      '</div><div><div class="logo-text">Our Little World</div><div class="logo-sub">' + HB.esc(HB.couple()) + '</div></div></div>';

    var items = navItems.map(function (n) {
      var active = activePath === n.path ? ' active' : '';
      var badge = n.badge
        ? '<i class="nav-badge' + ((HB.unreadCounts[n.badge] || 0) > 0 ? ' show' : '') + '" data-badge="' + n.badge + '">' + HB.badgeText(n.badge) + '</i>'
        : '';
      return '<button class="nav-item' + active + '" data-path="' + n.path + '">' + n.icon + '<span>' + n.label + '</span>' + badge + '</button>';
    }).join('');

    var footer = '<div class="sidebar-footer"><div class="sf-name">' + HB.esc(HB.couple()) + '</div>' +
      '<div class="sf-sub">made with ♡, just for you two</div></div>';

    sb.innerHTML = logo + items + footer;

    /* Duo circles: tap the TOP circle to set/change MY photo, the LOWER
       one to set/change my partner's photo. Each circle that already has
       a photo opens a big preview with Change + Delete actions; deleting
       brings the first-letter initial back. Both photos auto-sync to the
       correct person on BOTH phones everywhere. */
    (function () {
      var duo = sb.querySelector('[data-duo-dp]');
      if (!duo || !HB.dp) return;
      var act = function (who, originEl) {
        var isMe = who !== 'them';
        var photo = isMe ? HB.dp.myPhoto() : HB.dp.partnerPhoto();
        var setFn = isMe ? HB.dp.setMy : HB.dp.setPartner;
        var clearFn = isMe ? HB.dp.clearMy : HB.dp.clearPartner;
        var pickAndSet = function () {
          HB.dp.pick().then(function (out) {
            if (out && out.error) { if (HB.toast) HB.toast('That photo couldn\'t load — try another ♡', HB.icon('image')); return; }
            if (!out || !out.dataUrl) return;
            setFn(out.dataUrl).then(function (res) {
              if (res && res.error) { if (HB.toast) HB.toast('Couldn\'t sync to your person — try again ♡', HB.icon('image')); return; }
              if (HB.toast) HB.toast((isMe ? 'Your photo is set ♡' : (HB.firstNames().partner + '\'s photo is set ♡')), HB.icon('image'));
            });
          });
        };
        var doDelete = function () {
          if (!HB.confirm) return clearFn().then(function (res) { if (HB.toast) HB.toast((isMe ? 'Your photo removed — initials back ♡' : (HB.firstNames().partner + '\'s photo removed — initials back ♡')), HB.icon('trash')); });
          HB.confirm(
            (isMe ? 'Your photo' : HB.firstNames().partner + '\'s photo'),
            'Remove the picture? Your first letter will show again ♡',
            function (ov) {
              clearFn().then(function (res) {
                if (HB.toast) HB.toast((isMe ? 'Your photo removed — initials back ♡' : (HB.firstNames().partner + '\'s photo removed — initials back ♡')), HB.icon('trash'));
              });
            },
            'Delete photo'
          );
        };
        if (photo) { HB.dp.preview(photo, pickAndSet, doDelete, originEl); }
        else pickAndSet();
      };
      duo.addEventListener('click', function (e) {
        var ring = e.target && e.target.closest ? e.target.closest('[data-duo]') : null;
        act(ring ? ring.getAttribute('data-duo') : 'me', ring);
      });
    })();

    function bnItemHtml(n, path, label) {
      var active = activePath === path ? ' active' : '';
      var badge = n.badge
        ? '<i class="nav-badge' + ((HB.unreadCounts[n.badge] || 0) > 0 ? ' show' : '') + '" data-badge="' + n.badge + '">' + HB.badgeText(n.badge) + '</i>'
        : '';
      return '<button class="bn-item' + active + '" data-path="' + path + '">' +
        '<span class="bn-icon-wrap"><span class="bn-icon">' + n.icon + badge + '</span></span>' +
        '<span class="bn-label">' + (label || n.label) + '</span></button>';
    }

    var bnItems = navItems.slice(0, 5).map(function (n) { return bnItemHtml(n, n.path, n.short || n.label); }).join('') +
      bnItemHtml({ icon: HB.icon('more'), label: 'More' }, '/more', 'More');
    bn.innerHTML = '<nav class="bn-inner">' + bnItems + '</nav>';

    sb.querySelectorAll('.nav-item').forEach(function (el) {
      el.addEventListener('click', function () { HB.navigate(el.dataset.path); });
    });
    bn.querySelectorAll('[data-path]').forEach(function (el) {
      el.addEventListener('click', function () { HB.navigate(el.dataset.path); });
    });

    document.body.className = document.body.className.replace(/theme-[a-z]+/, '').trim();
    document.body.classList.add('theme-' + (HB.state.profile.theme || 'milk'));

    if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
      console.log('[NAVIGATION] updateNav → activePath:', activePath, 'current:', current);
    }
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
      ['notes', 'Love Notes', HB.icon('note')], ['daily', 'Daily Question', HB.icon('sun')], ['memories', 'Memories', HB.icon('image')],
      ['quiz', 'Couple Quiz', HB.icon('dice')], ['dates', 'Date Ideas', HB.icon('sparkle')], ['special', 'Special Dates', HB.icon('clock')],
      ['partner', 'Partner', HB.icon('heart')], ['settings', 'Settings', HB.icon('gear')]
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
    function close() {
      if (overlay.parentNode) overlay.remove();
    }
    (opts.actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.className = 'btn ' + (a.kind || 'btn-soft') + ' btn-sm';
      b.textContent = a.label;
      b.addEventListener('click', function (e) {
        if (e && e.stopPropagation) e.stopPropagation();
        /* Run the action, then auto-close the box. Only an explicit
           `return false` keeps it open (e.g. a validatable form that
           wants the user to fix input before closing). */
        var res = a.onClick ? a.onClick(overlay) : true;
        if (res !== false) close();
      });
      actions.appendChild(b);
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || (e.target && e.target.closest && e.target.closest('[data-close]'))) close();
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
        { label: yesLabel || 'Yes, do it', kind: 'btn-danger', onClick: function (ov) {
          /* Run the action, then ALWAYS auto-close immediately unless the
             action explicitly returns false to keep the dialog open. */
          var keep = onYes ? onYes(ov) : true;
          return keep;
        } }
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

  /* ---------------- Loading placeholder ---------------- */
  HB.loading = function (main, msg) {
    if (!main) return;
    main.innerHTML =
      '<div class="page"><div class="connect-center" style="padding-top:10vh">' +
      '<div class="typing"><i></i><i></i><i></i></div>' +
      '<p class="wizard-step-hint" style="margin-top:10px">' + HB.esc(msg || 'Loading your little world…') + '</p>' +
      '</div></div>';
  };

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
      HB.toast(musicOn ? 'Soft romantic music is playing ♡' : 'Music paused — sweet silence ♡', musicOn ? HB.icon('music') : HB.icon('moon'));
    },
    isOn: function () { return musicOn; },
    /* Silent stop used by the account-reset flows — no toast, no save. */
    stop: function () {
      if (!musicOn) return;
      musicOn = false;
      clearInterval(musicTimer);
      musicTimer = null;
      var btn = document.getElementById('music-btn');
      if (btn) btn.classList.remove('playing');
    }
  };

  /* ---------------- Ambient background ----------------
     Kept as a static visual only: the background beauty comes from
     CSS gradients/blobs. We deliberately create NO animated floating
     elements here — 40+ continuously-animated DOM nodes (stars,
     floaters) were a real performance cost on low-end phones. */
  HB.buildAmbient = function () {
    var starsBox = document.getElementById('bg-stars');
    var floatBox = document.getElementById('bg-floating');
    if (starsBox) starsBox.innerHTML = '';
    if (floatBox) floatBox.innerHTML = '';
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
      sparkle: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9z"/></svg>',
      smile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>',
      image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>',
      link: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
      chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>',
      pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>',
      bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
      palette: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" stroke="none"/><circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" stroke="none"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.65-.75 1.65-1.69 0-.44-.18-.84-.44-1.13-.29-.29-.44-.65-.44-1.12 0-.92.75-1.67 1.67-1.67h2c3.05 0 5.56-2.5 5.56-5.55C21.97 6.01 17.46 2 12 2z"/></svg>',
      save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>',
      gift: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="8" width="18" height="4"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5"/></svg>',
      balloon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a7 7 0 0 1 7 7c0 3-2 5-2 5H7s-2-2-2-5a7 7 0 0 1 7-7z"/><path d="M12 15v4"/><path d="M8 20h8"/></svg>',
      bot: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="12" rx="4"/><path d="M12 4v4"/><circle cx="12" cy="3" r="1"/><path d="M8 13h.01"/><path d="M16 13h.01"/><path d="M9 17h6"/></svg>',
      moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
      coffee: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>',
      music: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>',
      users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>',
      sprout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20v-9"/><path d="M12 11a5 5 0 0 0-5-5c-2 0-4 1-4 3s2 3 4 3h5z"/><path d="M12 11a5 5 0 0 1 5-5c2 0 4 1 4 3s-2 3-4 3h-5z"/><path d="M3 20h18"/></svg>',
      ring: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 3h12l4 6-10 12L2 9z"/><path d="M2 9h20"/><path d="M12 21V3"/></svg>',
      cloud: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>',
      droplet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>',
      waves: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 6c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>',
      mountain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3l4 8 5-5 5 15H2L8 3z"/></svg>',
      shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
      leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
      flower: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c-4 0-7-2.5-7-7 0-4 4-6 7-9 3 3 7 5 7 9 0 4.5-3 7-7 7z"/><path d="M12 22v-9"/><path d="M12 6V3"/></svg>',
      cake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V10h14v11"/><path d="M7 10V7h10v3"/><path d="M12 6V3"/></svg>',
      flame: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
      compass: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z"/></svg>',
      mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
      building: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/></svg>',
      rain: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 16.58A5 5 0 0 0 18 7h-1.26A8 8 0 1 0 4 15.25"/><path d="M8 14l-2 3"/><path d="M12 14l-2 3"/><path d="M16 14l-2 3"/></svg>',
      help: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
      couch: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 11V9a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2"/><path d="M20 11a2 2 0 0 1 2 2v4H2v-4a2 2 0 0 1 4 0v1h12v-1a2 2 0 0 1 2 0z"/><path d="M5 19v1M19 19v1"/></svg>',
      glasses: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="15" r="4"/><circle cx="18" cy="15" r="4"/><path d="M10 15h4"/><path d="M2 15v-2a3 3 0 0 1 3-3h1"/><path d="M22 15v-2a3 3 0 0 0-3-3h-1"/></svg>',
      package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8v8a2 2 0 0 1-1 1.73l-7 4a2 2 0 0 1-2 0l-7-4A2 2 0 0 1 3 16V8a2 2 0 0 1 1-1.73l7-4a2 2 0 0 1 2 0l7 4A2 2 0 0 1 21 8z"/><path d="M3.3 7l8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
      bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12l1.2 7H4.8z"/><path d="M4.8 9h14.4l-.8 11a2 2 0 0 1-2 2H6.6a2 2 0 0 1-2-2z"/></svg>',
      wallet: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/></svg>',
      tag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>'
    };
    return I[name] || '';
  };

  /* ---------------- Mobile viewport + keyboard ----------------
     * `--vv-h` tracks the real visible viewport height (visualViewport
       px) — some phone browsers don't support `dvh`, so CSS falls back
       to this pixel value. This keeps the bottom nav + chat typing box
       visible even when the address bar hides.
     * While the phone keyboard is up (`kb-open` on <body>): the bottom
       nav hides, and the chat page sizes itself to the keyboard-reduced
       height with the document scroll LOCKED (`kb-lock` on <html> +
       <body>). Locking the document scroll is what stops the browser
       from scrolling the whole page up when the box is focused — the
       typing box simply sits at the bottom of the (now shorter) chat
       page, i.e. exactly on top of the keyboard. Non-chat pages keep
       their full height and let the browser scroll the input into view
       natively. */
  (function () {
    var vv = window.visualViewport;
    var root = document.documentElement;
    var mq = window.matchMedia ? window.matchMedia('(max-width: 860px)') : null;
    var fullH = 0;
    var lastChat = false;

    function focusedField() {
      var el = document.activeElement;
      return !!(el && el.tagName && /^(INPUT|TEXTAREA)$/i.test(el.tagName));
    }

    function vHeight() {
      return (vv && vv.height) ? Math.round(vv.height) : (window.innerHeight || 0);
    }

    function chatPage() {
      return !!(document.querySelector && document.querySelector('.chat-page'));
    }

    /* Set --vv-h to a px height. When a chat page is focused this is the
       keyboard-reduced visual height so the input rests above the keys;
       otherwise it's the full (keyboard-closed) height. */
    function setVh(useChat) {
      var h = useChat ? vHeight() : (fullH || vHeight());
      if (h) root.style.setProperty('--vv-h', h + 'px');
    }

    function sync() {
      var h = vHeight();
      var on = false;
      if (mq && mq.matches) {
        /* Keyboard is (or should be treated as) open when the visual
           viewport shrank, or while a text field is focused on a phone.
           Keeping focus = keyboard open matches how users expect the
           chat box to behave (keys stay up until they touch the feed). */
        var ih = window.innerHeight || 0;
        var reduced = !!(vv && vv.height && vv.height < ih - 160);
        on = reduced || focusedField();
      }

      var chat = on && chatPage();
      if (!on) fullH = h; /* remember the full height for later */

      document.body.classList.toggle('kb-open', on);
      root.classList.toggle('kb-lock', chat);
      document.body.classList.toggle('kb-lock', chat);
      setVh(chat);
      lastChat = chat;

      if (on && chat && window.scrollY) {
        try { window.scrollTo(0, 0); } catch (e) {}
      }
      return on;
    }

    if (vv) { vv.addEventListener('resize', function () { sync(); }); vv.addEventListener('scroll', function () { sync(); }); }
    window.addEventListener('resize', function () { sync(); });
    window.addEventListener('orientationchange', function () { setTimeout(function () { sync(); }, 150); });
    document.addEventListener('focusin', function (e) {
      /* Sync synchronously on focus so the layout + scroll-lock are in
         place BEFORE the browser's default "scroll focused element into
         view" runs — this is what prevents the whole page from jumping
         up and banishing the typing box to the top. */
      sync();
      if (!mq || !mq.matches) return;
      var el = e.target;
      if (!el || !el.tagName || !/^(INPUT|TEXTAREA)$/i.test(el.tagName)) return;
      if ((lastChat || chatPage()) && typeof el.scrollIntoView === 'function') {
        /* Backstop: after the keyboard animation, realign the box to the
           bottom edge (exactly on top of the keys) in case the webview
           still shifted it. No-op when the webview already keeps it
           flush. */
        setTimeout(function () {
          try { el.scrollIntoView({ block: 'end', behavior: 'instant' }); } catch (e) { try { el.scrollIntoView(); } catch (e2) {} }
        }, 260);
      }
    });
    document.addEventListener('focusout', function () { setTimeout(function () { sync(); }, 180); });
    window.addEventListener('load', sync);
    sync();
  })();

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
