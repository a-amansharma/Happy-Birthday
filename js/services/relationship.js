/* ============================================================
   SERVICE: RELATIONSHIP — profiles, partner code, connection,
   dynamic currentUser / partnerUser, shared-field hydration
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function partnerCode() {
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

  var rel = {

    data: data,

    /* light heartbeat so the owner insights show accurate "last active" */
    touch: function () {
      if (!HB.db.configured()) return;
      var user = HB.auth.user();
      if (!user) return;
      var now = Date.now();
      if (_lastTouch && now - _lastTouch < 60000) return;
      _lastTouch = now;
      HB.db.client().from('profiles')
        .update({ last_seen_at: new Date().toISOString() })
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
    init: function () {
      Object.assign(data, empty());
      if (!HB.db.configured()) { data.status = 'unconfigured'; return Promise.resolve(); }
      var user = HB.auth.user();
      if (!user) { data.status = 'not-connected'; return Promise.resolve(); }

      return HB.db.client()
        .from('profiles').select('*').eq('id', user.id).maybeSingle()
        .then(function (res) {
          if (res.error) throw res.error;
          if (!res.data) { data.status = 'not-connected'; return; }

          data.me = res.data;
          rel.touch();
          return HB.db.client()
            .from('relationships')
            .select('*')
            .or('user_a.eq.' + user.id + ',user_b.eq.' + user.id)
            .limit(1)
            .maybeSingle()
            .then(function (relRes) {
              if (relRes.error) throw relRes.error;
              if (!relRes.data) {
                data.status = 'waiting';
                rel.hydrate();
                return;
              }
              data.relationship = relRes.data;
              var partnerId = relRes.data.user_a === user.id ? relRes.data.user_b : relRes.data.user_a;
              return HB.db.client().from('profiles').select('*').eq('id', partnerId).maybeSingle()
                .then(function (pRes) {
                  if (!pRes.error && pRes.data) data.partner = pRes.data;
                  data.status = 'connected';
                  rel.hydrate();
                  rel.subscribeRealtime();
                  if (HB.presence) HB.presence.start();
                });
            });
        })
        .catch(function (err) {
          data.error = String(err.message || err);
          data.status = 'error';
          /* schema not deployed yet → tell the owner what to do, once */
          if (HB._schemaNotice) return;
          var msg = String(err.message || err) + ' ' + String(err.code || '');
          if (/PGRST205|42P01|Could not find the table|relation .* does not exist/.test(msg)) {
            HB._schemaNotice = true;
            data.status = 'unconfigured';
            if (HB.toast) HB.toast('Database isn\'t ready — run supabase/schema.sql in Supabase, then reload ♡', '⚠️');
          }
        });
    },

    /* -------------------- creation -------------------- */
    /* Called from onboarding after signup: persist my profile */
    ensureProfile: function (fields) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      var user = HB.auth.user();
      if (!user) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });

      var attempt = function (code) {
        var row = {
          id: user.id,
          name: fields.name || '',
          age: fields.age || '',
          partner_code: code,
          shared: fields.shared || {}
        };
        return HB.db.client().from('profiles').upsert(row).then(function (res) {
          if (res.error) {
            if (res.error.code === '23505') return attempt(partnerCode()); // partner_code collision → retry
            throw res.error;
          }
          return res;
        });
      };
      return attempt(fields.partner_code || partnerCode());
    },

    /* -------------------- connect -------------------- */
    connectWithCode: function (code) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      if (!code || !code.trim()) return Promise.resolve({ error: { message: 'INVALID_CODE' } });
      data.busy = true;
      return HB.db.client().rpc('connect_with_partner', { code: code }).then(function (res) {
        if (res.error) return { error: { message: 'RPC:' + (HB.db.rpcError(res.error) || res.error.message) } };
        return rel.init().then(function () {
          return { relationship_id: data.relationship ? data.relationship.id : null, error: null };
        });
      }).then(function (out) { data.busy = false; return out; });
    },

    /* -------------------- shared updates -------------------- */
    /* shared: { relationship_type, vibes, chat_style, story, together_since } */
    updateShared: function (shared) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      var user = HB.auth.user();
      if (!user) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });

      if (data.relationship) {
        var merged = Object.assign({}, data.relationship.shared || {}, shared);
        return HB.db.client().from('relationships')
          .update({ shared: merged }).eq('id', data.relationship.id)
          .then(function (res) {
            if (!res.error) { data.relationship.shared = merged; rel.hydrate(); rel.dispatch(); }
            return res;
          });
      }
      // waiting for partner → store on my profile, picked up at connection time
      var mine = Object.assign({}, (data.me && data.me.shared) || {}, shared);
      return HB.db.client().from('profiles')
        .update({ shared: mine }).eq('id', user.id)
        .then(function (res) {
          if (!res.error) { if (data.me) data.me.shared = mine; rel.hydrate(); rel.dispatch(); }
          return res;
        });
    },

    updateMyProfile: function (fields) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      var user = HB.auth.user();
      if (!user) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });
      var upd = {};
      if (fields.name !== undefined) upd.name = fields.name;
      if (fields.age !== undefined) upd.age = fields.age;
      return HB.db.client().from('profiles').update(upd).eq('id', user.id)
        .then(function (res) {
          if (!res.error && data.me) Object.assign(data.me, upd);
          if (!res.error) rel.hydrate();
          return res;
        });
    },

    /* -------------------- live sync -------------------- */
    subscribeRealtime: function () {
      if (!data.relationship) return;
      var relId = data.relationship.id;
      var partnerId = data.partner ? data.partner.id : null;

      HB.db.subscribe('rel:' + relId, { table: 'relationships', filter: 'id=eq.' + relId },
        function (payload) {
          if (payload.new) {
            data.relationship = payload.new;
            rel.hydrate();
            rel.dispatch();
          }
        });

      if (partnerId) {
        HB.db.subscribe('partner:' + partnerId, { table: 'profiles', filter: 'id=eq.' + partnerId },
          function (payload) {
            if (payload.new) {
              data.partner = payload.new;
              rel.hydrate();
              rel.dispatch();
            }
          });
      }
    },

    /* -------------------- local hydration --------------------
       Mirrors backend relationship data into HB.state so all the
       existing local features (love notes, dates, companion, …)
       keep working with the real, dynamic couple names.          */
    hydrate: function () {
      if (!HB.state || !HB.state.profile) return;
      var p = HB.state.profile;
      var user = HB.auth.user();

      if (data.me) {
        p.name = data.me.name || p.name;
        if (data.me.age) p.age = data.me.age;
        p.partnerCode = data.me.partner_code || p.partnerCode;
      } else if (user) {
        p.partnerCode = p.partnerCode || '';
      }

      if (data.status === 'connected' && data.partner) {
        p.partner = data.partner.name || p.partner;
        var s = (data.relationship && data.relationship.shared) || {};
        if (s.relationship_type !== undefined) p.relationship = s.relationship_type;
        if (Array.isArray(s.vibes)) p.vibes = s.vibes;
        if (Array.isArray(s.chat_style)) p.chatStyle = s.chat_style;
        if (s.story !== undefined) p.story = s.story;
        if (s.together_since !== undefined) p.togetherSince = s.together_since;
        p.partnerAge = '';
      }

      if (HB.save) HB.save();
    },

    /* -------------------- helpers -------------------- */
    dynamic: function () {
      var me = (data.status === 'connected' || data.status === 'waiting') && data.me ? { name: data.me.name || 'you', age: data.me.age || '' } : null;
      var partner = data.partner ? { name: data.partner.name || 'your person', age: '' } : null;
      return { me: me, partner: partner };
    },

    bondLabel: function () {
      if (!data.relationship || !data.relationship.shared) return '';
      var s = data.relationship.shared;
      var r = s.last_bond || '';
      if (r && r.category) return r.category;
      return '';
    },

    bondDetail: function () {
      var s = (data.relationship && data.relationship.shared) || {};
      return s.last_bond || null;
    },

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
