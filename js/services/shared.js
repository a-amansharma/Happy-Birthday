/* ============================================================
   SERVICE: SHARED — love notes + memories, synced across both
   phones via Realtime (no page refresh)
   ------------------------------------------------------------
   love_notes  → shared list (relationship-scoped)
   memories    → shared list, owner_user_id drives the two-column
                 "me" vs "partner" gallery on both phones
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var loveNotes = [];
  var memories = [];
  var loaded = false;
  var _notesKey = null;
  var _memsKey = null;

  function relId() {
    if (!HB.rel || !HB.rel.data) return null;
    var r = HB.rel.data.relationship;
    return (r && r.id) || null;
  }
  function meId() {
    var u = HB.auth.user();
    return u ? u.id : null;
  }

  function emit() {
    try { window.dispatchEvent(new CustomEvent('hb:sharedchange')); } catch (e) {}
  }

  var shared = {
    loveNotes: function () { return loveNotes; },
    memories: function () { return memories; },
    loaded: function () { return loaded; },

    load: function (force) {
      var rid = relId();
      if (!rid) return Promise.resolve();
      return Promise.all([
        HB.db.client().from('love_notes').select('*')
          .eq('relationship_id', rid).order('created_at', { ascending: false }).limit(200),
        HB.db.client().from('memories').select('*')
          .eq('relationship_id', rid).order('created_at', { ascending: false }).limit(500)
      ]).then(function (res) {
        if (!res[0].error) loveNotes = res[0].data || [];
        if (!res[1].error) memories = res[1].data || [];
        loaded = true;
        emit();
      }).catch(function () {});
    },

    addNote: function (note) {
      var rid = relId();
      if (!rid) return Promise.resolve({ error: { message: 'NOT_CONNECTED' } });
      return HB.db.client().from('love_notes').insert({
        relationship_id: rid,
        created_by: meId(),
        title: note.title || '',
        text: note.text || '',
        type: note.type || 'Random Love',
        tone: note.tone || 'Sweet'
      }).select().single().then(function (res) {
        if (!res.error && res.data) {
          loveNotes.unshift(res.data);
          emit();
        }
        return res;
      });
    },

    removeNote: function (id) {
      return HB.db.client().from('love_notes').delete().eq('id', id)
        .then(function (res) {
          if (!res.error) {
            loveNotes = loveNotes.filter(function (n) { return n.id !== id; });
            emit();
          }
          return res;
        });
    },

    addMemory: function (m) {
      var rid = relId();
      if (!rid) return Promise.resolve({ error: { message: 'NOT_CONNECTED' } });
      return HB.db.client().from('memories').insert({
        relationship_id: rid,
        owner_user_id: meId(),
        title: m.title || '',
        date: m.date || '',
        location: m.location || '',
        description: m.description || '',
        favorite: !!m.favorite,
        img: m.img || ''
      }).select().single().then(function (res) {
        if (!res.error && res.data) {
          memories.unshift(res.data);
          emit();
        }
        return res;
      });
    },

    removeMemory: function (id) {
      return HB.db.client().from('memories').delete().eq('id', id)
        .then(function (res) {
          if (!res.error) {
            memories = memories.filter(function (m) { return m.id !== id; });
            emit();
          }
          return res;
        });
    },

    /* Realtime — reload on INSERT/DELETE (covers both my writes and my
       partner's, since the same threads are relationship-scoped). */
    subscribe: function () {
      var rid = relId();
      if (!rid) return;

      if (_notesKey) { HB.db.unsubscribe(_notesKey); _notesKey = null; }
      _notesKey = 'lovenotes:' + rid;
      HB.db.subscribe(_notesKey, { table: 'love_notes', filter: 'relationship_id=eq.' + rid }, function () {
        shared.load();
      });

      if (_memsKey) { HB.db.unsubscribe(_memsKey); _memsKey = null; }
      _memsKey = 'memories:' + rid;
      HB.db.subscribe(_memsKey, { table: 'memories', filter: 'relationship_id=eq.' + rid }, function () {
        shared.load();
      });
    }
  };

  HB.shared = shared;
})();
