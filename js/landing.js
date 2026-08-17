/* ============================================================
   LANDING — Dudu & Bubu hero + account entry
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  HB.route('/', function (main) {
    console.log('[NAVIGATION] Landing page opened (onboarded:', HB.state.onboarded, ', authed:', !!(window.HB && HB.auth && HB.auth.user()), ')');
    // If already onboarded, show the personalized dashboard instead
    if (HB.state.onboarded) {
      if (HB.renderHome) { HB.renderHome(main); return; }
      HB.navigate('/home');
      return;
    }

    /* After a reset/fresh start: HB.state.onboarded is false.
       Even if Supabase auth tokens linger briefly, we must NOT show
       the "Signed in as you" / "Open your world" flow. The user
       should always see the fresh start landing page. */

    var authed = window.HB && HB.auth && HB.auth.user() && HB.state.onboarded;

    var status = authed
      ? '<div class="landing-account"><span class="landing-avatar">' + HB.chars.avatarImg('dudu', 'cute', 'landing-avatar') + '</span>' +
        '<span>Signed in as <b>' + HB.esc(HB.firstNames().me) + '</b></span>' +
        '<button class="btn btn-primary btn-sm" data-open>Open your world ♡</button></div>'
      : '<div class="landing-account"><span class="pulse-dot"></span>' +
        '<span>This little world lives on two phones — yours and your person&rsquo;s.</span>' +
        '<button class="btn btn-soft btn-sm" data-login>I already have our space</button></div>';

    main.innerHTML =
      '<section class="landing">' +
      '<div class="landing-badge"><span class="pulse-dot"></span> A little world made for two ♡</div>' +
      '<div class="landing-dudu" data-dudu></div>' +
      '<h1>A little corner made just for <span class="accent">you two</span> ♡</h1>' +
      '<p class="sub">A private little world for two hearts — your chat, your memories, your daily bond quiz —<br/>all of it, just for you two.</p>' +
      '<div class="landing-ctas">' +
        '<button class="btn btn-primary btn-lg" data-go="onboarding">Create Our Space ♡</button>' +
      '</div>' +
      '<div class="landing-status">' + status + '</div>' +
      '</section>';

    var stage = main.querySelector('[data-dudu]');
    if (stage && HB.chars) {
      HB.chars.hero(stage, {
        which: Math.random() < 0.5 ? 'dudu' : 'bubu',
        alternate: true,
        actions: ['happy', 'cute', 'think', 'wait', 'dance', 'funny'],
        size: 'land',
        alt: 'Bubu ♡ Dudu'
      });
      stage.style.cursor = 'pointer';
      stage.addEventListener('click', function () { HB.navigate('/onboarding'); });
    }

    main.querySelector('[data-go="onboarding"]').addEventListener('click', function () {
      HB.navigate('/onboarding');
    });

    var openBtn = main.querySelector('[data-open]');
    if (openBtn) openBtn.addEventListener('click', function () {
      if (HB.enterWorld) HB.enterWorld(); else HB.navigate('/home');
    });

    var loginBtn = main.querySelector('[data-login]');
    if (loginBtn) loginBtn.addEventListener('click', showPairModal);
  });

  /* "I already have our space" — a single pairing code, nothing else.
     No email, no password. The other person just enters the LOVE- code. */
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
      if (out && out.error) {
        var msg = String(out.error.message || '');
        var hint = msg.indexOf('INVALID') !== -1 ? 'That code didn\'t match — double-check it? ♡'
          : msg.indexOf('CODE_USED') !== -1 ? 'This couple is already paired 💕 — ask them for a fresh code.'
          : msg.indexOf('SELF') !== -1 ? 'That\'s your own code, silly! 💞'
          : msg.indexOf('ALREADY') !== -1 ? 'You\'re already part of a couple — you can only be in one ♡'
          : msg.indexOf('NOT_') !== -1 ? 'Hmm, that didn\'t work. Try again?'
          : msg.indexOf('NETWORK') !== -1 ? 'You seem to be offline — check your connection and try again.'
          : 'Hmm, that didn\'t work. Try again?';
        err && (err.textContent = hint);
        return false;
      }
      HB.toast('You\'re connected! Welcome to your little world ♡', '🎉');
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
        console.error('[SUPABASE] Anonymous sign-in failed during pairing:', res.error);
        err && (err.textContent = 'Couldn\'t create your little identity. Try again? ♡');
        return;
      }
      console.log('[SUPABASE] Anonymous sign-in successful, initializing relationship');
      return HB.rel.init().then(function () {
        var me = HB.rel.data.me;

        /* Already paired? Nothing to do — open the world. */
        if (me && me.partner_id) {
          if (HB.enterWorld) { HB.enterWorld(); return true; }
          HB.navigate('/home');
          return true;
        }

        /* A valid code means IMMEDIATE pairing. If Person 2 has no
           profile row yet, create a minimal one (their own identity)
           and connect — never send them through the setup form. */
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
