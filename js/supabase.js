/* ============================================================
   SUPABASE — client bootstrap (ES module, loaded after the
   vendored classic build in js/vendor/supabase.min.js)
   ------------------------------------------------------------
   The supabase-js client is loaded from the LOCAL vendored file
   (js/vendor/supabase.min.js) so the app works everywhere — VS
   Code Live Server, GitHub Pages, Netlify — even offline, with
   no runtime dependency on a CDN.

   If the vendored build is missing, we fall back to jsDelivr's
   pre-bundled "+esm" build (which inlines every dependency;
   the plain "/@supabase/supabase-js@2" URL can't be used — it
   ships bare import specifiers browsers cannot resolve).

   Restores any auth session and signals readiness via
   window.__resolveSb.
   ============================================================ */
(function () {
  'use strict';

  var configured = window.APP_CONFIG && window.APP_CONFIG.configured;

  if (!configured) {
    window.__resolveSb(null);
    if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) {
      console.warn('[HB] Supabase not configured. Add your URL + key to js/config.js');
    }
    return;
  }

  var CDN_ESM = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
  var settled = false;

  function clientOptions() {
    return {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage
      }
    };
  }

  function attach(client) {
    if (settled) return;
    settled = true;
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
  }

  function make(urlOrGlobal) {
    return urlOrGlobal.createClient(
      window.APP_CONFIG.SUPABASE_URL,
      window.APP_CONFIG.SUPABASE_ANON_KEY,
      clientOptions()
    );
  }

  /* Preferred: the vendored local build (js/vendor/supabase.min.js) */
  if (window.supabase && window.supabase.createClient) {
    try {
      attach(make(window.supabase));
      return;
    } catch (err) {
      if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) console.error('[HB] vendored supabase client failed', err);
    }
  }

  /* Fallback: jsDelivr pre-bundled ESM (rarely needed) */
  import(CDN_ESM).then(function (mod) {
    attach(make(mod));
  }).catch(function (err) {
    console.error('[HB] Failed to load supabase-js — check your internet connection.', err);
    window.__resolveSb(null);
  });
})();
