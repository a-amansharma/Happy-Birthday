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

  /* From the landing page: after signing in, open the world */
  HB.enterWorld = function () {
    if (!HB.db || !HB.db.configured()) { HB.navigate('/home'); return; }
    if (HB.rel.data.status === 'connected') { HB.navigate('/home'); return; }
    HB.rel.init().then(function () {
      HB.navigate('/home');
    });
  };

  HB.onReady = initBackend;

  function boot() {
    // Default route
    if (!location.hash) {
      history.replaceState(null, '', '#/' + (HB.state.onboarded ? 'home' : ''));
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
