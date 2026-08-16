/* ============================================================
   APP — boot the little world, connect the cloud
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB;

  var backendReady = false;
  var wiredChat = false;

  /* Couple chat + presence only need to be wired ONCE per app load —
     but only once we're actually connected (covers late waiting→
     connected transitions too). */
  function wireChat() {
    if (wiredChat) return;
    if (HB.rel.data.status !== 'connected') return;
    wiredChat = true;
    if (HB.chat) {
      HB.chat.onChange = function () {
        HB.setUnread('/chat', HB.chat.unreadCount());
      };
      HB.chat.load().then(function () {
        HB.setUnread('/chat', HB.chat.unreadCount());
      });
      HB.chat.subscribe();
    }
    if (HB.presence) HB.presence.start();
  }

  function initBackend() {
    if (backendReady || !HB.db || !HB.db.configured()) return;
    backendReady = true;

    window.addEventListener('hb:relchange', function () { wireChat(); });
    window.addEventListener('online', function () {
      if (HB.auth && HB.auth.user()) HB.toast('You\'re back online — everything is synced ♡', '📡');
    });
    window.addEventListener('offline', function () {
      if (HB.auth && HB.auth.user()) HB.toast('You\'re offline — messages will send when you\'re back ♡', '🌙');
    });

    HB.rel.init().then(function () { wireChat(); });
  }

  /* From the landing page: after signing in / pairing, open the world.
     A person who joined via a pairing code never went through the setup
     wizard, so mark them onboarded here instead of bouncing them back. */
  HB.enterWorld = function () {
    var openHome = function () {
      if (!HB.state.onboarded) { HB.state.onboarded = true; HB.save(); }
      HB.navigate('/home');
    };
    if (!HB.db || !HB.db.configured()) { openHome(); return; }
    if (HB.rel.data.status === 'connected') { openHome(); return; }
    HB.rel.init().then(openHome);
  };

  HB.onReady = initBackend;

  function boot() {
    // Connection bar (needs the DOM, so boot-time)
    if (HB.net && HB.net.init) HB.net.init();

    /* 1) Migrate legacy #/hash bookmarks to clean URLs once. */
    var h = location.hash || '';
    if (h && h.charAt(1) === '/') {
      var legacy = h.replace(/^#/, '');
      history.replaceState(null, '', HB.base + (legacy === '/' ? '/' : legacy));
    }

    /* 2) GitHub Pages SPA fallback: refreshing /settings serves 404.html,
          which stashes the real path in sessionStorage and reloads the root.
          Restore it here so the browser lands back on the exact page. */
    var stored = null;
    try { stored = sessionStorage.getItem('hb_spa_redirect'); } catch (e) {}
    if (stored) {
      try { sessionStorage.removeItem('hb_spa_redirect'); } catch (e) {}
      var baseOk = HB.base
        ? (stored === HB.base || stored.indexOf(HB.base + '/') === 0)
        : stored.charAt(0) === '/';
      if (baseOk) history.replaceState(null, '', stored);
    }

    /* 3) Default route: onboarded → /home, otherwise the landing page at /. */
    if (HB.currentPath() === '/' && HB.state.onboarded) {
      history.replaceState(null, '', HB.base + '/home');
    }

    HB.boot();

    if (HB.chars && HB.chars.cornerStart) HB.chars.cornerStart();

    // Welcome micro-interaction
    if (!HB.state.onboarded) {
      setTimeout(function () {
        HB.toast('Welcome to your little world ♡', '🐻');
      }, 900);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
