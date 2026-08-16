/* ============================================================
   COUPLE CHAT — real-time chat for two ♡
   Text + photos (private signed URLs), live presence dot,
   unread badges. Shared photos & links live in /chatinfo.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var inner = null;
  var container = null;
  var myId = null;
  var pendingImages = 0;
  var chatReady = null;

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

  function bubbleHtml(m) {
    var mine = m.sender_id === myId;
    var cls = mine ? 'user' : 'ai';
    var avatar = '<span class="msg-avatar">' + (mine ? HB.chars.avatarImg('dudu', 'cute') : HB.chars.avatarImg('bubu', 'cute')) + '</span>';
    if (m.type === 'image') {
      return '<div class="msg ' + cls + '">' + avatar +
        '<div class="bubble bubble-img"><img class="msg-img" data-mid="' + HB.esc(m.id) + '" alt="photo" loading="lazy"/></div>' +
        '<span class="msg-time">' + timeStr(m.created_at) + '</span></div>';
    }
    return '<div class="msg ' + cls + '">' + avatar +
      '<div class="bubble">' + HB.esc(m.message || '').replace(/\n/g, '<br>') + '</div>' +
      '<span class="msg-time">' + timeStr(m.created_at) + '</span></div>';
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
    HB.chat.signedUrl(m).then(function (url) {
      pendingImages--;
      if (!inner || !inner.isConnected) return;
      var img = inner.querySelector('[data-mid="' + m.id + '"]');
      if (img && url) {
        img.src = url;
        img.classList.add('loaded');
        img.addEventListener('click', function () { openLightbox(url, m.message || ''); });
      }
      if (pendingImages === 0) scrollDown();
    });
  }

  function scrollDown() {
    if (container && container.isConnected) container.scrollTop = container.scrollHeight;
  }

  function openLightbox(url, caption) {
    var ov = HB.modal({
      title: caption ? caption : 'A little memory ♡',
      body: '<img class="lightbox-img" src="' + HB.esc(url) + '" alt="photo"/>',
      actions: [{ label: 'Close', kind: 'btn-soft' }]
    });
    var img = ov.querySelector('.lightbox-img');
    if (img) img.addEventListener('load', function () { ov.scrollTop = 0; });
  }

  function updateUnread() {
    if (!HB.chat) return;
    var n = HB.chat.unreadCount();
    HB.setUnread('/chat', n);
  }

  function render(main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var backend = !!(window.HB && HB.db && HB.db.configured());
    var user = backend && HB.auth ? HB.auth.user() : null;
    var connected = HB.rel.data.status === 'connected';

    if (!backend || !user || !connected) {
      var waiting = backend && user && HB.rel.data.status === 'waiting';
      main.innerHTML =
        '<div class="chat-page"><div class="chat-body"><div class="chat-empty">' +
          '<div class="dudu-empty" data-du></div>' +
          '<h3>' + (waiting ? 'Waiting for your person ♡' : 'Your chat needs your person ♡') + '</h3>' +
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

    /* The live project has a profiles-only schema: the chat tables
       (messages, photos) don't exist yet. Probe once, then show a
       friendly notice instead of a broken, empty chat. */
    if (chatReady === null) {
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
      '<div class="chat-page">' +
        '<div class="chat-head">' +
          '<div class="avatar">' + HB.chars.avatarImg('bubu', 'cute') + '<span class="online" id="presence-dot"></span></div>' +
          '<div><h2>Our Chat ♡</h2><p id="presence-label">just for you two</p></div>' +
          '<div class="chat-head-actions">' +
            '<button class="btn-icon btn-soft" data-info title="Photos & links" aria-label="Photos and links">' + HB.icon('sparkle') + '</button>' +
          '</div>' +
        '</div>' +
        '<div class="chat-body"><div class="chat-inner"></div></div>' +
        '<div class="chat-typing" id="chat-typing"></div>' +
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

    HB.chat.onNew = function (m) {
      appendBubble(m, true);
      markRead();
      updateUnread();
    };
    HB.chat.onChange = updateUnread;

    HB.chat.load().then(renderAll);
    HB.chat.subscribe();

    /* presence dot (single replaceable handler — never stale) */
    var dot = main.querySelector('#presence-dot');
    var label = main.querySelector('#presence-label');
    function setPresence(on) {
      if (!dot || !dot.isConnected) return;
      dot.classList.toggle('on', on);
      if (label) label.textContent = on ? (HB.firstNames().partner + ' is here ♡') : 'waiting for ' + HB.firstNames().partner + '…';
    }
    setPresence(HB.presence.online);
    HB.presence.onChange(setPresence);

    /* live "is typing…" indicator (presence, debounced, never stored) */
    var typingEl = main.querySelector('#chat-typing');
    var typingTimer = null;
    function setTypingUi(on) {
      if (!typingEl || !typingEl.isConnected) return;
      typingEl.classList.toggle('show', on);
      typingEl.textContent = on ? (HB.firstNames().partner + ' is typing…') : '';
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
