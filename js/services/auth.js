/* ============================================================
   SERVICE: AUTH — Supabase Auth (email/password, persistent)
   Each user gets a unique backend user id — never a device id.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var listeners = [];

  var auth = {
    ready: false,

    user: function () {
      var s = window.HB.authSession;
      return (s && s.user) || null;
    },

    /* No email/password anywhere — each phone gets a private anonymous
       identity, and LOVE- codes pair two phones into one relationship. */
    signInAnonymously: function () {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      console.log('[SUPABASE] Signing in anonymously');
      return HB.db.client().auth.signInAnonymously().then(function (res) {
        if (res.error) {
          console.error('[SUPABASE] Anonymous sign-in failed:', res.error);
          return { error: res.error };
        }
        console.log('[SUPABASE] Anonymous sign-in success, user:', res.data.session.user.id.substring(0, 8) + '…');
        window.HB.authSession = res.data.session;
        window.HB.authUser = res.data.session.user;
        auth.notify();
        return { user: res.data.session.user, error: null };
      });
    },

    signOut: function () {
      if (!HB.db.configured()) return Promise.resolve();
      console.log('[SUPABASE] Signing out');
      return HB.db.client().auth.signOut().then(function () {
        console.log('[SUPABASE] Sign-out complete');
        window.HB.authSession = null;
        window.HB.authUser = null;
        auth.notify();
      });
    },

    onChange: function (fn) {
      listeners.push(fn);
    },

    notify: function () {
      listeners.forEach(function (fn) {
        try { fn(); } catch (e) {}
      });
      if (window.__HB_DISPATCH_REL) window.__HB_DISPATCH_REL();
    }
  };

  HB.auth = auth;
})();
