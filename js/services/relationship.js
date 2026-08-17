/* ============================================================
   SERVICE: RELATIONSHIP — my profile, pairing code, connection
   ------------------------------------------------------------
   Matches the LIVE Supabase schema: profiles only
   (id, name, age, pairing_code, partner_id, created_at,
    last_active).

   Pairing model (profiles-only):
     * pairing_code  — MY unique single-use code (LOVE-XXXXX).
     * partner_id    — set on BOTH profiles once connected.

   RLS lets a person read/update ONLY their own row PLUS the
   paired partner's row (see supabase.sql). The code lookup + the
   linking write both happen inside the security-definer RPC
   connect_with_partner(code) — a client can never read another
   user's pairing_code or write their partner_id directly.

   While "waiting" we poll our own profile every 5s (and watch it
   via realtime when the table is published) until partner_id
   appears → status flips to connected on BOTH phones.

   After pairing, Person 2's local profile is hydrated from
   Person 1's profile data returned by the RPC.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var WAIT_POLL_MS = 5000;

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
  var _ownKey = null;
  var _partnerKey = null;

  /* While "waiting", watch MY OWN profile row: the connect RPC sets
     partner_id on it. Realtime is used when the table is published;
     a light poll (5s) guarantees the flip even when it isn't. */
  function startWaitingWatch() {
    stopWaitingWatch();
    var user = HB.auth.user();
    if (!user || !HB.db.configured()) return;
    var uid = user.id;
    _ownKey = 'waiting:' + uid;
    HB.db.subscribe(_ownKey, { table: 'profiles', filter: 'id=eq.' + uid }, function () {
      console.log('[REALTIME] Own profile changed — rechecking pairing status');
      rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
    });
    _pollTimer = setInterval(function () {
      if (rel.data.status !== 'waiting') { stopWaitingWatch(); return; }
      rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
    }, WAIT_POLL_MS);
  }

  function stopWaitingWatch() {
    if (_ownKey) { HB.db.unsubscribe(_ownKey); _ownKey = null; }
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

    try {
      var client = HB.db.client();
      if (!client) { data.status = 'unconfigured'; return Promise.resolve(); }
      return client
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
            return client
              .from('profiles').select('*').eq('id', data.me.partner_id).maybeSingle()
              .then(function (pRes) {
                data.partner = (pRes && !pRes.error && pRes.data) ? pRes.data : null;
                stopWaitingWatch();
                data.status = 'connected';
                rel.hydrate();
                rel.subscribeRealtime();
              });
          }

          data.partner = null;
          data.status = 'waiting';
          rel.hydrate();
          startWaitingWatch();
        })
        .catch(function (err) {
          data.error = String(err.message || err);
          data.status = 'error';
          var errDetail = {
            error: String(err.message || err),
            code: String(err.code || ''),
            time: new Date().toISOString(),
            operation: 'relationship.init',
            file: 'js/services/relationship.js:doInit',
            suggestion: 'Check Supabase connection, RLS policies, and profiles table schema.'
          };
          console.error('[SUPABASE] Relationship init error:', errDetail);
          if (HB._schemaNotice) return;
          var msg = String(err.message || err) + ' ' + String(err.code || '');
          if (/PGRST205|42P01|42703|Could not find|does not exist/.test(msg)) {
            HB._schemaNotice = true;
            data.status = 'unconfigured';
            if (HB.toast) HB.toast('Database isn\'t ready — run supabase.sql in Supabase SQL Editor, then reload ♡', '⚠️');
          }
        });
    } catch (e) {
      console.error('[SUPABASE] Synchronous error in doInit:', e);
      data.error = String(e.message || e);
      data.status = 'error';
      return Promise.resolve();
    }
  }

  /* Hook fired by the auth service after any session change: re-check
     the backend state and let pages re-render. */
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

    /* -------------------- bootstrap -------------------- */
    init: function (force) {
      if (!force && _initPromise) return _initPromise;
      var p = doInit();
      var wrapped = p.then(function (r) { _initPromise = null; return r; },
                           function (e) { _initPromise = null; throw e; });
      if (!force) _initPromise = wrapped;
      return wrapped;
    },

    /* -------------------- creation -------------------- */
    ensureProfile: function (fields) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      var user = HB.auth.user();
      if (!user) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });

      var keep = (data.me && data.me.pairing_code) ? data.me.pairing_code : null;
      var attempt = function (code) {
        try {
          var row = { id: user.id, name: fields.name || '' };
          if (fields.age !== undefined && fields.age !== '') row.age = Number(fields.age);
          row.pairing_code = code;
          var client = HB.db.client();
          if (!client) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
          return client.from('profiles').upsert(row).then(function (res) {
            if (res.error) {
              console.error('[PROFILE] Upsert error:', res.error.code, res.error.message);
              if (res.error.code === '23505') return attempt(generateCode());
              throw res.error;
            }
            console.log('[PROFILE] Profile created/updated successfully');
            if (data.me) data.me.pairing_code = code;
            return res;
          });
        } catch (e) {
          console.error('[PROFILE] Synchronous error in ensureProfile:', e);
          return Promise.reject(e);
        }
      };
      return attempt(fields.pairing_code || keep || generateCode());
    },

    /* -------------------- connect -------------------- */
    connectWithCode: function (code) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      if (!code || !code.trim()) return Promise.resolve({ error: { message: 'INVALID_CODE' } });
      data.busy = true;
      console.log('[PAIRING] Connecting with code:', code.substring(0, 9) + '…');
      return HB.db.client().rpc('connect_with_partner', { code: code }).then(function (res) {
        if (res.error) {
          var msg = String(res.error.message || res.error);
          var errDetail = {
            error: msg,
            code: String(res.error.code || ''),
            time: new Date().toISOString(),
            operation: 'connect_with_partner',
            file: 'js/services/relationship.js:connectWithCode',
            input_code_prefix: code.substring(0, 9) + '…'
          };
          console.error('[PAIRING] RPC error:', errDetail);
          if (/Could not find the function|PGRST202/.test(msg) && !HB._rpcNotice) {
            HB._rpcNotice = true;
            if (HB.toast) HB.toast('Run the pairing SQL first — supabase.sql in Supabase SQL Editor ♡', '⚠️');
          }
          return { error: { message: 'RPC:' + (HB.db.rpcError(res.error) || msg) } };
        }

        console.log('[PAIRING] Pairing successful');

        /* The RPC returns partner profile data — store it so Person 2
           can hydrate their local profile with Person 1's info. */
        var rpcData = res.data || {};
        data._lastRpcPartner = {
          id: rpcData.partner_id,
          name: rpcData.partner_name,
          age: rpcData.partner_age,
          created_at: rpcData.partner_created_at,
          pairing_code: rpcData.partner_code
        };

        /* force a fresh fetch — the RPC just changed the database */
        return rel.init(true).then(function () {
          return { partner_id: data.me ? data.me.partner_id : null, status: data.status, error: null };
        });
      }).catch(function (err) {
        var errDetail = {
          error: String(err.message || err),
          time: new Date().toISOString(),
          operation: 'connect_with_partner',
          file: 'js/services/relationship.js:connectWithCode',
          likely_cause: 'Network error or Supabase unreachable'
        };
        console.error('[PAIRING] RPC network error:', errDetail);
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

    /* Shared couple preferences have no column in the live profiles
       schema, so they live locally per device (HB.state.profile) —
       this keeps old call sites working without a DB write. */
    updateShared: function () {
      return Promise.resolve({ error: null });
    },

    /* Leave / delete my data. Tries the delete_my_data RPC; when that
       function doesn't exist it clears MY profile row instead. */
    leave: function () {
      var user = HB.auth.user();
      if (!HB.db.configured() || !user) return Promise.resolve();
      console.log('[RESET] Leaving/deleting user data');
      return HB.db.client().rpc('delete_my_data')
        .catch(function (err) {
          console.warn('[RESET] delete_my_data RPC failed, falling back to profile update:', err);
          return HB.db.client().from('profiles')
            .update({ partner_id: null, pairing_code: null, name: '' })
            .eq('id', user.id).then(function () {});
        })
        .then(function () {
          console.log('[RESET] Data deleted, signing out');
          stopWaitingWatch();
          if (HB.auth) return HB.auth.signOut();
        });
    },

    /* -------------------- live sync -------------------- */
    /* Watch my own row (partner_id flip, name edits) + the partner's
       row (their name/age updates show up live). */
    subscribeRealtime: function () {
      var user = HB.auth.user();
      if (!user || !HB.db.configured()) return;
      if (_ownKey) { HB.db.unsubscribe(_ownKey); _ownKey = null; }
      _ownKey = 'me:' + user.id;
      HB.db.subscribe(_ownKey, { table: 'profiles', filter: 'id=eq.' + user.id }, function () {
        console.log('[REALTIME] Own profile updated');
        rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
      });
      if (data.me && data.me.partner_id && data.me.partner_id !== _partnerKey) {
        if (_partnerKey) { HB.db.unsubscribe(_partnerKey); _partnerKey = null; }
        _partnerKey = 'partner:' + data.me.partner_id;
        HB.db.subscribe(_partnerKey, { table: 'profiles', filter: 'id=eq.' + data.me.partner_id }, function () {
          console.log('[REALTIME] Partner profile updated');
          rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
        });
      }
    },

    /* -------------------- helpers -------------------- */
    /* The sorted pair key used by chat + presence channels. */
    pairKey: function () {
      var me = data.me;
      if (!me || !me.partner_id) return null;
      return [me.id, me.partner_id].sort().join('_');
    },

    /* -------------------- local hydration --------------------
       Mirrors backend data into HB.state.profile so all the existing
       local features keep working.

       For Person 2 (who joined via code), the RPC returns Person 1's
       profile data. We use it to fill in Person 2's local state so
       they automatically have Person 1's name, age, and profile info
       without filling the wizard.

       The partner's name/age come from their actual profile row (RLS
       allows each partner to read the other's row) — never from a
       local-only guess. */
    hydrate: function () {
      if (!HB.state || !HB.state.profile) return;
      var p = HB.state.profile;

      if (data.me) {
        p.name = data.me.name || p.name;
        if (data.me.age != null) p.age = String(data.me.age);
        p.partnerCode = data.me.pairing_code || p.partnerCode;
      }

      if (data.partner) {
        p.partner = data.partner.name || p.partner;
        if (data.partner.age != null) p.partnerAge = String(data.partner.age);
      } else if (data._lastRpcPartner) {
        /* Person 2 just paired — use RPC data to hydrate partner info */
        var rp = data._lastRpcPartner;
        if (rp.name) p.partner = rp.name;
        if (rp.age != null) p.partnerAge = String(rp.age);
      }

      if (HB.save) HB.save();
    },

    dynamic: function () {
      var me = (data.status === 'connected' || data.status === 'waiting') && data.me
        ? { name: data.me.name || 'you', age: data.me.age != null ? String(data.me.age) : '' } : null;
      var partner = data.partner
        ? { name: data.partner.name || 'your person', age: data.partner.age != null ? String(data.partner.age) : '' }
        : (HB.state && HB.state.profile
            ? { name: HB.state.profile.partner || 'your person', age: HB.state.profile.partnerAge || '' } : null);
      return { me: me, partner: partner };
    },

    bondLabel: function () { return ''; },
    bondDetail: function () { return null; },

    todayKey: function () {
      var d = new Date();
      var mm = String(d.getMonth() + 1).padStart(2, '0');
      var dd = String(d.getDate()).padStart(2, '0');
      return d.getFullYear() + '-' + mm + '-' + dd;
    }
  };

  HB.rel = rel;
})();
