/* ============================================================
   SERVICE: PRESENCE — partner online + LIVE typing via Realtime
   ------------------------------------------------------------
   One per-couple channel (couple:<pairKey>). Presence state carries
   { user_id, name, typing, online_at }. The partner sees:
     * online dot      — any other presence record
     * "X is typing…"  — the other person's typing flag

   No keystrokes are ever stored — only the typing flag flips, with
   a short debounce on the sending side to prevent flickering.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var channel = null;
  var me = null;
  var myName = 'you';
  var onlineCb = null;
  var typingCb = null;
  var _typingSelf = false;

  function track() {
    if (!channel) return;
    try {
      channel.track({ user_id: me.id, name: myName, typing: _typingSelf, online_at: new Date().toISOString() });
    } catch (e) {}
  }

  var presence = {
    online: false,          /* is my partner online right now */
    partnerTyping: false,   /* is my partner typing right now */

    start: function () {
      if (!HB.db.configured() || channel) return;
      me = HB.auth.user();
      if (!me) return;

      var partnerId = HB.rel.data.me && HB.rel.data.me.partner_id;
      if (!partnerId) return;
      myName = (HB.rel.data.me && HB.rel.data.me.name) || 'you';

      var pairKey = [me.id, partnerId].sort().join('_');
      console.log('[PRESENCE] Starting presence channel for pair:', pairKey.substring(0, 12) + '…');
      channel = HB.db.client().channel('couple:' + pairKey);

      channel.on('presence', { event: 'sync' }, function () {
        var state = channel.presenceState();
        var otherOnline = false;
        var otherTyping = false;
        Object.keys(state).forEach(function (key) {
          var recs = Array.isArray(state[key]) ? state[key] : [state[key]];
          recs.forEach(function (rec) {
            if (rec && rec.user_id !== me.id) {
              otherOnline = true;
              if (rec.typing) otherTyping = true;
            }
          });
        });
        presence.online = otherOnline;
        presence.partnerTyping = otherTyping;
        if (onlineCb) { try { onlineCb(presence.online); } catch (e) {} }
        if (typingCb) { try { typingCb(presence.partnerTyping); } catch (e) {} }
      });

      channel.subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          console.log('[PRESENCE] Channel subscribed');
          track();
        }
      });

      /* untrack when hidden so we never fake presence */
      var onVis = function () {
        if (!channel) return;
        if (document.visibilityState === 'hidden') {
          try { channel.untrack(); } catch (e) {}
        } else if (channel._joined) {
          track();
        }
      };
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('online', onVis);
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
      presence.online = false;
      presence.partnerTyping = false;
    },

    /* Broadcast my typing state (true = typing, false = stopped) */
    setTyping: function (v) {
      _typingSelf = !!v;
      if (channel) track();
    },

    /* Replaceable single handlers — each render swaps the previous one. */
    onChange: function (fn) { onlineCb = fn; },
    onTyping: function (fn) { typingCb = fn; }
  };

  HB.presence = presence;
})();
