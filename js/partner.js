/* ============================================================
   PARTNER — your connection to your person ♡
   ------------------------------------------------------------
   Shows:
     - Connected: "You two are connected ♡" + partner details
     - Waiting: your pairing code + share instructions
     - Fresh: code entry form (Person 2 only)
     - Identity prompt if Person 2 joined without a name
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var ready = false;
  var initStarted = false;

  function render(main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var backend = !!(window.HB && HB.db && HB.db.configured());

    if (!backend) {
      main.innerHTML = '<div class="page"><div class="dash-hello"><h1>Partner <span class="hand" style="font-size:1.15em">connection</span> 💞</h1>' +
        '<p>Cloud connection needs a Supabase project configured in <code>js/config.js</code>.</p></div></div>';
      return;
    }

    var relData = HB.rel.data;
    var user = HB.auth.user();

    if (!user) {
      main.innerHTML = '<div class="page"><div class="dash-hello"><h1>Your <span class="hand" style="font-size:1.15em">partner</span> 💞</h1>' +
        '<p>Sign in to see your connection.</p><button class="btn btn-primary" data-login>Sign in ♡</button></div></div>';
      main.querySelector('[data-login]').addEventListener('click', function () {
        HB.navigate('/');
      });
      return;
    }

    if (relData.status === 'unconfigured' || relData.status === 'not-connected') {
      if (!initStarted) {
        initStarted = true;
        HB.rel.init().then(function () { if (main.isConnected) render(main); });
      }
    }

    var connected = relData.status === 'connected';
    var waiting = relData.status === 'waiting';
    var code = relData.relationship && relData.relationship.pairing_code;

    var body = '';

    if (connected) {
      var partnerName = (relData.partner && relData.partner.name) || HB.state.profile.partner || 'your person';
      var partnerAge = relData.partner && relData.partner.age != null ? String(relData.partner.age) : (HB.state.profile.partnerAge || '—');
      var partnerSince = relData.partner && relData.partner.created_at;
      var sinceStr = '';
      if (partnerSince) {
        try {
          var d = new Date(partnerSince);
          sinceStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {}
      }

      body =
        '<div class="connect-center">' +
          '<div class="dudu-big" data-du></div>' +
          '<h2 class="hand" style="font-size:30px">You two are connected ♡</h2>' +
          '<p class="wizard-step-hint">' + HB.esc(HB.couple()) + ' — one little world, two hearts.</p>' +
        '</div>' +
        '<div class="row" style="gap:16px;max-width:560px;margin:22px auto 0;flex-wrap:wrap;justify-content:center">' +
          '<div class="card mini-stat"><div class="ms-label">You</div><div class="ms-val">' + HB.esc(relData.me.name || '—') + '</div></div>' +
          '<div class="card mini-stat"><div class="ms-label">Your person</div><div class="ms-val">' + HB.esc(partnerName) + '</div></div>' +
        '</div>' +
        '<p class="muted" style="text-align:center;margin-top:14px;font-size:13px">They\'re ' + HB.esc(partnerAge) + ' and they\'re all yours ♡</p>' +
        (sinceStr ? '<p class="muted" style="text-align:center;margin-top:4px;font-size:12px">Connected since ' + HB.esc(sinceStr) + '</p>' : '') +
        '<div class="presence-chip" style="justify-content:center" id="partner-presence"><i></i><span class="presence-text">checking…</span></div>';

      /* Identity prompt for Person 2 who joined without filling wizard */
      if (HB.rel.data.me && !(HB.rel.data.me.name || '').trim()) {
        body +=
          '<div class="card settings-card" style="margin-top:22px;max-width:480px;margin-left:auto;margin-right:auto">' +
            '<h3><span class="sc-emoji">🧸</span> Quick hello!</h3>' +
            '<p class="muted" style="font-size:13px;font-weight:600;margin:2px 0 12px">You joined by code without filling the intro — tell them who you are?</p>' +
            '<div class="row" style="gap:10px;flex-wrap:wrap">' +
              '<div class="field" style="flex:2;min-width:150px"><label class="label">Your name</label><input class="input" id="qi-name" placeholder="e.g. Dudu" maxlength="40" autocomplete="off"/></div>' +
              '<div class="field" style="flex:1;min-width:90px"><label class="label">Age</label><input class="input" id="qi-age" type="number" min="13" max="99" placeholder="e.g. 24"/></div>' +
            '</div>' +
            '<button class="btn btn-primary" id="qi-save" style="width:100%;margin-top:6px">Say hello ♡</button>' +
          '</div>';
      }

      /* Our photos — YOUR photo + THEIR photo side by side (mobile users
         can't see the sidebar, so this is where both phones set/change the
         two personal circle photos). */
      body +=
        '<div class="card settings-card dp-manage-card" style="margin-top:22px;max-width:560px;margin-left:auto;margin-right:auto">' +
          '<h3><span class="sc-emoji">📸</span> Our photos</h3>' +
          '<p class="muted" style="font-size:13px;font-weight:600;margin:2px 0 12px">Your photo sits on your chat bubbles, and ' + HB.esc(partnerName) + '\'s photo sits on theirs. Tap to preview, change or delete ♡</p>' +
          '<div class="dp-manage">' +
            '<button type="button" class="mng-dp" data-mng="me"><span class="mng-chip" data-chip="me"></span><span class="mng-label"><b>Your photo</b><i>your chat bubbles</i></span></button>' +
            '<button type="button" class="mng-dp" data-mng="them"><span class="mng-chip" data-chip="them"></span><span class="mng-label"><b>' + HB.esc(partnerName) + '\'s photo</b><i>their chat bubbles</i></span></button>' +
          '</div>' +
        '</div>' +
        journalHtml();

    } else if (waiting && code) {
      body =
        '<div class="connect-center">' +
          '<div class="dudu-big" data-du></div>' +
          '<h2 class="hand" style="font-size:30px">Waiting for your person ♡</h2>' +
          '<p class="wizard-step-hint">Share this code — they enter it on their phone to join you.</p>' +
          '<div class="code-card">' +
            '<div class="code-card-label">Your pairing code 💕</div>' +
            '<div class="code-card-value">' + HB.esc(code) + '</div>' +
            '<button class="code-card-copy" data-copy>' + HB.icon('copy') + ' Copy code</button>' +
          '</div>' +
          '<p class="muted" style="font-size:12.5px;margin-top:14px">You\'ll see a little celebration here the moment they connect. ♡</p>' +
        '</div>';
    } else {
      body =
        '<div class="connect-center">' +
          '<div class="dudu-big" data-du></div>' +
          '<h2 class="hand" style="font-size:30px">Join your person ♡</h2>' +
          '<p class="wizard-step-hint">Enter the code they shared with you to link your little worlds.</p>' +
          '<div class="field" style="max-width:320px;margin:10px auto 0"><input class="input input-lg code-input" id="code-input" placeholder="LOVE-XXXXX" maxlength="12" autocomplete="off"/></div>' +
          '<div class="code-error" id="code-error"></div>' +
          '<button class="btn btn-primary" id="code-connect">Connect ♡</button>' +
        '</div>';
    }

    main.innerHTML =
      '<div class="page">' +
      '<div class="dash-hello"><h1>Your <span class="hand" style="font-size:1.15em">partner</span> 💞</h1>' +
      '<p>' + (connected ? 'Connected — this is your shared space with ' + HB.esc(HB.firstNames().partner) + '.' : 'Bringing two phones into one little world.') + '</p></div>' +
      body +
      '</div>';

    var du = main.querySelector('[data-du]');
    if (du && HB.chars) HB.chars.hero(du, { which: 'both', actions: connected ? ['hug', 'kiss', 'love', 'romantic', 'dance', 'cuddle'] : ['happy', 'love', 'wait'], alt: 'Bubu ♡ Dudu' });

    /* live online-status chip on the connected view (replaceable single handler) */
    var pp = main.querySelector('#partner-presence');
    if (pp && HB.presence) {
      function setPartnerPresence(on) {
        if (!pp || !pp.isConnected) return;
        pp.classList.toggle('on', on);
        var txt = pp.querySelector('.presence-text');
        if (txt) txt.textContent = on ? (HB.firstNames().partner + ' is here ♡') : ('waiting for ' + HB.firstNames().partner + '…');
      }
      setPartnerPresence(HB.presence.online);
      HB.presence.onChange(setPartnerPresence);
    }

    var copy = main.querySelector('[data-copy]');
    if (copy && code) copy.addEventListener('click', function () {
      var btn = copy;
      navigator.clipboard.writeText(code).then(function () {
        btn.innerHTML = '✓ Copied 💕';
        setTimeout(function () { btn.innerHTML = HB.icon('copy') + ' Copy code'; }, 1600);
        HB.toast('Code copied — send it to your person ♡', '💌');
      }).catch(function () {
        HB.toast('Couldn\'t copy — long-press the code instead ♡', '🐻');
      });
    });

    var connectBtn = main.querySelector('#code-connect');
    if (connectBtn) {
      var input = main.querySelector('#code-input');
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') doConnect(input, main);
      });
      connectBtn.addEventListener('click', function () { doConnect(input, main); });
    }

    var qiSave = main.querySelector('#qi-save');
    if (qiSave) qiSave.addEventListener('click', function () {
      var nameEl = main.querySelector('#qi-name');
      var ageEl = main.querySelector('#qi-age');
      var name = (nameEl.value || '').trim();
      if (!name) { nameEl.focus(); HB.toast('Your name can\'t be empty ♡', '🐻'); return; }
      var age = (ageEl.value || '').trim();
      HB.state.profile.name = name;
      HB.state.profile.age = age;
      HB.save();
      HB.updateNav();
      if (HB.rel && HB.rel.updateMyProfile) {
        HB.rel.updateMyProfile({ name: name, age: age || '' }).then(function () {
          HB.toast('Your person will see this now ♡', '✨');
          if (main.isConnected) render(main);
        });
      } else {
        HB.toast('Saved ♡', '✨');
        if (main.isConnected) render(main);
      }
    });

    paintDpChips();
    var mngBtns = main.querySelectorAll('.mng-dp');
    for (var i = 0; i < mngBtns.length; i++) wireDpAction(mngBtns[i]);

    /* "What's new" feed — load the couple's change journal, then keep it
       live through the realtime subscription + hb:activity repaints. */
    if (connected && HB.journal) {
      HB.journal.load().then(function () { paintJournal(); }).catch(function () {});
    }
  }

  /* ---- "What's new" — the couple activity feed (newest first) ---- */
  function journalRow(it) {
    var ui = (HB.journal && HB.journal.kindUi) ? HB.journal.kindUi(it.kind) : { emoji: '✨', label: 'Little things' };
    var when = (HB.journal && HB.journal.timeAgo) ? HB.journal.timeAgo(it.created_at) : '';
    var left = it.img
      ? '<span class="j-emoji j-emoji-img"><img class="j-img" src="' + HB.esc(it.img) + '" alt=""/></span>'
      : '<span class="j-emoji">' + HB.esc(ui.emoji) + '</span>';
    return '<li class="j-item">' +
      left +
      '<span class="j-body">' +
        '<span class="j-msg">' + HB.esc(it.msg || '') + '</span>' +
        '<span class="j-meta"><b>' + HB.esc(it.actor || 'someone') + '</b> · ' + HB.esc(ui.label) + (when ? ' · <span class="j-when">' + HB.esc(when) + '</span>' : '') + '</span>' +
      '</span>' +
    '</li>';
  }

  function journalHtml() {
    var rows = (HB.journal && HB.journal.items) ? HB.journal.items() : [];
    var list = rows.length
      ? '<ul class="journal-list">' + rows.map(journalRow).join('') + '</ul>'
      : '<div class="journal-empty"><span class="j-empty-emoji">🐻</span><p>No changes yet — every time either of you tweaks something, it\'ll show up here, newest first ♡</p></div>';
    return '<div class="card settings-card journal-card" id="journal-card" style="margin-top:16px;max-width:560px;margin-left:auto;margin-right:auto">' +
      '<h3><span class="sc-emoji">✨</span> What\'s new</h3>' +
      '<p class="muted" style="font-size:13px;font-weight:600;margin:2px 0 12px">Every little change either of you makes — names, ages, photos, themes ♡</p>' +
      list +
    '</div>';
  }

  /* Swap in a fresh feed after a journal load/realtime event (only while
     the Partner page is on screen). */
  function paintJournal() {
    var m = document.getElementById('main');
    if (!m || !m.isConnected || HB.currentPath() !== '/partner') return;
    var card = m.querySelector('#journal-card');
    if (!card) return;
    var wrap = document.createElement('div');
    wrap.innerHTML = journalHtml();
    var fresh = wrap.firstChild;
    if (fresh) card.parentNode.replaceChild(fresh, card);
  }

  /* Return the current #main if the passed one has been swapped out. */
  function liveMain(old) {
    return (old && old.isConnected) ? old : document.getElementById('main');
  }

  /* Fill the two "Your photo / Their photo" chips with the current photos. */
  function paintDpChips() {
    var m = document.getElementById('main');
    if (!m || !m.isConnected || HB.currentPath() !== '/partner') return;
    var rows = m.querySelectorAll('.mng-dp');
    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      var isMe = row.getAttribute('data-mng') === 'me';
      var photo = isMe ? HB.dp.myPhoto() : HB.dp.partnerPhoto();
      var letter = String((isMe ? HB.state.profile.name : HB.state.profile.partner) || '♥').trim().charAt(0);
      var chip = row.querySelector('.mng-chip');
      if (!chip) continue;
      chip.innerHTML = photo
        ? '<img class="mng-img" src="' + HB.esc(photo) + '" alt=""/>'
        : '<span class="mng-inits">' + HB.esc(String(letter || '♥').toUpperCase()) + '</span>';
      var sub = row.querySelector('.mng-label i');
      if (sub) sub.textContent = photo
        ? 'tap to preview · change or delete below ♡'
        : 'not set yet — tap to add ♡';
    }
  }

  /* Tap a photo tile: no photo → pick ・ photo → big preview with
     Change photo + Delete photo (delete restores the first-letter initial). */
  function wireDpAction(row) {
    row.addEventListener('click', function () {
      var isMe = row.getAttribute('data-mng') === 'me';
      var photo = isMe ? HB.dp.myPhoto() : HB.dp.partnerPhoto();
      var setFn = isMe ? HB.dp.setMy : HB.dp.setPartner;
      var clearFn = isMe ? HB.dp.clearMy : HB.dp.clearPartner;
      var who = isMe ? 'your' : ((String(HB.state.profile.partner || '').trim() || 'their'));
      function pickAndSet() {
        HB.dp.pick().then(function (r) {
          if (r && r.error) { HB.toast('Couldn\'t read that image ♡', '🐻'); return; }
          if (!r || !r.dataUrl) return;
          setFn(r.dataUrl).then(function () {
            paintDpChips();
            HB.toast(isMe ? 'Your photo is set ♡' : (who.charAt(0).toUpperCase() + who.slice(1) + '\'s photo is set ♡'), '📸');
          });
        });
      }
      function doDelete() {
        var done = function () { paintDpChips(); HB.toast('Photo removed — initials back ♡', '🗑️'); };
        if (HB.confirm) HB.confirm(who + ' photo', 'Remove the picture? The first letter will show again ♡', done, 'Delete photo');
        else done();
      }
      if (photo) HB.dp.preview(photo, pickAndSet, doDelete, row.querySelector('.mng-chip'));
      else pickAndSet();
    });
  }

  function doConnect(input, main) {
    var err = main.querySelector('#code-error');
    var code = input.value.trim().toUpperCase();
    if (!code) { if (err) err.textContent = 'Enter the code your person shared ♡'; return; }
    err && (err.textContent = '');
    HB.rel.connectWithCode(code).then(function (res) {
      if (res && res.error) {
        var msg = String(res.error.message || '');
        var low = msg.toLowerCase();
        var rawCode = String(res.error.code || res.error.raw || '');
        var hint = msg.indexOf('INVALID') !== -1 ? 'That code didn\'t match — double-check it? ♡'
          : msg.indexOf('CODE_USED') !== -1 ? 'That code has already been used — ask them for a fresh one ♡'
          : msg.indexOf('SELF') !== -1 ? 'That\'s your own code, silly! 💞'
          : msg.indexOf('ALREADY') !== -1 ? 'You two are already connected! ♡'
          : msg.indexOf('NOT_AUTHENTICATED') !== -1 ? 'Please sign in first — reload this page, then try again ♡'
          : /fetch|network|offline|timeout|connect/i.test(low) ? 'You seem to be offline — check your connection and try again.'
          : msg.indexOf('MISSING_PROFILE') !== -1 || /23502|not-null/i.test(msg) ? 'Re-run supabase/run-all.sql in Supabase SQL Editor, then reload ♡'
          : msg.indexOf('NOT_') !== -1 ? 'Please sign in first.'
          : (rawCode ? 'Hmm, that didn\'t work (' + HB.esc(rawCode) + '). Try again?' : 'Hmm, that didn\'t work. Try again?');
        if (err) err.textContent = hint;
        return;
      }
      HB.toast('You\'re connected! Welcome to your little world ♡', '🎉');
      HB.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
      render(main);
    });
  }

  HB.route('/partner', function (main) {
    render(main);
    if (!ready) {
      ready = true;
      window.addEventListener('hb:relchange', function () {
        if (HB.currentPath() === '/partner') render(document.getElementById('main'));
      });
      window.addEventListener('hb:activity', function () {
        if (HB.currentPath() === '/partner' && document.getElementById('main').isConnected) paintJournal();
      });
    }
  });
})();
