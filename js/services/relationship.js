/* ============================================================
   SERVICE: RELATIONSHIP — my profile, pairing code, connection
   ------------------------------------------------------------
   Matches the LIVE Supabase schema: profiles only
   (id, name, age, pairing_code, partner_id, created_at,
    last_active, partner_code).

   Pairing model (profiles-only, RLS is self-only):
     * pairing_code  — MY unique code (LOVE-XXXXX) I share. Single use.
     * partner_id    — set on BOTH profiles once connected.
     * partner_code  — the code I used to join (connector) / the
                        other person's code if they had one.

   Because profiles RLS lets you read/update ONLY your own row,
   the actual pairing happens inside the security-definer RPC
   connect_with_partner(code) — the client can't look up or edit
   another user's row. While "waiting" we poll our own profile
   (and watch it via realtime when enabled) until partner_id
   appears → status flips to connected on BOTH phones.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var WAIT_POLL_MS = 4000;

  function generateCode() {
    var out = 'LOVE-';
    var buf = new Uint32Array(5);
    if (window.crypto && crypto.getRandomValues) {
      crypto.getRandomValues(buf);
      for (var i = 0; i < 5; i++) out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
    } else {
      for (var j = 0; j < 5; j++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    return out;
  }

  function empty() {
    return { status: 'unconfigured', me: null, partner: null, relationship: null, error: null, busy: false };
  }

  var data = empty();
  var _lastTouch = 0;
  var _initPromise = null;
  var _pollTimer = null;
  var _selfKey = null;

  /* While "waiting", watch MY OWN profile row: the connect RPC sets
     partner_id on it. Realtime is used when the table is published;
     a light poll guarantees the flip even when it isn't. */
  function startWaitingWatch() {
    stopWaitingWatch();
    var user = HB.auth.user();
    if (!user || !HB.db.configured()) return;
    var uid = user.id;
    _selfKey = 'waiting:' + uid;
    HB.db.subscribe(_selfKey, { table: 'profiles', filter: 'id=eq.' + uid }, function () {
      rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
    });
    _pollTimer = setInterval(function () {
      if (rel.data.status !== 'waiting') { stopWaitingWatch(); return; }
      rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
    }, WAIT_POLL_MS);
  }

  function stopWaitingWatch() {
    if (_selfKey) { HB.db.unsubscribe(_selfKey); _selfKey = null; }
    if (_pollTimer) { clearInterval(_pollTimer); _pollTimer = null; }
  }

  function doInit() {
    Object.assign(data, empty());
    if (!HB.db.configured()) { data.status = 'unconfigured'; return Promise.resolve(); }
    var user = HB.auth.user();
    if (!user) {
      stopWaitingWatch();
      data.status = 'not-connected';
      return Promise.resolve();
    }

    return HB.db.client()
      .from('profiles').select('*').eq('id', user.id).maybeSingle()
      .then(function (res) {
        if (res.error) throw res.error;
        if (!res.data) {
          stopWaitingWatch();
          data.status = 'not-connected';
          return;
        }

        data.me = res.data;
        rel.touch();
        if (data.me.partner_id) {
          stopWaitingWatch();
          data.status = 'connected';
          rel.hydrate();
          rel.subscribeRealtime();
        } else {
          data.status = 'waiting';
          rel.hydrate();
          startWaitingWatch();
        }
      })
      .catch(function (err) {
        data.error = String(err.message || err);
        data.status = 'error';
        /* schema not deployed yet → tell the owner what to do, once */
        if (HB._schemaNotice) return;
        var msg = String(err.message || err) + ' ' + String(err.code || '');
        if (/PGRST205|42P01|42703|Could not find|does not exist/.test(msg)) {
          HB._schemaNotice = true;
          data.status = 'unconfigured';
          if (HB.toast) HB.toast('Database isn\'t ready — run supabase/schema.sql in Supabase, then reload ♡', '⚠️');
        }
      });
  }

  /* Hook fired by the auth service after any session change: re-check
     the backend state and let pages re-render (landing → dashboard). */
  window.__HB_DISPATCH_REL = function () {
    if (!HB.db || !HB.db.configured()) return;
    rel.init().then(function () { rel.dispatch(); }).catch(function () {});
  };

  var rel = {

    data: data,

    /* light heartbeat → "last active" in insights (column: last_active) */
    touch: function () {
      if (!HB.db.configured()) return;
      var user = HB.auth.user();
      if (!user) return;
      var now = Date.now();
      if (_lastTouch && now - _lastTouch < 60000) return;
      _lastTouch = now;
      HB.db.client().from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', user.id)
        .then(function () {})
        .catch(function () {});
    },

    /* dispatch event so pages can re-render on relationship changes */
    dispatch: function () {
      window.dispatchEvent(new CustomEvent('hb:relchange'));
      if (HB.updateNav) HB.updateNav();
    },

    /* -------------------- bootstrap --------------------
       init(force):
       * concurrent non-forced calls share one in-flight fetch,
       * force=true starts a fresh fetch even if one is running
       (needed after the connect RPC changes the database).     */
    init: function (force) {
      if (!force && _initPromise) return _initPromise;
      var p = doInit();
      var wrapped = p.then(function (r) { _initPromise = null; return r; },
                           function (e) { _initPromise = null; throw e; });
      if (!force) _initPromise = wrapped;
      return wrapped;
    },

    /* -------------------- creation -------------------- */
    /* Called from onboarding after signup: persist my profile.
       Only existing columns are used. pairing_code is minted once and
       kept on later saves, so the shared code never churns. */
    ensureProfile: function (fields) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      var user = HB.auth.user();
      if (!user) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });

      var keep = (data.me && data.me.pairing_code) ? data.me.pairing_code : null;
      var attempt = function (code) {
        var row = { id: user.id, name: fields.name || '' };
        if (fields.age !== undefined && fields.age !== '') row.age = Number(fields.age);
        row.pairing_code = code;
        return HB.db.client().from('profiles').upsert(row).then(function (res) {
          if (res.error) {
            if (res.error.code === '23505') return attempt(generateCode()); // pairing_code collision → retry
            throw res.error;
          }
          if (data.me) data.me.pairing_code = code;
          return res;
        });
      };
      return attempt(fields.pairing_code || keep || generateCode());
    },

    /* -------------------- connect -------------------- */
    connectWithCode: function (code) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      if (!code || !code.trim()) return Promise.resolve({ error: { message: 'INVALID_CODE' } });
      data.busy = true;
      return HB.db.client().rpc('connect_with_partner', { code: code }).then(function (res) {
        if (res.error) {
          var msg = String(res.error.message || res.error);
          if (/Could not find the function|PGRST202/.test(msg) && !HB._rpcNotice) {
            HB._rpcNotice = true;
            if (HB.toast) HB.toast('Run the pairing SQL first — supabase/schema.sql in Supabase → SQL Editor ♡', '⚠️');
          }
          return { error: { message: 'RPC:' + (HB.db.rpcError(res.error) || msg) } };
        }
        /* force a fresh fetch — the RPC just changed the database */
        return rel.init(true).then(function () {
          return { partner_id: data.me ? data.me.partner_id : null, status: data.status, error: null };
        });
      }).catch(function (err) {
        return { error: { message: 'RPC:' + String(err.message || err) } };
      }).then(function (out) { data.busy = false; return out; });
    },

    /* -------------------- profile updates -------------------- */
    updateMyProfile: function (fields) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      var user = HB.auth.user();
      if (!user) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });
      var upd = {};
      if (fields.name !== undefined) upd.name = fields.name;
      if (fields.age !== undefined) upd.age = fields.age === '' || fields.age == null ? null : Number(fields.age);
      return HB.db.client().from('profiles').update(upd).eq('id', user.id)
        .then(function (res) {
          if (!res.error && data.me) Object.assign(data.me, upd);
          if (!res.error) { rel.hydrate(); rel.dispatch(); }
          return res;
        });
    },

    /* The shared preference fields (relationship type, vibes, talking
       style, story, together-since) have no column in the live profiles
       schema, and profiles RLS is self-only — so they live on each
       device in HB.state.profile. Settings already persisted them
       locally; this keeps the old call site working without a DB write. */
    updateShared: function () {
      return Promise.resolve({ error: null });
    },

    /* Leave / delete my data. Tries the delete_my_data RPC; when that
       function doesn't exist it clears MY profile row instead (RLS only
       lets me touch my own row — the partner's side is left intact). */
    leave: function () {
      var user = HB.auth.user();
      if (!HB.db.configured() || !user) return Promise.resolve();
      return HB.db.client().rpc('delete_my_data')
        .catch(function () {
          return HB.db.client().from('profiles')
            .update({ partner_id: null, pairing_code: null, partner_code: null, name: '' })
            .eq('id', user.id).then(function () {});
        })
        .then(function () {
          stopWaitingWatch();
          if (HB.auth) return HB.auth.signOut();
        });
    },

    /* -------------------- live sync -------------------- */
    /* Watch my own profile row: partner details, name/age edits and
       (most importantly) the moment partner_id gets set. */
    subscribeRealtime: function () {
      var user = HB.auth.user();
      if (!user || !HB.db.configured()) return;
      var key = 'me:' + user.id;
      HB.db.subscribe(key, { table: 'profiles', filter: 'id=eq.' + user.id }, function () {
        rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
      });
    },

    /* -------------------- local hydration --------------------
       Mirrors backend data into HB.state so all the existing local
       features (love notes, dates, companion, …) keep working.
       Partner details are the ones entered on THIS device during
       onboarding — the schema's RLS deliberately keeps "about them"
       local, so we never try to read the partner's row. */
    hydrate: function () {
      if (!HB.state || !HB.state.profile) return;
      var p = HB.state.profile;

      if (data.me) {
        p.name = data.me.name || p.name;
        if (data.me.age != null) p.age = String(data.me.age);
        p.partnerCode = data.me.pairing_code || p.partnerCode;
      } else {
        p.partnerCode = p.partnerCode || '';
      }

      if (HB.save) HB.save();
    },

    /* -------------------- helpers -------------------- */
    dynamic: function () {
      var me = (data.status === 'connected' || data.status === 'waiting') && data.me
        ? { name: data.me.name || 'you', age: data.me.age != null ? String(data.me.age) : '' } : null;
      var partner = (HB.state && HB.state.profile)
        ? { name: HB.state.profile.partner || 'your person', age: HB.state.profile.partnerAge || '' } : null;
      return { me: me, partner: partner };
    },

    bondLabel: function () { return ''; },
    bondDetail: function () { return null; },

    /* today's calendar date (shared relationship date logic) */
    todayKey: function () {
      var d = new Date();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      return d.getFullYear() + '-' + mm + '-' + dd;
    }
  };

  HB.rel = rel;
})();
