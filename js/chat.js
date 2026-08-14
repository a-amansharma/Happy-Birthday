/* ============================================================
   CHAT — the AI companion page
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var BOT_COLOR = 'mocha';

  function timeStr(t) {
    var d = new Date(t);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  function bubbleHtml(m) {
    var cls = m.from === 'user' ? 'user' : 'ai';
    var avatar = cls === 'ai' ? '<span class="msg-avatar">' + HB.bearAvatarSVG(BOT_COLOR) + '</span>' : '<span class="msg-avatar">' + HB.bearAvatarSVG('pinky', 'blush') + '</span>';
    return '<div class="msg ' + cls + '">' + avatar +
      '<div class="bubble">' + HB.esc(m.text).replace(/\n/g, '<br>') + '</div>' +
      '<span class="msg-time">' + timeStr(m.time) + '</span></div>';
  }

  function appendMsg(m, container, scroll) {
    if (!container.isConnected) return;
    var wrap = container.querySelector('.chat-inner');
    if (wrap && wrap.querySelector('.chat-day')) {
      // insert before day marker handling is complex; simply append
    }
    var div = document.createElement('div');
    div.innerHTML = bubbleHtml(m);
    container.querySelector('.chat-inner').appendChild(div.firstChild);
    if (scroll) container.scrollTop = container.scrollHeight;
  }

  function showTyping(container) {
    if (!container.isConnected) return null;
    var el = document.createElement('div');
    el.className = 'msg ai typing-msg';
    el.innerHTML = '<span class="msg-avatar">' + HB.bearAvatarSVG(BOT_COLOR, 'blush') + '</span><div class="bubble typing"><i></i><i></i><i></i></div>';
    container.querySelector('.chat-inner').appendChild(el);
    container.scrollTop = container.scrollHeight;
    return el;
  }

  HB.route('/companion', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var suggestions = HB.chatSuggestions.map(function (s) {
      return '<button class="chip">' + HB.esc(s) + '</button>';
    }).join('');

    main.innerHTML =
      '<div class="chat-page">' +
      '<div class="chat-head">' +
        '<div class="avatar">' + HB.bearAvatarSVG(BOT_COLOR, 'love') + '<span class="online"></span></div>' +
        '<div><h2>Your Little Companion ♡</h2><p>always here, always listening</p></div>' +
        '<div class="chat-head-actions">' +
          '<button class="btn-icon btn-soft" data-clear title="Start fresh" aria-label="New chat">' + HB.icon('refresh') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="chat-body"><div class="chat-inner"></div></div>' +
      '<div class="chat-suggestions" id="suggestions">' + suggestions + '</div>' +
      '<div class="chat-input-wrap">' +
        '<div class="chat-input-box">' +
          '<textarea id="chat-input" rows="1" placeholder="Tell your companion anything..." maxlength="500"></textarea>' +
          '<button class="send-btn" id="chat-send" aria-label="Send">' + HB.icon('send') + '</button>' +
        '</div>' +
      '</div>' +
      '</div>';

    var container = main.querySelector('.chat-body');
    var inner = main.querySelector('.chat-inner');
    var input = main.querySelector('#chat-input');
    var send = main.querySelector('#chat-send');
    var typing = null;
    var busy = false;

    // Date separator
    var today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
    inner.innerHTML = '<div class="chat-day">' + today + '</div>';

    // Load history
    HB.state.chatHistory.forEach(function (m) { appendMsg(m, container, false); });
    container.scrollTop = container.scrollHeight;

    // Pending intent from dashboard (e.g. relationship)
    if (HB.state.chatPendingIntent) {
      var pending = HB.state.chatPendingIntent;
      HB.state.chatPendingIntent = null;
      HB.save();
      setTimeout(function () {
        if (!container.isConnected) return;
        simulateUserMessage(pending === 'relationship' ? 'Ask About My Relationship' : '');
      }, 500);
    }

    function autoGrow() {
      input.style.height = 'auto';
      input.style.height = Math.min(input.scrollHeight, 110) + 'px';
    }
    input.addEventListener('input', function () { HB.titleCaseInput(input); autoGrow(); });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
    });
    send.addEventListener('click', doSend);

    main.querySelector('[data-clear]').addEventListener('click', function () {
      HB.confirm('Start a fresh chat?', 'This clears the conversation history with your companion. It\'s like a little reset for your talks.', function () {
        HB.state.chatHistory = [];
        HB.save();
        inner.innerHTML = '<div class="chat-day">' + today + '</div>';
        HB.toast('Fresh start — your companion is waiting ♡', '🧸');
      });
    });

    function simulateUserMessage(text) {
      if (busy) return;
      busy = true;
      var userMsg = { id: HB.uid(), from: 'user', text: text || 'Ask About My Relationship', time: Date.now() };
      HB.state.chatHistory.push(userMsg);
      HB.save();
      appendMsg(userMsg, container, true);
      typing = showTyping(container);
      setTimeout(function () {
        if (typing) typing.remove();
        typing = null;
        var reply;
        try {
          reply = HB.chatReply(text || 'Ask About My Relationship');
        } catch (err) {
          reply = 'Sorry {me}, my little bear brain glitched for a second 🐻 Tell me that again?';
          reply = reply.replace('{me}', HB.firstNames().me);
        }
        var aiMsg = { id: HB.uid(), from: 'ai', text: reply, time: Date.now() };
        HB.state.chatHistory.push(aiMsg);
        HB.save();
        appendMsg(aiMsg, container, true);
        busy = false;
      }, 1300 + Math.random() * 800);
    }

    function doSend() {
      var text = input.value.trim();
      if (!text || busy) return;
      input.value = '';
      autoGrow();
      simulateUserMessage(text);
    }

    main.querySelectorAll('#suggestions .chip').forEach(function (chip) {
      chip.addEventListener('click', function () {
        if (busy) { HB.toast('Your companion is still writing… one second 🐻', '💭'); return; }
        input.value = chip.textContent;
        doSend();
      });
    });
  });
})();
