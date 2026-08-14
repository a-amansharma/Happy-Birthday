/* ============================================================
   SERVICE: CHAT — realtime couple messages (text + image)
   ------------------------------------------------------------
   Message shape:
     { id, relationship_id, sender_id, type: 'text'|'image',
       message, media_path, created_at }
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var messages = [];
  var loadedRelId = null;

  function meId() {
    var u = HB.auth.user();
    return u ? u.id : null;
  }

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      var v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  var chat = {

    messages: messages,
    lastLoadedAt: 0,

    /* true while we are marking-as-read / etc. */
    onNew: null,          /* callback(message) */
    onChange: null,       /* callback() — for unread badge */

    requireRel: function () {
      var rel = HB.rel.data.relationship;
      if (!rel) return null;
      return rel;
    },

    /* -------------------- loading -------------------- */
    load: function () {
      var rel = chat.requireRel();
      if (!rel) return Promise.resolve([]);
      if (loadedRelId === rel.id && messages.length) return Promise.resolve(messages);
      loadedRelId = rel.id;
      return HB.db.client()
        .from('messages')
        .select('*')
        .eq('relationship_id', rel.id)
        .order('created_at', { ascending: true })
        .limit(300)
        .then(function (res) {
          if (!res.error) {
            messages = res.data || [];
            chat.messages = messages;
            if (res.data && res.data.length) {
              chat.lastLoadedAt = new Date(res.data[res.data.length - 1].created_at).getTime();
            }
            if (chat.onChange) chat.onChange();
          }
          return messages;
        });
    },

    /* -------------------- sending -------------------- */
    sendText: function (text) {
      var rel = chat.requireRel();
      if (!rel || !text || !text.trim()) return Promise.resolve({ error: { message: 'NO_RELATIONSHIP' } });
      var row = {
        relationship_id: rel.id,
        sender_id: meId(),
        type: 'text',
        message: text.trim(),
        media_path: ''
      };
      return HB.db.client().from('messages').insert(row).select().single().then(function (res) {
        if (!res.error && res.data) chat.pushLocal(res.data);
        return res;
      });
    },

    /* Upload a photo then insert an image message */
    sendImage: function (file) {
      var rel = chat.requireRel();
      if (!rel) return Promise.resolve({ error: { message: 'NO_RELATIONSHIP' } });
      if (!file) return Promise.resolve({ error: { message: 'NO_FILE' } });

      if (file.size > 8 * 1024 * 1024) {
        return Promise.resolve({ error: { message: 'FILE_TOO_LARGE' } });
      }
      var okType = /image\/(jpe?g|png|webp|heic|heif)/i;
      if (!okType.test(file.type)) {
        return Promise.resolve({ error: { message: 'UNSUPPORTED_TYPE' } });
      }

      var id = uuid();
      var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      if (!ext) ext = 'jpg';
      var safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      var path = rel.id + '/' + id + '/' + safeName;

      return HB.db.client().storage.from('relationship-media').upload(path, file, {
        contentType: file.type,
        upsert: false
      }).then(function (up) {
        if (up.error) throw up.error;
        var row = {
          id: id,
          relationship_id: rel.id,
          sender_id: meId(),
          type: 'image',
          message: file.name || '',
          media_path: path
        };
        return HB.db.client().from('messages').insert(row).select().single();
      }).then(function (res) {
        if (res.error) return res;
        if (res.data) chat.pushLocal(res.data);
        return res;
      });
    },

    /* -------------------- local cache + realtime -------------------- */
    pushLocal: function (m) {
      var exists = messages.some(function (x) { return x.id === m.id; });
      if (!exists) {
        messages.push(m);
        chat.messages = messages;
        if (chat.onNew) chat.onNew(m);
        if (chat.onChange) chat.onChange();
      }
    },

    subscribe: function () {
      var rel = chat.requireRel();
      if (!rel) return;
      var key = 'msgs:' + rel.id;
      HB.db.subscribe(key, { table: 'messages', filter: 'relationship_id=eq.' + rel.id },
        function (payload) {
          if (payload.eventType === 'INSERT' && payload.new) chat.pushLocal(payload.new);
          if (payload.eventType === 'DELETE') {
            messages = messages.filter(function (m) { return m.id !== payload.old.id; });
            chat.messages = messages;
            if (chat.onChange) chat.onChange();
          }
        });
    },

    /* -------------------- unread -------------------- */
    lastReadAt: function () {
      var me = HB.rel.data.me;
      if (!me) return 0;
      var t = me.last_read_at ? new Date(me.last_read_at).getTime() : 0;
      return t;
    },

    unreadCount: function () {
      var me = meId();
      if (!me) return 0;
      var lastRead = chat.lastReadAt();
      var n = 0;
      for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        if (m.sender_id !== me && new Date(m.created_at).getTime() > lastRead) n++;
      }
      return n;
    },

    markRead: function () {
      var me = HB.rel.data.me;
      if (!me || !meId()) return Promise.resolve();
      var now = new Date().toISOString();
      return HB.db.client().from('profiles').update({ last_read_at: now }).eq('id', meId())
        .then(function (res) {
          if (!res.error && HB.rel.data.me) HB.rel.data.me.last_read_at = now;
          if (chat.onChange) chat.onChange();
          return res;
        });
    },

    /* -------------------- shared content helpers -------------------- */
    linksFrom: function (list) {
      var out = [];
      (list || messages).forEach(function (m) {
        if (m.type !== 'text' || !m.message) return;
        var urls = m.message.match(/https?:\/\/[^\s<]+/g) || [];
        urls.forEach(function (raw) {
          var url = raw.replace(/[),.;:!?]+$/, '');
          try {
            var parsed = new URL(url);
            out.push({
              url: parsed.href,
              domain: parsed.hostname.replace(/^www\./, ''),
              created_at: m.created_at,
              sender_id: m.sender_id,
              message_id: m.id
            });
          } catch (e) {}
        });
      });
      return out.reverse();
    },

    mediaFrom: function (list) {
      return (list || messages).filter(function (m) { return m.type === 'image'; }).slice().reverse();
    },

    signedUrl: function (m) {
      if (!m || !m.media_path) return Promise.resolve(null);
      return HB.db.signedUrl(m.media_path);
    }
  };

  HB.chat = chat;
})();
