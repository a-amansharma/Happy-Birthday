/* ============================================================
   SERVICE: JOURNAL — "What's new" couple activity feed ♡
   ------------------------------------------------------------
   A relationship-scoped log of every little change either of you
   makes — theme, name, age, photos, connecting — shown newest-first
   on the Partner page with who did it and a sweet message. Synced
   to both phones via Realtime (no refresh needed).
   ------------------------------------------------------------
   couple_activity → shared journal, relationship-scoped
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var items = [];
  var loaded = false;
  var _key = null;

  function relId() {
    if (!HB.rel || !HB.rel.data) return null;
    var r = HB.rel.data.relationship;
    return (r && r.id) || null;
  }
  function meId() {
    var u = HB.auth && HB.auth.user();
    return u ? u.id : null;
  }
  function myName() {
    try {
      if (HB.rel && HB.rel.me) { var n = HB.rel.me().name; if (n) return n; }
    } catch (e) {}
    return (HB.state && HB.state.profile && HB.state.profile.name) || 'someone';
  }

  function emit() {
    try { window.dispatchEvent(new CustomEvent('hb:activity')); } catch (e) {}
  }

  /* Emoji + tiny label used by the feed row, from the change kind. */
  function kindUi(kind) {
    kind = kind || '';
    if (kind.indexOf('theme') === 0) return { emoji: '🎨', label: 'Look & feel' };
    if (kind === 'name') return { emoji: '💫', label: 'Names' };
    if (kind === 'age') return { emoji: '🎂', label: 'Ages' };
    if (kind.indexOf('photo') === 0) return kind.indexOf('_off') !== -1 ? { emoji: '🗑️', label: 'Photos' } : { emoji: '📸', label: 'Photos' };
    if (kind === 'connect') return { emoji: '💞', label: 'You two' };
    return { emoji: '✨', label: 'Little things' };
  }

  /* "just now", "5 min ago", "2 h ago", "yesterday", or a real date. */
  function timeAgo(iso) {
    if (!iso) return '';
    var then;
    try { then = new Date(iso).getTime(); } catch (e) { return ''; }
    if (!then) return '';
    var s = Math.max(1, Math.floor((Date.now() - then) / 1000));
    if (s < 60) return 'just now';
    var m = Math.floor(s / 60);
    if (m < 60) return m === 1 ? '1 min ago' : m + ' min ago';
    var h = Math.floor(m / 60);
    if (h < 24) return h === 1 ? '1 h ago' : h + ' h ago';
    var d = Math.floor(h / 24);
    if (d === 1) return 'yesterday';
    if (d < 7) return d + ' days ago';
    try {
      return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    } catch (e) { return ''; }
  }

  var journal = {
    items: function () { return items; },
    loaded: function () { return loaded; },

    load: function (force) {
      var rid = relId();
      if (!rid || !HB.db || !HB.db.configured()) return Promise.resolve();
      if (loaded && !force) return Promise.resolve();
      return HB.db.client().from('couple_activity')
        .select('*')
        .eq('relationship_id', rid)
        .order('created_at', { ascending: false })
        .limit(200)
        .then(function (res) {
          if (!res.error) items = res.data || [];
          loaded = true;
          emit();
        })
        .catch(function () { loaded = true; emit(); });
    },

    /* Record a change by me. Returns a promise; resolves without error
       even when the backend isn't reachable (journal is best-effort). */
    log: function (kind, msg) {
      var rid = relId();
      if (!rid) return Promise.resolve({ error: { message: 'NOT_CONNECTED' } });
      if (!HB.db || !HB.db.configured()) return Promise.resolve({ error: { message: 'NOT_CONFIGURED' } });
      var entry = {
        relationship_id: rid,
        created_by: meId(),
        actor: myName(),
        kind: kind || '',
        msg: msg || ''
      };
      return HB.db.client().from('couple_activity').insert(entry)
        .select().single()
        .then(function (res) {
          if (!res.error && res.data) {
            items.unshift(res.data);
            emit();
          }
          return res;
        })
        .catch(function (err) {
          return { error: { message: String(err && err.message || err) } };
        });
    },

    /* Realtime — reload on INSERT so a change made on the other phone
       appears on the Partner feed without a refresh. */
    subscribe: function () {
      var rid = relId();
      if (!rid || !HB.db || !HB.db.configured()) return;
      if (_key) { HB.db.unsubscribe(_key); _key = null; }
      _key = 'activity:' + rid;
      HB.db.subscribe(_key, { table: 'couple_activity', filter: 'relationship_id=eq.' + rid }, function () {
        journal.load(true).then(function () {}).catch(function () {});
      });
    },

    kindUi: kindUi,
    timeAgo: timeAgo
  };

  HB.journal = journal;
})();