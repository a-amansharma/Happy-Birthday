/* ============================================================
   SERVICE: NET — real Supabase connection status notifications
   ------------------------------------------------------------
   Tracks actual Supabase connectivity via:
     1. Browser online/offline events
     2. Supabase ping (query profiles table)
     3. Auth state changes
     4. Realtime connection state

   Behavior:
     - When disconnected: persistent red banner at top
     - When reconnected: brief green "Online 💚" for ~2s, then auto-hide
     - Never hardcodes "Online"
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var el = null;
  var online = null; /* null = unknown, true = online, false = offline */
  var pingTimer = null;
  var hideOnlineTimer = null;
  var lastError = null;

  var NETWORK_MSGS = [
    'Failed to fetch', 'NetworkError', 'fetch failed', 'Network request failed',
    'ERR_INTERNET_DISCONNECTED', 'load failed', 'Network Failure',
    'The Internet connection appears to be offline', 'network',
    'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET'
  ];

  function looksOffline(err) {
    var msg = String((err && err.message) || err || '');
    if (!msg) return false;
    for (var i = 0; i < NETWORK_MSGS.length; i++) {
      if (msg.toLowerCase().indexOf(NETWORK_MSGS[i].toLowerCase()) !== -1) return true;
    }
    return false;
  }

  function setError(err) {
    lastError = err ? {
      message: String(err.message || err),
      code: String(err.code || ''),
      time: new Date().toISOString(),
      operation: 'Supabase connectivity check'
    } : null;
  }

  function showDisconnected() {
    if (online === false) return; /* already showing offline */
    online = false;
    if (!el) return;
    clearTimeout(hideOnlineTimer);
    el.classList.add('on');
    el.classList.remove('off');
    el.classList.remove('fade-out');
    /* Force reflow for animation */
    void el.offsetWidth;
    el.classList.add('off');
    el.innerHTML = '<span class="conn-dot"></span><span>You\'re not connected 💔</span>';
    el.setAttribute('data-online', '0');
    if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
      console.log('[CONNECTION] Status: OFFLINE');
    }
  }

  function showConnected() {
    if (online === true) {
      /* Already online — don't show again unless we were just reconnected */
      return;
    }
    var wasOffline = online === false;
    online = true;
    if (!el) return;
    clearTimeout(hideOnlineTimer);
    el.classList.remove('off');
    el.classList.remove('fade-out');
    void el.offsetWidth;
    el.classList.add('on');
    el.innerHTML = '<span class="conn-dot"></span><span>Online 💚</span>';
    el.setAttribute('data-online', '1');

    if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
      console.log('[CONNECTION] Status: ONLINE');
    }

    if (wasOffline) {
      /* Show green bar for ~2 seconds then hide */
      hideOnlineTimer = setTimeout(function () {
        el.classList.add('fade-out');
        setTimeout(function () {
          el.classList.remove('on', 'fade-out');
          el.innerHTML = '';
          el.removeAttribute('data-online');
        }, 500);
      }, 2000);
    } else {
      /* Initial load — hide after 2s too */
      hideOnlineTimer = setTimeout(function () {
        el.classList.add('fade-out');
        setTimeout(function () {
          el.classList.remove('on', 'fade-out');
          el.innerHTML = '';
          el.removeAttribute('data-online');
        }, 500);
      }, 2000);
    }
  }

  function ping() {
    if (!HB.db || !HB.db.configured()) return;
    var client = HB.db.client();
    if (!client) { showDisconnected(); return; }
    client.from('profiles').select('id').limit(1)
      .then(function (res) {
        if (res.error) {
          setError(res.error);
          if (looksOffline(res.error)) {
            showDisconnected();
          } else {
            /* Non-network error (e.g. RLS, schema) — still connected */
            showConnected();
          }
          return;
        }
        setError(null);
        showConnected();
      })
      .catch(function (err) {
        setError(err);
        if (looksOffline(err)) {
          showDisconnected();
        } else {
          /* Unknown error — treat as connected (it reached the server) */
          showConnected();
        }
      });
  }

  /* Get a detailed error report for debugging */
  function getErrorReport() {
    if (!lastError) return null;
    return {
      title: 'Connection Error',
      operation: lastError.operation,
      status: online ? 'Online' : 'Offline',
      errorMessage: lastError.message,
      errorCode: lastError.code,
      timestamp: lastError.time,
      explanation: 'The website could not establish/maintain the Supabase connection.',
      suggestion: 'Check the Supabase connection, realtime configuration, network and authentication state.'
    };
  }

  HB.net = {
    get online() { return online; },
    getErrorReport: getErrorReport,

    /* Called once by app.js after the DOM is ready. */
    init: function () {
      if (el) return;
      el = document.getElementById('conn-bar');
      if (!el) return;

      /* Start in unknown state — don't assume anything */
      online = null;

      /* Listen for browser online/offline events */
      window.addEventListener('online', function () {
        if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
          console.log('[CONNECTION] Browser went online — pinging Supabase…');
        }
        ping();
      });
      window.addEventListener('offline', function () {
        if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
          console.log('[CONNECTION] Browser went offline');
        }
        showDisconnected();
      });

      /* Listen for Supabase auth state changes — they indicate connectivity */
      if (HB.db && HB.db.configured() && HB.db.client()) {
        var client = HB.db.client();
        if (client.auth && client.auth.onAuthStateChange) {
          client.auth.onAuthStateChange(function (event) {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
              showConnected();
            } else if (event === 'SIGNED_OUT') {
              /* Signed out doesn't mean offline */
            }
          });
        }
      }

      /* Initial connectivity check — only ping after a short delay
         to let Supabase client fully initialize */
      setTimeout(function () {
        if (HB.db && HB.db.configured()) {
          ping();
        }
      }, 2000);

      /* Periodic ping every 15s to detect silent disconnects */
      if (pingTimer) clearInterval(pingTimer);
      pingTimer = setInterval(function () {
        if (HB.db && HB.db.configured()) {
          ping();
        }
      }, 15000);
    }
  };
})();
