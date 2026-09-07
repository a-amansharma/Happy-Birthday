/* ============================================================
   SERVICE: PRESENCE — partner online + LIVE typing via Realtime
   ------------------------------------------------------------
   One per-couple channel (couple:<pairKey>). Presence state carries
   { user_id, name, typing, active, online_at }. The partner sees:
     * online dot      — the other person is PRESENT AND ACTIVE (chat open)
     * "X is typing…"  — the other person's live typing flag

   "Active" means they currently have the couple-chat tab open and visible;
   that's what counts as "Online". Merely having the app open elsewhere does
   NOT show them online. Typing is a separate live flag that flips on/off.

   No keystrokes are ever stored — only the typing flag flips, with
   a short debounce on the sending side to prevent flickering.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var channel = null;
  var joined = false;   /* true once the channel reports SUBSCRIBED (not a private API) */
  var me = null;
  var myName = 'you';
  var onlineCb = null;
  var typingCb = null;
  var _typingSelf = false;
  var _activeSelf = false;   /* am I on the chat tab right now (online) */

  function track() {
    if (!channel) return;
    try {
      channel.track({ user_id: me.id, name: myName, typing: _typingSelf, active: _activeSelf, online_at: new Date().toISOString() });
    } catch (e) {}
  }

  /* Small side-channel: DP photos + theme ride the same per-couple channel.
     The DB column doesn't always exist yet (old Supabase schema), so when a
     photo can't be written to the row we broadcast it straight to the other
     phone instead — still realtime, no schema required. */
  function send(payload) {
    if (!channel || !joined) return false;
    payload = payload || {};
    if (me) payload.from = me.id;
    try {
      channel.send({ type: 'broadcast', event: 'hb:dp', payload: payload });
      return true;
    } catch (e) {
      return false;
    }
  }

  var presence = {
    online: false,          /* is my partner online right now */
    partnerTyping: false,   /* is my partner typing right now */

    start: function () {
      if (!HB.db.configured() || channel) return;
      me = HB.auth.user();
      if (!me) return;

      var rid = HB.rel.data.relationship && HB.rel.data.relationship.id;
      if (!rid) return;
      myName = HB.rel.me ? (HB.rel.me().name || 'you') : (HB.rel.data.me && HB.rel.data.me.name) || 'you';

      var pairKey = 'rel_' + rid;
      console.log('[PRESENCE] Starting presence channel for relationship:', pairKey.substring(0, 18) + '…');
      channel = HB.db.client().channel('couple:' + pairKey);

      /* Let the DP service listen for the photo/theme side-channel. */
      if (HB.dp && HB.dp.attachPresence) HB.dp.attachPresence(channel, me);

      channel.on('presence', { event: 'sync' }, function () {
        var state = channel.presenceState();
        var otherOnline = false;
        var otherTyping = false;
        Object.keys(state).forEach(function (key) {
          var recs = Array.isArray(state[key]) ? state[key] : [state[key]];
          recs.forEach(function (rec) {
            if (rec && rec.user_id !== me.id) {
              /* Online only when the partner is actively on the chat tab. */
              if (rec.active === true) otherOnline = true;
              if (rec.typing) otherTyping = true;
            }
          });
        });
        presence.online = otherOnline;
        presence.partnerTyping = otherTyping;
        if (onlineCb) { try { onlineCb(presence.online); } catch (e) {} }
        if (typingCb) { try { typingCb(presence.partnerTyping); } catch (e) {} }
      });

      /* untrack when hidden so we never fake presence, and re-track on
         visibility/online changes with the current typing + active state */
      var onVis = function () {
        if (!channel) return;
        if (document.visibilityState === 'hidden') {
          try { channel.untrack(); } catch (e) {}
        } else if (joined) {
          track();
        }
      };
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('online', onVis);

      /* Keep my "active" (Online) flag in sync with the chat tab. I'm
         "Online" only while the couple-chat tab is open and visible. */
      var navSync = function () { presence.syncActive(); };
      window.addEventListener('popstate', navSync);
      document.addEventListener('visibilitychange', navSync);
      /* initial pass once joined */
      channel.subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          console.log('[PRESENCE] Channel subscribed');
          joined = true;
          presence.syncActive();
          track();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          joined = false;
        }
      });
      window.addEventListener('offline', function () {
        presence.online = false;
        presence.partnerTyping = false;
        if (onlineCb) { try { onlineCb(false); } catch (e) {} }
        if (typingCb) { try { typingCb(false); } catch (e) {} }
      });
    },

    stop: function () {
      if (channel) {
        console.log('[PRESENCE] Stopping presence channel');
        try { HB.db.client().removeChannel(channel); } catch (e) {}
        channel = null;
      }
      joined = false;
      presence.online = false;
      presence.partnerTyping = false;
    },

    /* Broadcast my typing state (true = typing, false = stopped) */
    setTyping: function (v) {
      _typingSelf = !!v;
      if (channel) track();
    },

    /* Called on every navigation — I'm "Online" only while the chat tab
       is open and visible. Pushes the flag to the other phone. */
    syncActive: function () {
      var onChat = HB.currentPath ? HB.currentPath() === '/chat' : false;
      var should = onChat && document.visibilityState === 'visible';
      if (should !== _activeSelf) {
        _activeSelf = should;
        if (_typingSelf && !_activeSelf) _typingSelf = false;
        if (channel && joined) track();
      }
    },

    /* Send a small event to the other phone on this couple's channel
       (used by DP photos + shared theme when no DB column is available). */
    broadcast: function (payload) {
      return send(payload);
    },

    /* Replaceable single handlers — each render swaps the previous one. */
    onChange: function (fn) { onlineCb = fn; },
    onTyping: function (fn) { typingCb = fn; }
  };

  HB.presence = presence;
})();
