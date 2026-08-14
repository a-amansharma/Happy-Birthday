/* ============================================================
   SERVICE: DB — thin wrapper over the Supabase client
   Realtime subscription registry with cleanup + helper utils
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var subscriptions = {};
  var signedUrlCache = {};

  var db = {
    ready: false,

    /* The configured Supabase client (or null when unconfigured) */
    client: function () {
      return window.HB.dbClient || null;
    },

    configured: function () {
      return !!(window.APP_CONFIG && window.APP_CONFIG.configured && window.HB.dbClient);
    },

    /* Map RPC error messages to friendly codes */
    rpcError: function (err) {
      if (!err) return null;
      var msg = String(err.message || err.error_description || err.msg || err);
      var known = ['INVALID_CODE', 'SELF_CODE', 'ALREADY_CONNECTED', 'NOT_AUTHENTICATED', 'NOT_MEMBER', 'QUIZ_NOT_FOUND', 'EMAIL_EXISTS', 'PASSWORD_MISMATCH'];
      for (var i = 0; i < known.length; i++) {
        if (msg.indexOf(known[i]) !== -1) return known[i];
      }
      return 'UNKNOWN';
    },

    /* Realtime subscription with registry + auto cleanup */
    subscribe: function (key, opts, handler) {
      if (!db.configured()) return null;
      db.unsubscribe(key);
      var client = db.client();
      var channel = client.channel('hb:' + key);
      var s = { channel: channel, key: key, handler: handler };

      channel
        .on('postgres_changes', {
          event: opts.event || '*',
          schema: 'public',
          table: opts.table,
          filter: opts.filter
        }, function (payload) {
          try { handler(payload); } catch (e) { console.error('[HB] realtime handler error', e); }
        })
        .subscribe(function (status) {
          if (status === 'SUBSCRIBED' && opts.onSubscribed) opts.onSubscribed();
        });

      subscriptions[key] = s;
      return s;
    },

    unsubscribe: function (key) {
      var s = subscriptions[key];
      if (s) {
        try { db.client().removeChannel(s.channel); } catch (e) {}
        delete subscriptions[key];
      }
    },

    clearSubscriptions: function () {
      Object.keys(subscriptions).forEach(function (k) { db.unsubscribe(k); });
    },

    /* Timestamp helper */
    now: function () {
      return new Date().toISOString();
    }
  };

  /* Signed URL helper (cached in memory) for private storage */
  db.signedUrl = function (path, expiresIn) {
    if (!path || !db.configured()) return Promise.resolve(null);
    expiresIn = expiresIn || 3600;
    if (signedUrlCache[path] && signedUrlCache[path].until > Date.now()) {
      return Promise.resolve(signedUrlCache[path].url);
    }
    return db.client().storage.from('relationship-media')
      .createSignedUrl(path, expiresIn)
      .then(function (res) {
        if (res.error) throw res.error;
        signedUrlCache[path] = { url: res.signedUrl, until: Date.now() + (expiresIn - 60) * 1000 };
        return res.signedUrl;
      });
  };

  HB.db = db;
})();
