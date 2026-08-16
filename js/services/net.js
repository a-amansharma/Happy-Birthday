/* ============================================================
   SERVICE: NET — thin top-of-page connection bar
   ------------------------------------------------------------
   Combines navigator.onLine with real Supabase pings so a dead
   WiFi link (which browsers report as "online") still flips the
   bar to offline. No reloads, no toasts — just one quiet strip.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var el = null;
  var bar = null;
  var timer = null;
  var online = true;

  var NETWORK_MSGS = [
    'Failed to fetch', 'NetworkError', 'fetch failed', 'Network request failed',
    'ERR_INTERNET_DISCONNECTED', 'load failed', 'Network Failure', 'The Internet connection appears to be offline'
  ];

  function looksOffline(err) {
    var msg = String((err && err.message) || err || '');
    if (!msg) return false;
    if (/network/i.test(msg)) return true;
    for (var i = 0; i < NETWORK_MSGS.length; i++) {
      if (msg.indexOf(NETWORK_MSGS[i]) !== -1) return true;
    }
    return false;
  }

  function set(on, silent) {
    online = on;
    if (!bar) return;
    bar.classList.toggle('off', !on);
    bar.classList.toggle('on', on);
    if (on) {
      bar.innerHTML = '<span class="conn-dot"></span><span>Online</span>';
    } else {
      bar.innerHTML = '<span class="conn-dot"></span><span>You\'re offline • Please reconnect 💕</span>';
    }
    if (!silent && el) el.setAttribute('data-online', on ? '1' : '0');
  }

  function ping() {
    if (!HB.db || !HB.db.configured()) return;
    var start = Date.now();
    HB.db.client().from('profiles').select('id').limit(1)
      .then(function (res) {
        if (res.error && looksOffline(res.error)) { set(false); return; }
        set(true);
      })
      .catch(function (err) {
        if (looksOffline(err)) set(false);
      });
    if (Date.now() - start > 4000) set(false);
  }

  HB.net = {
    get online() { return online; },
    setOnline: set
  };

  /* Called once by app.js after the DOM is ready. */
  HB.net.init = function () {
    if (el) return;
    el = document.getElementById('conn-bar');
    if (!el) return;
    bar = el;
    set(navigator.onLine !== false, true);

    window.addEventListener('online', function () { ping(); });
    window.addEventListener('offline', function () { set(false); });

    if (timer) clearInterval(timer);
    timer = setInterval(ping, 10000);
  };
})();
