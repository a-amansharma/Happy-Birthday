/* ============================================================
   SERVICE: PRESENCE — partner online/offline via Realtime
   Presence (no fake presence, no polling)
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var channel = null;
  var partnerOnline = false;
  var partnerKey = null;
  var onChange = null;

  var presence = {
    online: false,

    start: function () {
      var rel = HB.rel.data.relationship;
      if (!rel || !HB.db.configured() || channel) return;
      var me = HB.auth.user();
      if (!me) return;

      var partnerId = rel.user_a === me.id ? rel.user_b : rel.user_a;
      var myName = (HB.rel.data.me && HB.rel.data.me.name) || 'you';

      channel = HB.db.client().channel('presence:' + rel.id);

      channel.on('presence', { event: 'sync' }, function () {
        var state = channel.presenceState();
        var others = {};
        Object.keys(state).forEach(function (key) {
          var p = state[key];
          var arr = Array.isArray(p) ? p : [p];
          arr.forEach(function (rec) {
            if (rec && rec.user_id !== me.id) others[key] = rec;
          });
        });
        var keys = Object.keys(others);
        partnerOnline = keys.length > 0;
        partnerKey = keys[0] || null;
        presence.online = partnerOnline;
        presence.notify();
      });

      channel.subscribe(function (status) {
        if (status === 'SUBSCRIBED') {
          channel.track({ user_id: me.id, name: myName, online_at: new Date().toISOString() });
        }
      });

      // untrack when backgrounded so we never fake presence
      var onVis = function () {
        if (!channel) return;
        if (document.visibilityState === 'hidden') {
          try { channel.untrack(); } catch (e) {}
        } else if (channel._joined) {
          channel.track({ user_id: me.id, name: myName, online_at: new Date().toISOString() });
        }
      };
      document.addEventListener('visibilitychange', onVis);
      window.addEventListener('online', onVis);
      window.addEventListener('offline', function () {
        presence.online = false;
        presence.notify();
      });
    },

    stop: function () {
      if (channel) {
        try { HB.db.client().removeChannel(channel); } catch (e) {}
        channel = null;
      }
      partnerOnline = false;
      presence.online = false;
    },

    /* Replaceable single handler — each render swaps the previous one,
       so stale closures can't pile up across re-renders. */
    onChange: function (fn) {
      onChange = fn;
    },

    notify: function () {
      if (!onChange) return;
      try { onChange(presence.online); } catch (e) {}
    }
  };

  HB.presence = presence;
})();
