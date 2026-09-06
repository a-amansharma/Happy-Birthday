/* ============================================================
   SERVICE: CHAT — shared two-person messages (text + image)
   ------------------------------------------------------------
   Message shape (live schema):
     { id, relationship_id, sender_user_id, type: 'text'|'image',
       message, media_path, created_at }
   Messages are keyed by relationship_id — the ONE shared record —
   so both participants read and write the same thread.

   RLS keeps the channel between the two relationship members.
   Delivery is realtime (postgres_changes) — no page refresh.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var messages = [];
  var loadedKey = null;

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

  /* The current relationship id (only when connected). */
  function relId() {
    if (!HB.rel || !HB.rel.data) return null;
    if (HB.rel.data.status !== 'connected') return null;
    var r = HB.rel.data.relationship;
    return (r && r.id) || null;
  }

  var chat = {

    messages: messages,
    lastLoadedAt: 0,

    onNew: null,          /* callback(message) */
    onChange: null,       /* callback() — unread badge */

    requireRel: function () {
      return relId() ? { id: relId() } : null;
    },

    /* True when the messages table exists in this database. */
    available: function () {
      if (chat._availChecked) return Promise.resolve(chat._available);
      chat._availChecked = true;
      if (!HB.db.configured()) { chat._available = false; return Promise.resolve(false); }
      return HB.db.client().from('messages').select('id').limit(1)
        .then(function (res) {
          var bad = res.error && /PGRST205|42P01|Could not find the table|does not exist/.test(String(res.error.message || res.error));
          chat._available = !bad;
          return chat._available;
        })
        .catch(function () { chat._available = false; return false; });
    },

    /* -------------------- loading -------------------- */
    load: function () {
      var rid = relId();
      if (!rid) return Promise.resolve([]);
      if (loadedKey === rid && messages.length) return Promise.resolve(messages);
      loadedKey = rid;
      return HB.db.client()
        .from('messages')
        .select('*')
        .eq('relationship_id', rid)
        .order('created_at', { ascending: true })
        .limit(500)
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
      var rid = relId();
      if (!rid || !text || !text.trim()) return Promise.resolve({ error: { message: 'NOT_CONNECTED' } });
      var row = {
        relationship_id: rid,
        sender_user_id: meId(),
        type: 'text',
        message: text.trim(),
        media_path: ''
      };
      return HB.db.client().from('messages').insert(row).select().single().then(function (res) {
        if (!res.error && res.data) chat.pushLocal(res.data);
        return res;
      });
    },

    /* Read a photo as base64 data URL, then insert an image message.
       No storage bucket required — the image lives in the message row. */
    sendImage: function (file) {
      var rid = relId();
      if (!rid) return Promise.resolve({ error: { message: 'NOT_CONNECTED' } });
      if (!file) return Promise.resolve({ error: { message: 'NO_FILE' } });

      if (file.size > 8 * 1024 * 1024) {
        return Promise.resolve({ error: { message: 'FILE_TOO_LARGE' } });
      }
      var okType = /image\/(jpe?g|png|webp|heic|heif)/i;
      if (!okType.test(file.type)) {
        return Promise.resolve({ error: { message: 'UNSUPPORTED_TYPE' } });
      }

      return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onerror = function () { resolve({ error: { message: 'READ_FAILED' } }); };
        reader.onload = function () {
          var dataUrl = reader.result;
          var row = {
            id: uuid(),
            relationship_id: rid,
            sender_user_id: meId(),
            type: 'image',
            message: file.name || '',
            media_path: dataUrl
          };
          HB.db.client().from('messages').insert(row).select().single().then(function (res) {
            if (res.error) return resolve(res);
            if (res.data) chat.pushLocal(res.data);
            return resolve(res);
          });
        };
        reader.readAsDataURL(file);
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
      var rid = relId();
      if (!rid) return;
      var key = 'msgs:' + rid;
      HB.db.subscribe(key, {
        table: 'messages',
        filter: 'relationship_id=eq.' + rid
      }, function (payload) {
        if (payload.eventType === 'INSERT' && payload.new) chat.pushLocal(payload.new);
        if (payload.eventType === 'DELETE') {
          messages = messages.filter(function (m) { return m.id !== payload.old.id; });
          chat.messages = messages;
          if (chat.onChange) chat.onChange();
        }
      });
    },

    /* -------------------- unread -------------------- */
    /* Read position is tracked on-device (no last_read_at column) —
       the message HISTORY itself lives in Supabase. */
    readKey: function () {
      var rid = relId();
      return rid ? 'hb_read_' + rid : null;
    },

    lastReadAt: function () {
      var k = chat.readKey();
      if (!k) return 0;
      try { return parseInt(localStorage.getItem(k) || '0', 10) || 0; } catch (e) { return 0; }
    },

    unreadCount: function () {
      var me = meId();
      if (!me) return 0;
      var lastRead = chat.lastReadAt();
      var n = 0;
      for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        if (m.sender_user_id !== me && new Date(m.created_at).getTime() > lastRead) n++;
      }
      return n;
    },

    markRead: function () {
      var k = chat.readKey();
      if (!k) return Promise.resolve();
      try { localStorage.setItem(k, String(Date.now())); } catch (e) {}
      if (chat.onChange) chat.onChange();
      return Promise.resolve();
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
              sender_id: m.sender_user_id,
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
      if (m.media_path.indexOf('data:') === 0) return Promise.resolve(m.media_path);
      return HB.db.signedUrl(m.media_path);
    }
  };

  HB.chat = chat;
})();
