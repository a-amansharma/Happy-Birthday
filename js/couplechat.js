/* ============================================================
   COUPLE CHAT — real-time two-person messenger ♡
   A modern, instant-messaging feel (inspired by WhatsApp/IG):
     * header = partner's first-letter avatar + name + live status
       (Online / Last seen at [time] / Waiting)
     * rectangles: mine right with my initial, partner left with theirs
     * ✓ / ✓✓ / ✓✓ tints update in REAL TIME as the other side
       receives (Delivered) and views (Seen) each message
     * live typing bubble, day chips, photo bubbles
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var inner = null;
  var container = null;
  var myId = null;
  var pendingImages = 0;
  var chatReady = null;
  var myName = 'you';
  var partnerName = 'your person';
  var statusTimer = null;

  function timeStr(t) {
    return new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function dayLabel(t) {
    var d = new Date(t);
    var today = new Date();
    var yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    var same = function (a, b) { return a.toDateString() === b.toDateString(); };
    if (same(d, today)) return 'Today';
    if (same(d, yesterday)) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  /* First-letter "DP" avatar: the initial of the sender's name in a
     little round chip — Rishi → R, Stuti → S. */
  function dpLetter(name) {
    var c = String(name || '?').trim().charAt(0) || '?';
    return HB.esc(c.toUpperCase());
  }

  /* Bubble DP: my first-letter chip (right) / partner's (left). When a
     personal photo exists, the chip becomes that photo instead. Tapping
     EITHER chip opens the gallery to change that person's photo — mine
     syncs to my row, my partner's syncs to theirs — and any photo chips
     open a simple full-screen preview with a "change" action. */
  function dpHtml(mine) {
    var name = mine ? myName : partnerName;
    var photo = mine ? (HB.dp ? HB.dp.myPhoto() : '') : (HB.dp ? HB.dp.partnerPhoto() : '');
    var letter = dpLetter(name);
    var who = mine ? 'me' : 'them';
    var title = photo
      ? (mine ? 'View or change your photo' : 'View or change ' + partnerName + '\'s photo')
      : (mine ? 'Set your photo' : 'Set ' + partnerName + '\'s photo');
    return '<button type="button" class="msg-avatar dp ' + (mine ? 'dp-me' : 'dp-them') + '" data-dp="' + who + '" title="' + title + '" aria-label="' + title + '">' +
      (photo ? '<img class="dp-img" src="' + HB.esc(photo) + '" alt="dp"/>' : letter) + '</button>';
  }

  /* The little receipt ticks on MY bubbles.
     sent ✓ · delivered ✓✓ · seen ✓✓ (highlighted) */
  var TICK_META = {
    sent:      { glyph: '✓',   title: 'Sent' },
    delivered: { glyph: '✓✓',  title: 'Delivered' },
    seen:      { glyph: '✓✓',  title: 'Seen' }
  };

  function statusTickHtml(m) {
    var s = HB.chat ? HB.chat.statusOf(m) : 'sent';
    var t = TICK_META[s] || TICK_META.sent;
    return '<span class="msg-tick tick-' + s + '" title="' + t.title + '">' + t.glyph + '</span>';
  }

  function bubbleMeta(m, mine) {
    var tick = mine ? statusTickHtml(m) : '';
    return '<span class="bubble-meta">' +
             '<span class="msg-time">' + timeStr(m.created_at) + '</span>' + tick +
           '</span>';
  }

  function bubbleHtml(m) {
    var mine = (m.sender_user_id || m.sender_id) === myId;
    var cls = mine ? 'user' : 'ai';
    var avatar = dpHtml(mine);
    var meta = bubbleMeta(m, mine);
    if (m.type === 'image') {
      var src = (m.media_path && m.media_path.indexOf('data:') === 0) ? m.media_path : '';
      return '<div class="msg ' + cls + '" data-mid="' + HB.esc(m.id) + '">' + avatar +
        '<div class="bubble bubble-img"><img class="msg-img' + (src ? ' loaded' : '') + '" data-mid="' + HB.esc(m.id) + '" src="' + HB.esc(src) + '" alt="photo" loading="lazy"/>' + meta + '</div></div>';
    }
    return '<div class="msg ' + cls + '" data-mid="' + HB.esc(m.id) + '">' + avatar +
      '<div class="bubble"><span class="bubble-text">' + HB.esc(m.message || '').replace(/\n/g, '<br>') + '</span>' + meta + '</div></div>';
  }

  /* A receipt UPDATE arrived for one message — refresh just that bubble,
     keeping the scroll position exactly where the user is. */
  function patchBubble(m) {
    if (!inner || !inner.isConnected || !m) return;
    var wraps = inner.querySelectorAll('.msg[data-mid]');
    for (var i = 0; i < wraps.length; i++) {
      var el = wraps[i];
      if (el.getAttribute('data-mid') === m.id) {
        var metaEl = el.querySelector('.bubble-meta');
        var mine = (m.sender_user_id || m.sender_id) === myId;
        if (metaEl) {
          var tmp = document.createElement('div');
          tmp.innerHTML = bubbleMeta(m, mine);
          metaEl.parentNode.replaceChild(tmp.firstChild, metaEl);
        }
        break;
      }
    }
  }

  function renderAll() {
    if (!inner || !inner.isConnected) return;
    inner.innerHTML = '';
    var lastDay = null;
    HB.chat.messages.forEach(function (m) {
      var day = dayLabel(m.created_at);
      if (day !== lastDay) {
        lastDay = day;
        inner.appendChild(dayDiv(day));
      }
      appendBubble(m, false);
    });
    scrollDown();
  }

  function dayDiv(label) {
    var el = document.createElement('div');
    el.className = 'chat-day';
    el.textContent = label;
    return el;
  }

  function appendBubble(m, scroll) {
    if (!inner || !inner.isConnected) return;
    var div = document.createElement('div');
    div.innerHTML = bubbleHtml(m);
    inner.appendChild(div.firstChild);
    if (m.type === 'image') loadImage(m);
    if (scroll) scrollDown();
  }

  function loadImage(m) {
    pendingImages++;
    if (m.media_path && m.media_path.indexOf('data:') === 0) {
      pendingImages--;
      if (!inner || !inner.isConnected) return;
      var img = inner.querySelector('img[data-mid="' + m.id + '"]');
      if (img) {
        img.src = m.media_path;
        img.classList.add('loaded');
        img.addEventListener('click', function () { openLightbox(m.media_path, m.message || '', this); });
      }
      if (pendingImages === 0) scrollDown();
      return;
    }
    HB.chat.signedUrl(m).then(function (url) {
      pendingImages--;
      if (!inner || !inner.isConnected) return;
      var img = inner.querySelector('img[data-mid="' + m.id + '"]');
      if (img && url) {
        img.src = url;
        img.classList.add('loaded');
        img.addEventListener('click', function () { openLightbox(url, m.message || '', this); });
      }
      if (pendingImages === 0) scrollDown();
    });
  }

  function scrollDown() {
    if (container && container.isConnected) container.scrollTop = container.scrollHeight;
  }

  function openLightbox(url, msg, originEl) {
    /* Full-screen photo preview — just the picture + ✕, no name, with the
       same grow-from-the-tap animation as every other image. */
    if (HB.dp) HB.dp.preview(url, null, null, originEl);
  }

  /* A partner/own photo changed (synced via rel) → refresh all chips
     and the header mini-avatar without rebuilding the whole chat. */
  function repaintAvatars() {
    if (!inner || !inner.isConnected) return;
    var els = inner.querySelectorAll('.msg .msg-avatar.dp');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var mine = el.classList.contains('dp-me');
      var tmp = document.createElement('div');
      tmp.innerHTML = dpHtml(mine);
      el.parentNode.replaceChild(tmp.firstChild, el);
    }
    var hd = document.getElementById('header-dp');
    if (hd) {
      var ph = HB.dp ? HB.dp.partnerPhoto() : '';
      hd.innerHTML = ph
        ? '<img class="dp-img" src="' + HB.esc(ph) + '" alt="dp"/>'
        : dpLetter(partnerName);
      hd.title = ph ? 'View or change ' + partnerName + '\'s photo' : 'Set ' + partnerName + '\'s photo';
    }
  }
  window.addEventListener('hb:relchange', function () {
    if (HB.currentPath() === '/chat' && HB.state.onboarded) repaintAvatars();
  });

  function updateUnread() {
    if (!HB.chat) return;
    HB.setUnread('/chat', HB.chat.unreadCount());
  }

  function render(main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var backend = !!(window.HB && HB.db && HB.db.configured());
    var user = backend && HB.auth ? HB.auth.user() : null;
    var connected = HB.rel.data.status === 'connected';

    if (!backend || !user || !connected) {
      var waiting = backend && user && HB.rel.data.status === 'waiting';
      var n0 = HB.firstNames();
      main.innerHTML =
        '<div class="chat-page"><div class="chat-body"><div class="chat-empty">' +
          '<div class="dudu-empty" data-du></div>' +
          '<h3>' + (waiting ? 'Waiting for ' + HB.esc(n0.partner) + ' ♡' : 'Your chat needs your person ♡') + '</h3>' +
          '<p>' + (waiting ? 'Once they connect with your code, your private little chat opens right here.'
            : 'Connect your two phones on the Partner page, then your messages will live here — in real time.') + '</p>' +
          '<button class="btn btn-primary" data-partner>Open Partner page 💞</button>' +
        '</div></div></div>';
      var du = main.querySelector('[data-du]');
      if (du && HB.chars) du.innerHTML = HB.chars.stageHtml({ which: 'both', action: 'wait', size: 'big', alt: 'Bubu ♡ Dudu' });
      main.querySelector('[data-partner]').addEventListener('click', function () { HB.navigate('/partner'); });
      return;
    }

    myId = HB.auth.user().id;
    var names = HB.firstNames();
    myName = names.me;
    partnerName = names.partner;

    /* The live project has a profiles-only schema: the chat tables
       (messages, photos) don't exist yet. Probe once, then show a
       friendly notice instead of a broken, empty chat. */
    if (chatReady === null) {
      HB.loading(main, 'Opening your chat…');
      HB.chat.available().then(function (ok) {
        chatReady = ok;
        if (HB.currentPath() === '/chat') render(main);
      });
      return;
    }
    if (chatReady === false) {
      main.innerHTML =
        '<div class="chat-page"><div class="chat-body"><div class="chat-empty">' +
          '<div class="dudu-empty" data-du></div>' +
          '<h3>Our chat isn\'t set up yet ♡</h3>' +
          '<p>The chat needs a <b>messages</b> table in your database. For now you\'re connected — your notes and partner page still work, and chat opens the moment it\'s added.</p>' +
        '</div></div></div>';
      var du2 = main.querySelector('[data-du]');
      if (du2 && HB.chars) du2.innerHTML = HB.chars.stageHtml({ which: 'both', action: 'wait', size: 'big', alt: 'Bubu ♡ Dudu' });
      return;
    }

    main.innerHTML =
      '<div class="chat-page couple-chat">' +
        '<div class="chat-head">' +
          '<div class="avatar"><button type="button" class="char-dp" id="header-dp" title="' + (HB.dp && HB.dp.partnerPhoto() ? 'View or change ' + HB.esc(partnerName) + '\'s photo' : 'Set ' + HB.esc(partnerName) + '\'s photo') + '">' +
            (HB.dp && HB.dp.partnerPhoto() ? '<img class="dp-img" src="' + HB.esc(HB.dp.partnerPhoto()) + '" alt="dp"/>' : dpLetter(partnerName)) +
          '</button><span class="online" id="presence-dot"></span></div>' +
          '<div class="chat-head-meta">' +
            '<h2 id="chat-head-name">' + HB.esc(partnerName) + '</h2>' +
            '<p id="presence-label">Waiting for ' + HB.esc(partnerName) + '…</p>' +
          '</div>' +
          '<div class="chat-head-actions">' +
            '<button class="btn-icon btn-soft" data-info title="Photos & links" aria-label="Photos and links">' + HB.icon('sparkle') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="chat-body"><div class="chat-inner"></div></div>' +
        '<div id="chat-typing"><div class="typing-bubble"></div></div>' +
        '<div class="chat-input-wrap">' +
          '<div class="chat-input-box">' +
            '<input type="file" id="chat-attach" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" hidden />' +
            '<button class="attach-btn" id="chat-attach-btn" title="Send a photo" aria-label="Send a photo">📷</button>' +
            '<textarea id="chat-input" rows="1" placeholder="Message your person..." maxlength="500"></textarea>' +
            '<button class="send-btn" id="chat-send" aria-label="Send">' + HB.icon('send') + '</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    container = main.querySelector('.chat-body');
    inner = main.querySelector('.chat-inner');
    var input = main.querySelector('#chat-input');
    var send = main.querySelector('#chat-send');
    var attachInput = main.querySelector('#chat-attach');
    var attachBtn = main.querySelector('#chat-attach-btn');

    /* ---- DP taps (delegated): preview each person's photo; either chip
       also offers Change Picture that opens the photo picker ---- */
    if (inner) inner.addEventListener('click', function (e) {
      var b = e.target && e.target.closest ? e.target.closest('[data-dp]') : null;
      if (!b) return;
      var mine = b.getAttribute('data-dp') === 'me';
      var photo = mine ? (HB.dp ? HB.dp.myPhoto() : '') : (HB.dp ? HB.dp.partnerPhoto() : '');
      var setFn = mine ? HB.dp.setMy : HB.dp.setPartner;
      var clearFn = mine ? HB.dp.clearMy : HB.dp.clearPartner;
      var whoTxt = mine ? 'your' : (partnerName + '\'s');
      function pickAndSet() {
        HB.dp.pick().then(function (out) {
          if (out.error) { HB.toast('That photo couldn\'t load — try another ♡', '💔'); return; }
          setFn(out.dataUrl).then(function (res) {
            if (res && res.error) { HB.toast('Couldn\'t save — try again ♡', '💔'); return; }
            HB.toast((mine ? 'Your chat photo is set ♡' : (partnerName + '\'s chat photo is set ♡')), '✨');
          });
        });
      }
      function doDelete() {
        if (HB.confirm) {
          HB.confirm(whoTxt + ' photo', 'Remove the picture? The first letter will show again ♡', function () {
            clearFn().then(function (res) { HB.toast('Photo removed — initials back ♡', '🗑️'); });
          }, 'Delete photo');
        } else {
          clearFn().then(function (res) { HB.toast('Photo removed — initials back ♡', '🗑️'); });
        }
      }
      if (photo) { if (HB.dp) HB.dp.preview(photo, pickAndSet, doDelete, b); }
      else pickAndSet();
    });
    var hdp = main.querySelector('#header-dp');
    if (hdp) hdp.addEventListener('click', function () {
      var ph = HB.dp ? HB.dp.partnerPhoto() : '';
      function changePartnerPhoto() {
        HB.dp.pick().then(function (out) {
          if (out.error) { HB.toast('That photo couldn\'t load — try another ♡', '💔'); return; }
          HB.dp.setPartner(out.dataUrl).then(function (res) {
            if (res && res.error) { HB.toast('Couldn\'t save — try again ♡', '💔'); return; }
            HB.toast(partnerName + '\'s photo is set ♡', '✨');
          });
        });
      }
      function deletePartnerPhoto() {
        if (HB.confirm) {
          HB.confirm(partnerName + '\'s photo', 'Remove the picture? The first letter will show again ♡', function () {
            HB.dp.clearPartner().then(function (res) { HB.toast(partnerName + '\'s photo removed — initials back ♡', '🗑️'); });
          }, 'Delete photo');
        } else {
          HB.dp.clearPartner().then(function (res) { HB.toast(partnerName + '\'s photo removed — initials back ♡', '🗑️'); });
        }
      }
      if (ph) HB.dp.preview(ph, changePartnerPhoto, deletePartnerPhoto, hdp);
      else changePartnerPhoto();
    });

    HB.chat.onNew = function (m) {
      appendBubble(m, true);
      markRead();
      HB.chat.seen();
      updateUnread();
    };
    HB.chat.onChange = updateUnread;
    HB.chat.onUpdate = function (m) { patchBubble(m); updateUnread(); };

    HB.chat.load().then(function () {
      renderAll();
      /* Any partner messages waiting while I wasn't here → Seen. */
      HB.chat.seen();
    });
    HB.chat.subscribe();

    /* ---- header: partner name + LIVE status (Online / Last seen / Waiting) ---- */
    var dot = main.querySelector('#presence-dot');
    var label = main.querySelector('#presence-label');
    var _lastSeen = HB.chat.partnerLastSeenAt() || 0;

    function refreshStatus() {
      var on = HB.presence.online;
      var txt = 'Waiting for ' + partnerName + '…';
      var cls = '';
      if (on) { txt = 'Online'; cls = 'status-online'; }
      else if (_lastSeen) { txt = 'Last seen at ' + timeStr(_lastSeen); }
      if (dot && dot.isConnected) dot.classList.toggle('on', on);
      if (label && label.isConnected) {
        label.textContent = txt;
        label.className = cls;
      }
    }

    HB.presence.onChange(refreshStatus);
    refreshStatus();

    if (statusTimer) clearInterval(statusTimer);
    statusTimer = setInterval(function () {
      HB.chat.refreshPartnerActive().then(function () {
        var t = HB.chat.partnerLastSeenAt();
        if (t) _lastSeen = t;
        refreshStatus();
      });
    }, 15000);

    /* ---- live "is typing…" bubble (presence, debounced, never stored) ---- */
    var typingEl = main.querySelector('#chat-typing');
    var typingTimer = null;
    function setTypingUi(on) {
      if (!typingEl || !typingEl.isConnected) return;
      var b = typingEl.querySelector('.typing-bubble');
      typingEl.classList.toggle('show', on);
      if (on) b.innerHTML =
        '<span class="typing-name">' + HB.esc(partnerName) + ' is typing</span>' +
        '<span class="typing-dots"><i></i><i></i><i></i></span>';
      else if (b) b.innerHTML = '';
    }
    setTypingUi(HB.presence.partnerTyping);
    HB.presence.onTyping(setTypingUi);
    HB.presence.start();

    function autoGrow() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    }
    input.addEventListener('input', function () {
      HB.titleCaseInput(input); autoGrow();
      HB.presence.setTyping(true);
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(function () { HB.presence.setTyping(false); }, 1500);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
    send.addEventListener('click', doSend);

    /* Android closes the keyboard when you tap any non-input element
       (like the send button). Bring the keys straight back so sending
       a message never dismisses them — they only close when the user
       touches the feed or leaves the chat. */
    function keepKeyboard() {
      setTimeout(function () {
        if (!input || !input.isConnected) return;
        if (document.activeElement !== input) {
          try { input.focus({ preventScroll: true }); } catch (e) { input.focus(); }
        }
      }, 70);
    }

    function doSend() {
      var text = input.value.trim();
      if (!text) return;
      HB.presence.setTyping(false);
      if (typingTimer) clearTimeout(typingTimer);
      input.value = '';
      autoGrow();
      HB.chat.sendText(text).then(function (res) {
        if (res && res.error) {
          HB.toast('Couldn\'t send — try again?', '💔');
          input.value = text;
        }
      });
      keepKeyboard();
    }

    attachBtn.addEventListener('click', function () { attachInput.click(); });
    attachInput.addEventListener('change', function () {
      var file = attachInput.files && attachInput.files[0];
      if (!file) return;
      attachInput.value = '';
      HB.toast('Uploading your photo…', '📷');
      HB.chat.sendImage(file).then(function (res) {
        if (res && res.error) {
          var msg = String(res.error.message || '');
          HB.toast(msg.indexOf('TOO_LARGE') !== -1 ? 'That photo is over 8MB, love ♡' : 'Hmm, that photo couldn\'t upload', '💔');
        } else {
          HB.toast('Photo sent ♡', '📷');
        }
      });
    });

    main.querySelector('[data-info]').addEventListener('click', function () { HB.navigate('/chatinfo'); });

    markRead();
    updateUnread();
  }

  function markRead() {
    if (HB.chat) HB.chat.markRead().then(updateUnread);
  }

  HB.route('/chat', render);

  /* The moment the partner connects, the "waiting" screen should open
     the real chat — but only if the chat view isn't already showing
     (so a half-typed message is never clobbered). */
  window.addEventListener('hb:relchange', function () {
    if (HB.currentPath() !== '/chat') return;
    var main = document.getElementById('main');
    if (!main || !main.isConnected) return;
    if (HB.rel.data.status === 'connected' && !main.querySelector('.chat-inner')) {
      render(main);
    }
  });

  /* Leaving the chat (back/forward navigation) stops my typing indicator
     so the partner doesn't see "typing…" forever. Registered once. */
  window.addEventListener('popstate', function () {
    if (HB.currentPath() !== '/chat') {
      if (HB.presence) HB.presence.setTyping(false);
    }
  });
})();