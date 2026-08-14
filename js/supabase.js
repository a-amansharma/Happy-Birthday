/* ============================================================
   SUPABASE — client bootstrap (ES module, loaded first)
   Loads the official Supabase JS client from a CDN (no build
   step required for static hosting), restores any auth session
   and signals readiness via window.__sbReady.
   ============================================================ */
(function () {
  'use strict';

  var configured = window.APP_CONFIG && window.APP_CONFIG.configured;

  if (!configured) {
    window.__resolveSb(null);
    if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
      console.warn('[HB] Supabase not configured. Add your URL + anon key to js/config.js');
    }
    return;
  }

  import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2').then(function (mod) {
    var createClient = mod.createClient;

    var client = createClient(
      window.APP_CONFIG.SUPABASE_URL,
      window.APP_CONFIG.SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage
        }
      }
    );

    window.HB = window.HB || {};
    window.HB.dbClient = client;

    /* Restore any existing session before the app boots */
    client.auth.getSession().then(function (res) {
      window.HB.authSession = res && res.data && res.data.session ? res.data.session : null;
      window.HB.authUser = (window.HB.authSession && window.HB.authSession.user) || null;
      window.__resolveSb(client);
    }).catch(function (err) {
      if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) console.error('[HB] session restore failed', err);
      window.__resolveSb(client);
    });
  }).catch(function (err) {
    console.error('[HB] Failed to load supabase-js from CDN — check your internet connection.', err);
    window.__resolveSb(null);
  });
})();
