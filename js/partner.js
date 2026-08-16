/* ============================================================
   PARTNER — your connection to your person ♡
   ------------------------------------------------------------
   Shows your LOVE- code (owner) or a code entry (connector),
   live connection status, and your shared bond details.
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
    var code = relData.me && relData.me.pairing_code;

    var body = '';

    if (connected) {
      var partnerName = (relData.partner && relData.partner.name) || HB.state.profile.partner || 'your person';
      var partnerAge = relData.partner && relData.partner.age != null ? String(relData.partner.age) : (HB.state.profile.partnerAge || '—');
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
        '<p class="muted" style="text-align:center;margin-top:14px;font-size:13px">They\'re ' + HB.esc(partnerAge) + ' and they\'re all yours ♡</p>';
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
  }

  function doConnect(input, main) {
    var err = main.querySelector('#code-error');
    var code = input.value.trim().toUpperCase();
    if (!code) { if (err) err.textContent = 'Enter the code your person shared ♡'; return; }
    err && (err.textContent = '');
    HB.rel.connectWithCode(code).then(function (res) {
      if (res && res.error) {
        var msg = String(res.error.message || '');
        var hint = msg.indexOf('INVALID') !== -1 ? 'That code didn\'t match — double-check it? ♡'
          : msg.indexOf('CODE_USED') !== -1 ? 'That code has already been used — ask them for a fresh one ♡'
          : msg.indexOf('SELF') !== -1 ? 'That\'s your own code, silly! 💞'
          : msg.indexOf('ALREADY') !== -1 ? 'You two are already connected! ♡'
          : msg.indexOf('NOT_') !== -1 ? 'Please sign in first.'
          : 'Hmm, that didn\'t work. Try again?';
        if (err) err.textContent = hint;
        return;
      }
      HB.toast('You\'re connected! Welcome to your little world ♡', '🎉');
      HB.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
      HB.navigate('/partner');
    });
  }

  HB.route('/partner', function (main) {
    render(main);
    if (!ready) {
      ready = true;
      window.addEventListener('hb:relchange', function () {
        if (location.hash === '#/partner') render(document.getElementById('main'));
      });
    }
  });
})();
