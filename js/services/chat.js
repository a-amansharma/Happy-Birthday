/* ============================================================
   SERVICE: CHAT — private two-person messages (text + image)
   ------------------------------------------------------------
   Message shape (live schema):
     { id, user_a, user_b, sender_id, type: 'text'|'image',
       message, media_path, created_at }
   user_a < user_b always (sorted pair) — enforced by the DB check
   constraint, so the couple's rows share one deterministic pair.

   RLS keeps the channel strictly between the two paired users.
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

  /* The current couple's message pair (only when connected). */
  function pair() {
    if (HB.rel.data.status !== 'connected') return null;
    var me = HB.rel.data.me;
    if (!me || !me.partner_id) return null;
    var a = me.id, b = me.partner_id;
    if (a > b) { var t = a; a = b; b = t; }
    return { a: a, b: b, key: a + '_' + b };
  }

  var chat = {

    messages: messages,
    lastLoadedAt: 0,

    onNew: null,          /* callback(message) */
    onChange: null,       /* callback() — unread badge */

    requireRel: function () {
      return pair();
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
      var p = pair();
      if (!p) return Promise.resolve([]);
      if (loadedKey === p.key && messages.length) return Promise.resolve(messages);
      loadedKey = p.key;
      return HB.db.client()
        .from('messages')
        .select('*')
        .eq('user_a', p.a)
        .eq('user_b', p.b)
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
      var p = pair();
      if (!p || !text || !text.trim()) return Promise.resolve({ error: { message: 'NOT_CONNECTED' } });
      var row = {
        user_a: p.a,
        user_b: p.b,
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

    /* Read a photo as base64 data URL, then insert an image message.
       No storage bucket required — the image lives in the message row. */
    sendImage: function (file) {
      var p = pair();
      if (!p) return Promise.resolve({ error: { message: 'NOT_CONNECTED' } });
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
            user_a: p.a,
            user_b: p.b,
            sender_id: meId(),
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
      var p = pair();
      if (!p) return;
      var key = 'msgs:' + p.key;
      HB.db.subscribe(key, {
        table: 'messages',
        filter: 'user_a=eq.' + p.a + ' and user_b=eq.' + p.b
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
      var p = pair();
      return p ? 'hb_read_' + p.key : null;
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
        if (m.sender_id !== me && new Date(m.created_at).getTime() > lastRead) n++;
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
      if (m.media_path.indexOf('data:') === 0) return Promise.resolve(m.media_path);
      return HB.db.signedUrl(m.media_path);
    }
  };

  HB.chat = chat;
})();
