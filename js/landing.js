/* ============================================================
   LANDING — clean two-card entry screen + pairing flow
   ------------------------------------------------------------
   Three possible states:
     1. Fresh — never onboarded → two equal cards: Create / Join
     2. Creator waiting — onboarded, status=waiting → show pairing code
     3. Connected — onboarded, status=connected → redirect to home
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  function renderLanding(main) {
    if (HB.state.onboarded && HB.rel && HB.rel.data && HB.rel.data.status === 'connected') {
      HB.navigate('/home');
      return;
    }

    if (HB.state.onboarded && HB.rel && HB.rel.data && HB.rel.data.status === 'waiting') {
      var code = HB.rel.data.relationship && HB.rel.data.relationship.pairing_code;
      renderWaiting(main, code);
      return;
    }

    renderFresh(main);
  }

  function renderWaiting(main, code) {
    code = code || 'LOVE-?????';
    var n = HB.firstNames();

    main.innerHTML =
      '<section class="landing">' +
      '<div class="landing-badge"><span class="pulse-dot"></span> A little world made for two ♡</div>' +
      '<h1>Your little world is <span class="accent">ready</span> ♡</h1>' +
      '<p class="sub">Hi ' + HB.esc(n.me) + ' — share this code with your person. They\'ll enter it on their phone to join you.</p>' +
      '<div class="code-card" style="max-width:380px;margin:0 auto">' +
        '<div class="code-card-label">Your pairing code 💕</div>' +
        '<div class="code-card-value">' + HB.esc(code) + '</div>' +
        '<button class="code-card-copy" data-copy>' + HB.icon('copy') + ' Copy code</button>' +
      '</div>' +
      '<p class="muted" style="font-size:13px;margin-top:14px;font-weight:600">We\'ll celebrate the moment they connect. ♡</p>' +
      '<button class="btn btn-primary btn-lg" data-home>Go to my little world →</button>' +
      '<div class="landing-hearts"><span>♡</span><span>♡</span><span>♡</span></div>' +
      '</section>';

    main.querySelector('[data-copy]').addEventListener('click', function () {
      var btn = this;
      navigator.clipboard.writeText(code).then(function () {
        btn.innerHTML = '✓ Copied 💕';
        setTimeout(function () { btn.innerHTML = HB.icon('copy') + ' Copy code'; }, 1600);
        HB.toast('Code copied — send it to your person ♡', HB.icon('heart'));
      }).catch(function () {
        HB.toast('Couldn\'t copy — long-press the code instead ♡', HB.icon('heart'));
      });
    });

    main.querySelector('[data-home]').addEventListener('click', function () { HB.navigate('/home'); });

    window.addEventListener('hb:relchange', function onConnect() {
      if (HB.rel.data.status === 'connected') {
        window.removeEventListener('hb:relchange', onConnect);
        HB.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
        HB.toast('You\'re connected! Welcome to your little world ♡', HB.icon('sparkle'));
        setTimeout(function () { HB.navigate('/home'); }, 800);
      }
    });
  }

  function renderFresh(main) {
    main.innerHTML =
      '<section class="landing">' +
      '<div class="landing-badge"><span class="pulse-dot"></span> A little world made for two ♡</div>' +
      '<h1>Two phones, one little <span class="accent">world</span> ♡</h1>' +
      '<p class="sub">Where your chats, memories, and daily rituals live together.</p>' +
      '<div class="landing-cards">' +
        '<button class="landing-card lc-create" data-go="onboarding">' +
          '<div class="lc-icon" style="background:linear-gradient(135deg,var(--primary),var(--primary-deep))">' + HB.icon('heart') + '</div>' +
          '<div class="lc-title">Create our world</div>' +
          '<div class="lc-sub">Start fresh — get a pairing code to share with your person.</div>' +
          '<div class="lc-btn btn btn-primary">Create our world ♡</div>' +
        '</button>' +
        '<button class="landing-card lc-join" data-login>' +
          '<div class="lc-icon" style="background:linear-gradient(135deg,#D8C6F5,#c5b5e9)">' + HB.icon('sparkle') + '</div>' +
          '<div class="lc-title">I have a code</div>' +
          '<div class="lc-sub">Join your person by entering the code they sent you.</div>' +
          '<div class="lc-btn btn btn-soft">Join with code ♡</div>' +
        '</button>' +
      '</div>' +
      '<div class="landing-hearts"><span>♡</span><span>♡</span><span>♡</span><span>♡</span><span>♡</span></div>' +
      '</section>';

    main.querySelector('[data-go="onboarding"]').addEventListener('click', function () {
      HB.navigate('/onboarding');
    });

    var loginBtn = main.querySelector('[data-login]');
    if (loginBtn) loginBtn.addEventListener('click', showPairModal);
  }

  HB.route('/', function (main) {
    console.log('[NAVIGATION] Landing page opened (onboarded:', HB.state.onboarded, ')');

    /* If backend is configured and we have an auth session, init the
       relationship to detect waiting/connected state before rendering. */
    var backend = !!(window.HB && HB.db && HB.db.configured());
    var hasUser = !!(window.HB && HB.auth && HB.auth.user());

    if (backend && hasUser && HB.state.onboarded) {
      /* Check Supabase status — init() will set rel.data.status to
         'waiting' or 'connected', then we re-render with the right view */
      HB.rel.init().then(function () {
        renderLanding(main);
      }).catch(function () {
        /* Backend error — show fresh landing as fallback */
        renderFresh(main);
      });
      /* Show a minimal loading state while we check */
      main.innerHTML = '<section class="landing"><div class="connect-center"><div class="typing"><i></i><i></i><i></i></div></div></section>';
      return;
    }

    renderLanding(main);
  });

  /* ---- Pairing modal (Person 2 enters code) ---- */
  function showPairModal() {
    HB.modal({
      title: 'Join your person ♡',
      text: 'Enter the pairing code they shared with you — no email or password needed.',
      body:
        '<div class="auth-form">' +
        '<div class="field"><label class="label">Pairing code</label><input class="input input-lg" id="pair-code" placeholder="LOVE-XXXXX" maxlength="12" autocomplete="off" style="text-align:center;letter-spacing:1.5px;text-transform:uppercase"/></div>' +
        '<div class="code-error" id="pair-error"></div>' +
        '</div>',
      actions: [
        { label: 'Pair with your person ♡', kind: 'btn-primary', onClick: function (ov) { doPair(ov); return false; } }
      ]
    });
    var codeInput = document.getElementById('pair-code');
    if (codeInput) setTimeout(function () { codeInput.focus(); }, 50);
    if (codeInput) codeInput.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') doPair(document.querySelector('.modal-overlay:last-of-type') || null);
    });
  }

  function doPair(ov) {
    var err = ov && ov.querySelector('#pair-error');
    var codeInput = ov && ov.querySelector('#pair-code');
    if (!codeInput) return false;
    var code = codeInput.value.trim().toUpperCase();
    if (!code) {
      if (err) err.textContent = 'Enter the code your person shared ♡';
      return false;
    }

    if (!HB.db || !HB.db.configured()) {
      if (err) err.textContent = 'Cloud connection isn\'t set up yet — open js/config.js first.';
      return false;
    }

    err && (err.textContent = 'Pairing you two…');
    var finish = function (out) {
      console.log('[PAIRING] connectWithCode result:', JSON.stringify(out));
      if (out && out.error) {
        var msg = String(out.error.message || '');
        var low = msg.toLowerCase();
        var rawCode = String(out.error.code || out.error.raw || '');
        var hint = msg.indexOf('INVALID') !== -1 ? 'That code didn\'t match — double-check it? ♡'
          : msg.indexOf('CODE_USED') !== -1 ? 'This couple is already paired 💕 — ask them for a fresh code.'
          : msg.indexOf('SELF') !== -1 ? 'That\'s your own code, silly! ♡'
          : msg.indexOf('ALREADY') !== -1 ? 'You\'re already part of a couple — you can only be in one ♡'
          : msg.indexOf('NOT_AUTHENTICATED') !== -1 ? 'Please sign in first — reload this page, then try again ♡'
          : /fetch|network|offline|timeout|connect/i.test(low) ? 'You seem to be offline — check your connection and try again.'
          : msg.indexOf('MISSING_PROFILE') !== -1 || /23502|not-null/i.test(msg) ? 'Re-run supabase/run-all.sql in Supabase SQL Editor, then reload ♡'
          : msg.indexOf('NOT_') !== -1 ? 'Hmm, that didn\'t work. Try again?'
          : (rawCode ? 'Hmm, that didn\'t work (' + HB.esc(rawCode) + '). Try again?' : 'Hmm, that didn\'t work. Try again?');
        err && (err.textContent = hint);
        return false;
      }
      HB.toast('You\'re connected! Welcome to your little world ♡', HB.icon('sparkle'));
      if (ov) {
        var c = ov.querySelector('[data-close]');
        if (c) c.click();
      }
      HB.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
      if (HB.enterWorld) HB.enterWorld(); else HB.navigate('/home');
      return true;
    };

    HB.auth.signInAnonymously().then(function (res) {
      if (res && res.error) {
        console.error('[PAIRING] Anonymous sign-in failed:', res.error);
        var raw = String((res.error && (res.error.message || res.error)) || '');
        var hint = /network|fetch|failed|offline|NetworkError|ERR_NETWORK|timeout/i.test(raw)
          ? 'You seem to be offline — check your connection and try again ♡'
          : 'Couldn\'t create your little identity. Try again? ♡';
        err && (err.textContent = hint);
        return false;
      }
      console.log('[PAIRING] Anonymous sign-in successful, user:', res.user ? res.user.id.substring(0, 8) + '...' : 'none');
      return HB.rel.init().then(function () {
        var me = HB.rel.data.me;

        /* Already paired? Nothing to do — open the world. */
        if (HB.rel.data.status === 'connected' || (me && me.relationship_id)) {
          if (HB.enterWorld) { HB.enterWorld(); return true; }
          HB.navigate('/home');
          return true;
        }

        /* Person 2 needs a profile row before the RPC can pair them.
           Create a minimal one (name/age are empty — they don't need
           the wizard). */
        var ensure = me
          ? Promise.resolve()
          : HB.rel.ensureProfile({ name: HB.state.profile.name || '', age: HB.state.profile.age || '' });
        return ensure.then(function (r) {
          if (r && r.error) {
            err && (err.textContent = 'Couldn\'t set up your little identity — try again? ♡');
            return false;
          }
          return HB.rel.connectWithCode(code).then(finish);
        });
      });
    });
    return false;
  }
})();
