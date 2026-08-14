/* ============================================================
   APP — boot the little world, connect the cloud
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB;

  var backendReady = false;

  function initBackend() {
    if (backendReady || !HB.db || !HB.db.configured()) return;
    backendReady = true;

    HB.rel.init().then(function () {
      if (HB.rel.data.status === 'connected') {
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
    });
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
