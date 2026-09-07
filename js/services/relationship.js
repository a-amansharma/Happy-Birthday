/* ============================================================
   SERVICE: RELATIONSHIP — one relationship, two participants
   ------------------------------------------------------------
   Canonical model:
     relationships  — the ONE shared record (pairing code, status,
                       creator, shared fields: type / together /
                       vibe / chat-style / story)
     profiles       — a participant's PERSONAL row (their name/age),
                       each referencing relationships via
                       profiles.relationship_id

   data.me            → my profile row (personal: name, age)
   data.partner       → the OTHER profile row in my relationship
   data.relationship  → the shared relationship row
   data.status        → 'unconfigured' | 'not-connected' | 'waiting'
                        | 'connected'

   PERSPECTIVE (currentUser / partnerUser):
     me()       → {name, age} from MY profile row
     partner()  → {name, age} from the OTHER profile row
     shared()   → the relationship row (identical on both phones)
   Never hard-coded by device — derived from my auth user id.

   Pairing:
     Person 1  → createRelationship(shared)  → gets LOVE- code
     Person 2  → connectWithCode(code)       → joins the same record
   Both devices watch the relationship row via Realtime; when status
   flips to 'connected' both update live. No page refresh.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function empty() {
    return { status: 'unconfigured', me: null, partner: null, relationship: null, error: null, busy: false };
  }

  var data = empty();
  var _lastTouch = 0;
  var _initPromise = null;
  var _ownKey = null;
  var _partnerKey = null;
  var _relKey = null;
  var _waitCheck = null;
  var _relTimer = null;

  function meId() {
    var u = HB.auth && HB.auth.user ? HB.auth.user() : null;
    return u ? u.id : null;
  }

  /* ---- waiting watch: watch my OWN relationship row via Realtime ----
     Person 1 created a relationship (status 'waiting'). Once Person 2
     completes pairing, that row flips to 'connected' → we re-init here.
     A few light one-shot rechecks (focus/online) cover any hiccup.
     No periodic polling, no page refresh. */
  function startWaitingWatch() {
    stopWaitingWatch();
    var rid = data.relationship && data.relationship.id;
    if (!rid || !HB.db.configured()) return;
    _waitCheck = function () {
      if (data.status !== 'waiting') { stopWaitingWatch(); return; }
      rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
    };
    _relKey = 'waiting:' + rid;
    HB.db.subscribe(_relKey, { table: 'relationships', filter: 'id=eq.' + rid }, _waitCheck);
    _relTimer = setTimeout(_waitCheck, 5000);
    window.addEventListener('focus', _waitCheck);
    window.addEventListener('online', _waitCheck);
  }

  function stopWaitingWatch() {
    if (_relKey) { HB.db.unsubscribe(_relKey); _relKey = null; }
    if (_relTimer) { clearTimeout(_relTimer); _relTimer = null; }
    if (_waitCheck) {
      window.removeEventListener('focus', _waitCheck);
      window.removeEventListener('online', _waitCheck);
      _waitCheck = null;
    }
  }

  /* Apply a theme id to <body> (single source of truth for sync). */
  function applyBodyTheme(themeId) {
    var t = (themeId || 'milk').toString().replace(/[^a-z]/g, '');
    if (!document.body) return;
    var cur = document.body.className || '';
    document.body.className = cur.replace(/theme-[a-z]+/, '').trim();
    if (document.body.classList) document.body.classList.add('theme-' + t);
  }

  /* ---- load my profile + relationship + partner ----
     The relationship's creator self is MY row only when I'm the
     creator. The partner row is the OTHER member. */
  function doInit() {
    Object.assign(data, empty());
    if (!HB.db.configured()) { data.status = 'unconfigured'; return Promise.resolve(); }
    var myid = meId();
    if (!myid) {
      stopWaitingWatch();
      data.status = 'not-connected';
      return Promise.resolve();
    }

    try {
      var client = HB.db.client();
      if (!client) { data.status = 'unconfigured'; return Promise.resolve(); }

      return client.from('profiles').select('*').eq('id', myid).maybeSingle()
        .then(function (res) {
          if (res.error) throw res.error;
          data.me = (res.data && Object.keys(res.data).length) ? res.data : null;

          if (!data.me || !data.me.relationship_id) {
            stopWaitingWatch();
            data.partner = null;
            data.relationship = null;
            data.status = data.me ? 'not-connected' : 'not-connected';
            rel.hydrate();
            return;
          }

          var rid = data.me.relationship_id;

          /* Load the shared relationship row. */
          return client.from('relationships').select('*').eq('id', rid).maybeSingle()
            .then(function (rRes) {
              if (rRes.error) throw rRes.error;
              data.relationship = rRes.data || null;

              if (!data.relationship) {
                stopWaitingWatch();
                data.partner = null;
                data.status = 'not-connected';
                rel.hydrate();
                return;
              }

              if (data.relationship.status === 'connected') {
                /* Connected — load the other participant's profile. */
                return client.from('profiles').select('*').neq('id', myid).eq('relationship_id', rid).maybeSingle()
                  .then(function (pRes) {
                    if (pRes.error) throw pRes.error;
                    data.partner = pRes.data || null;
                    stopWaitingWatch();
                    data.status = 'connected';
                    rel.touch();
                    rel.hydrate();
                    rel.subscribeRealtime();
                  });
              }

              /* Waiting — I'm either the creator (holds the code) or a
                 newer member who somehow isn't connected yet. */
              data.partner = null;
              data.status = 'waiting';
              rel.touch();
              rel.hydrate();
              startWaitingWatch();
            });
        })
        .catch(function (err) {
          data.error = String(err.message || err);
          data.status = 'error';
          var msg = String(err.message || err) + ' ' + String(err.code || '');
          if (HB._schemaNotice) return;
          if (/PGRST205|42P01|42703|Could not find|does not exist|relation .* does not exist/.test(msg)) {
            HB._schemaNotice = true;
            data.status = 'unconfigured';
            if (HB.toast) HB.toast('Database isn\'t ready — run supabase/run-all.sql in Supabase SQL Editor, then reload ♡', '⚠️');
          }
        });
    } catch (e) {
      data.error = String(e.message || e);
      data.status = 'error';
      return Promise.resolve();
    }
  }

  /* Hook fired by the auth service after any session change. */
  window.__HB_DISPATCH_REL = function () {
    if (!HB.db || !HB.db.configured()) return;
    rel.init().then(function () { rel.dispatch(); }).catch(function () {});
  };

  var rel = {
    data: data,

    /* light heartbeat */
    touch: function () {
      if (!HB.db.configured() || !meId()) return;
      var now = Date.now();
      if (_lastTouch && now - _lastTouch < 60000) return;
      _lastTouch = now;
      HB.db.client().from('profiles')
        .update({ last_active: new Date().toISOString() })
        .eq('id', meId())
        .then(function () {}).catch(function () {});
    },

    dispatch: function () {
      try { window.dispatchEvent(new CustomEvent('hb:relchange')); } catch (e) {}
      if (HB.updateNav) HB.updateNav();
    },

    /* ---- my unique participant id (auth user id) ---- */
    myId: meId,

    /* ---- PERSPECTIVE: current user ----
       "You": my personal profile row. */
    me: function () {
      var m = data.me;
      if (!m) {
        return { name: (HB.state && HB.state.profile && HB.state.profile.name) || 'you',
                 age: (HB.state && HB.state.profile && HB.state.profile.age) || '' };
      }
      return { name: m.name || 'you', age: m.age != null ? String(m.age) : '' };
    },

    /* ---- PERSPECTIVE: partner user ----
       "Partner": the OTHER participant's personal profile row. */
    partner: function () {
      var p = data.partner;
      if (p) {
        return { name: p.name || 'your person', age: p.age != null ? String(p.age) : '' };
      }
      /* Not yet connected: fall back to Person 1's hint (shared row). */
      if (data.relationship && data.relationship.partner_hint_name) {
        return {
          name: data.relationship.partner_hint_name || 'your person',
          age: data.relationship.partner_hint_age != null ? String(data.relationship.partner_hint_age) : ''
        };
      }
      return { name: (HB.state && HB.state.profile && HB.state.profile.partner) || 'your person',
               age: (HB.state && HB.state.profile && HB.state.profile.partnerAge) || '' };
    },

    /* ---- SHARED relationship row (identical on both phones) ---- */
    shared: function () {
      return data.relationship;
    },

    /* ---- bootstrap ---- */
    init: function (force) {
      if (!force && _initPromise) return _initPromise;
      var p = doInit();
      var wrapped = p.then(function (r) { _initPromise = null; return r; },
                           function (e) { _initPromise = null; throw e; });
      if (!force) _initPromise = wrapped;
      return wrapped;
    },

    /* ---- upset my OWN personal profile row (name/age) ---- */
    ensureProfile: function (fields) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      var id = meId();
      if (!id) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });
      var row = { id: id, name: (fields && fields.name) || '' };
      if (fields && fields.age !== undefined && fields.age !== '') row.age = Number(fields.age);
      return HB.db.client().from('profiles').upsert(row).then(function (res) {
        if (res.error) {
          if (res.error.code === '23505') return HB.db.client().from('profiles').upsert(row);
          return res;
        }
        if (data.me) Object.assign(data.me, row);
        return res;
      });
    },

    /* ---- PERSON 1: create the relationship (shared fields) + code ---- */
    createRelationship: function (shared) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      if (!meId()) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });
      data.busy = true;
      var meProfile = (HB.state && HB.state.profile) || {};
      var relArgs = function () {
        var a = {
          rel_rel_type: shared.relationship_type || meProfile.relationship || '',
          rel_together: shared.together_since || null,
          rel_vibes: shared.vibes || meProfile.vibes || [],
          rel_styles: shared.chat_style || meProfile.chatStyle || [],
          rel_story: shared.story || meProfile.story || '',
          hint_name: shared.partner_name || meProfile.partner || '',
          hint_age: shared.partner_age != null ? Number(shared.partner_age) : null
        };
        return a;
      };
      var callCreate = function (themeArg) {
        var a = relArgs();
        if (themeArg) a.rel_theme = shared.theme || meProfile.theme || 'milk';
        return HB.db.client().rpc('create_relationship', a).then(function (res) {
          /* Older databases don't take the theme param yet — retry without
             it so pairing keeps working until run-all.sql is re-run. */
          if (themeArg && res.error && /PGRST202|42883|Could not find the function/.test(
            String((res.error && (res.error.message || res.error.code)) || ''))) {
            return callCreate(false);
          }
          return res;
        });
      };
      return callCreate(true).then(function (res) {
        data.busy = false;
        if (res.error) return res;
        var out = res.data || {};
        if (out.code && data.me) data.me.pairing_code = out.code;
        return rel.init(true).then(function () {
          return { code: out.code, relationship_id: out.relationship_id, error: null };
        });
      });
    },

    /* ---- PERSON 2: enter the code to join the relationship ---- */
    connectWithCode: function (code) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      if (!code || !code.trim()) return Promise.resolve({ error: { message: 'INVALID_CODE' } });
      data.busy = true;
      var retried = false;

      /* Make sure my personal profile row exists before the RPC. */
      var ensure = data.me ? Promise.resolve({ error: null })
        : rel.ensureProfile({ name: (HB.state.profile && HB.state.profile.name) || '' });

      var doRpc = function () {
        return HB.db.client().rpc('complete_pairing', { code: code }).then(function (res) {
          if (res.error) {
            var msg = String(res.error.message || res.error);
            if (/Could not find the function|PGRST202/.test(msg) && !HB._rpcNotice) {
              HB._rpcNotice = true;
              if (HB.toast) HB.toast('Run the pairing SQL first — supabase/run-all.sql in Supabase SQL Editor ♡', '⚠️');
            }
            if (/NOT_AUTHENTICATED/.test(msg) && !retried && meId()) {
              retried = true;
              return HB.db.client().auth.getSession().then(function () {
                return new Promise(function (resolve) { setTimeout(function () { resolve(doRpc()); }, 600); });
              });
            }
            return { error: { message: 'RPC:' + (HB.db.rpcError(res.error) || msg), code: String(res.error.code || ''), raw: msg } };
          }
          data._lastRpcRelationship = res.data || null;
          return rel.init(true).then(function () {
            /* Tell the app we connected so chat + presence wire up on this
               device too (the joiner doesn't receive the creator's realtime
               echo to dispatch this for us). */
            rel.dispatch();
            return { status: data.status, error: null };
          });
        }).catch(function (err) {
          return { error: { message: 'RPC:' + String(err.message || err) } };
        });
      };

      return ensure.then(function (eRes) {
        if (eRes && eRes.error) return { error: eRes.error };
        return doRpc();
      }).then(function (out) { data.busy = false; return out; });
    },

    /* ---- update MY personal name/age (only my own row) ---- */
    updateMyProfile: function (fields) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      var id = meId();
      if (!id) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });
      var prevName = data.me ? data.me.name : '';
      var prevAge = data.me != null ? data.me.age : null;
      var upd = {};
      if (fields.name !== undefined) upd.name = fields.name;
      if (fields.age !== undefined) upd.age = fields.age === '' || fields.age == null ? null : Number(fields.age);
      return HB.db.client().from('profiles').update(upd).eq('id', id)
        .then(function (res) {
          if (!res.error && data.me) Object.assign(data.me, upd);
          if (!res.error) { rel.hydrate(); rel.dispatch(); }
          if (!res.error && HB.journal && HB.journal.log && data.status === 'connected') {
            if (upd.name !== undefined && upd.name !== prevName) {
              HB.journal.log('name', 'wants to be called “' + String(upd.name) + '” now — still the sweetest name ♡')
                .catch(function () {});
            } else if (upd.age !== undefined && upd.age !== prevAge) {
              HB.journal.log('age', (upd.age != null ? 'just turned ' + upd.age : 'kept their age a mystery') + ' — how are you still this adorable ♡')
                .catch(function () {});
            }
          }
          return res;
        });
    },

    /* ---- update SHARED relationship fields (either partner) ---- */
    updateShared: function (fields) {
      if (!HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      if (!meId()) return Promise.resolve({ error: { message: 'NOT_AUTHENTICATED' } });
      if (!data.relationship) return Promise.resolve({ error: null });
      return HB.db.client().rpc('update_relationship', {
        rel_type: fields.relationship_type != null ? fields.relationship_type : null,
        together: fields.together_since || null,
        vbs: fields.vibes != null ? fields.vibes : null,
        styles: fields.chat_style != null ? fields.chat_style : null,
        stry: fields.story != null ? fields.story : null
      }).then(function (res) {
        if (!res.error && data.relationship) {
          if (fields.relationship_type != null) data.relationship.relationship_type = fields.relationship_type;
          if (fields.together_since != null) data.relationship.together_since = fields.together_since;
          if (fields.vibes != null) data.relationship.vibes = fields.vibes;
          if (fields.chat_style != null) data.relationship.chat_style = fields.chat_style;
          if (fields.story != null) data.relationship.story = fields.story;
          rel.hydrate();
        }
        return res;
      });
    },

    /* ---- shared visual theme (either partner; reachable via rel.setTheme) ----
       Local-first: applies instantly, then syncs to the shared row so the
       other phone adopts it too via the realtime relchange → hydrate. */
    setTheme: function (theme) {
      var t = (theme || 'milk').toString();
      var prev = (data.relationship && data.relationship.theme)
        || (HB.state && HB.state.profile && HB.state.profile.theme) || '';
      applyBodyTheme(t);
      if (HB.state && HB.state.profile) {
        HB.state.profile.theme = t;
        if (HB.save) HB.save();
      }
      /* Journal: a shared theme change by either person. */
      if (HB.journal && HB.journal.log && t !== prev && data.status === 'connected') {
        var tName = t;
        if (HB.THEMES) {
          var match = HB.THEMES.filter(function (th) { return th.id === t; })[0];
          if (match) tName = match.icon + ' ' + match.name;
        }
        HB.journal.log('theme', 'switched the look to “' + String(tName) + '” — cozy for both of us ♡')
          .catch(function () {});
      }
      if (!HB.db.configured() || !meId() || !data.relationship) {
        return Promise.resolve({ error: null });
      }
      return HB.db.client().rpc('update_relationship_theme', { p_theme: t }).then(function (res) {
        if (res.error && /PGRST202|Could not find the function|does not exist/i.test(String(res.error.message || res.error || ''))) {
          /* New RPC isn't on the live schema yet — broadcast it to the other
             phone instead so the theme still matches on both devices. */
          if (HB.dp && HB.dp.broadcast) HB.dp.broadcast({ kind: 'theme', url: t });
          return { error: null };
        }
        if (!res.error && data.relationship) {
          data.relationship.theme = t;
          rel.hydrate();
        }
        return res;
      });
    },

    /* Re-apply the shared theme to the document (used when a broadcasted
       theme arrives so the receiving phone repaints without a refresh). */
    paintTheme: applyBodyTheme,

    /* ---- leave / erase — deletes my profile + the whole relationship ---- */
    leave: function () {
      if (!HB.db.configured() || !meId()) return Promise.resolve();
      stopWaitingWatch();
      return HB.db.client().rpc('delete_my_data')
        .then(function () {})
        .catch(function (err) { console.warn('[RESET] delete_my_data RPC failed:', err); })
        .then(function () {
          if (HB.auth) return HB.auth.signOut();
        });
    },

    /* ---- live sync: my row, partner row, relationship row ----
       (shared-data tables are handled by their own services) */
    subscribeRealtime: function () {
      var myid = meId();
      if (!myid || !HB.db.configured()) return;

      if (_ownKey) { HB.db.unsubscribe(_ownKey); _ownKey = null; }
      _ownKey = 'me:' + myid;
      HB.db.subscribe(_ownKey, { table: 'profiles', filter: 'id=eq.' + myid }, function () {
        rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
      });

      if (data.me && data.me.relationship_id) {
        var rid = data.me.relationship_id;
        if (rid !== _relKey) {
          if (_relKey) { HB.db.unsubscribe(_relKey); _relKey = null; }
          _relKey = 'rel:' + rid;
          HB.db.subscribe(_relKey, { table: 'relationships', filter: 'id=eq.' + rid }, function () {
            rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
          });
        }
      }

      if (data.partner && data.partner.id !== _partnerKey) {
        if (_partnerKey) { HB.db.unsubscribe(_partnerKey); _partnerKey = null; }
        _partnerKey = 'partner:' + data.partner.id;
        HB.db.subscribe(_partnerKey, { table: 'profiles', filter: 'id=eq.' + data.partner.id }, function () {
          rel.init(true).then(function () { rel.dispatch(); }).catch(function () {});
        });
      }
    },

    pairKey: function () {
      var rid = data.relationship && data.relationship.id;
      return rid ? 'rel_' + rid : null;
    },

    /* ---- mirror backend state into HB.state.profile so legacy pages
       (companion chat, notes, dates) keep working with the right names
       and shared fields ---- */
    hydrate: function () {
      if (!HB.state || !HB.state.profile) return;
      var p = HB.state.profile;
      var n = rel.me();
      if (data.me) {
        p.name = n.name;
        if (n.age !== '') p.age = n.age;
        /* avatar_url may be '' (photo deleted → initials show again); use
           a null check so an empty value actually clears the photo. */
        if (data.me.avatar_url != null) p.myAvatar = data.me.avatar_url;
      }
      if (data.partner || (data.relationship && data.relationship.partner_hint_name)) {
        var pn = rel.partner();
        p.partner = pn.name;
        if (pn.age !== '') p.partnerAge = pn.age;
        if (data.partner && data.partner.avatar_url != null) p.partnerAvatar = data.partner.avatar_url;
      }
      if (data.relationship) {
        var r = data.relationship;
        if (r.relationship_type) p.relationship = r.relationship_type;
        if (r.together_since) p.togetherSince = r.together_since;
        if (r.vibes && r.vibes.length) p.vibes = normalizeList(r.vibes);
        if (r.chat_style && r.chat_style.length) p.chatStyle = normalizeList(r.chat_style);
        if (r.story) p.story = r.story;
        if (r.theme) { p.theme = r.theme; applyBodyTheme(r.theme); }
        if (r.couple_dp_url != null) p.coupleDp = r.couple_dp_url;
      }
      if (HB.save) HB.save();
    },

    dynamic: function () {
      var me = (data.status === 'connected' || data.status === 'waiting') && data.me
        ? { name: data.me.name || 'you', age: data.me.age != null ? String(data.me.age) : '' } : null;
      var partner = (data.status === 'connected') && data.partner
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

  function normalizeList(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (x) { return typeof x === 'string' ? { label: x, emoji: '' } : x; });
  }

  HB.rel = rel;
})();
