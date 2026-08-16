/* ============================================================
   ONBOARDING — personalization wizard + anonymous account + code
   ------------------------------------------------------------
   Steps: about you → about them → ages → relationship → vibe →
   talking style → something special → theme.
   No email or password anywhere — each phone quietly gets an
   anonymous Supabase identity, and LOVE- codes pair them.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  function optionCards(list, selected, multi) {
    return list.map(function (item) {
      var sel = selected.indexOf(item.label) !== -1 ? ' selected' : '';
      return '<button type="button" class="option-card' + sel + '" data-label="' + HB.esc(item.label) + '">' +
        '<span class="opt-check">✓</span>' +
        '<span class="opt-emoji">' + item.emoji + '</span>' +
        '<span>' + item.label + '</span>' +
        '</button>';
    }).join('');
  }

  function themeCards() {
    return HB.THEMES.map(function (t) {
      var sel = HB.state.profile.theme === t.id ? ' selected' : '';
      return '<button type="button" class="theme-card' + sel + '" data-theme="' + t.id + '">' +
        '<span class="theme-swatch" style="background:' + t.swatch + '">' + t.icon + '</span>' +
        '<span class="tname">' + t.name + '</span></button>';
    }).join('');
  }

  var N_STEPS = 9;

  /* Map a technical error to a short, friendly message. */
  function friendly(err) {
    var msg = String((err && err.message) || err || '');
    var code = String((err && err.code) || '');
    var all = msg + ' ' + code;
    if (/NOT_CONFIGURED/.test(all)) return 'Cloud connection isn\'t set up yet — open js/config.js first.';
    if (/NOT_AUTHENTICATED|sign in/i.test(all)) return 'Please sign in first, then try again ♡';
    if (/23505|unique/.test(all)) return 'That code is already in use — we made you a fresh one, try again ♡';
    if (/PGRST205|42P01|42703|Could not find|does not exist|schema/.test(all)) return 'The database isn\'t ready yet — run supabase/schema.sql, then try again ♡';
    if (/permission denied|42501|row-level security|RLS/.test(all)) return 'We couldn\'t save that — permission issue on this account.';
    if (/network|fetch|failed|offline/i.test(all)) return 'You seem to be offline — check your connection and try again ♡';
    if (/CODE_USED/.test(msg)) return 'That code was already used — ask them for a fresh one ♡';
    if (/INVALID_CODE/.test(msg)) return 'That code didn\'t match — double-check it? ♡';
    if (/SELF_CODE/.test(msg)) return 'That\'s your own code, silly! 💞';
    if (/ALREADY_CONNECTED/.test(msg)) return 'You\'re already part of a couple ♡';
    return 'Hmm, something went wrong. Please try again ♡';
  }

  HB.route('/onboarding', function (main) {
    var backend = !!(window.HB && HB.db && HB.db.configured());

    /* Safety net: if we arrived here holding a pairing code (and already
       have an anonymous identity), pair IMMEDIATELY — the person joining
       must never be pushed through the details wizard first. */
    if (backend && HB.pendingCode && HB.auth.user()) {
      var pending = HB.pendingCode;
      HB.pendingCode = null;
      main.innerHTML = '<div class="page"><div class="connect-center"><h3>Pairing you two…</h3>' +
        '<div class="typing"><i></i><i></i><i></i></div></div></div>';
      HB.rel.connectWithCode(pending).then(function (out) {
        if (out && out.error) {
          main.innerHTML = '<div class="page"><div class="connect-center"><p>' + friendly(out.error) + '</p>' +
            '<button class="btn btn-soft" data-home>Back to start</button></div></div>';
          main.querySelector('[data-home]').addEventListener('click', function () { HB.navigate('/'); });
          return;
        }
        HB.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
        HB.toast('You\'re connected! Welcome to your little world ♡', '🎉');
        if (HB.enterWorld) HB.enterWorld(); else HB.navigate('/home');
      });
      return;
    }

    var step = 0;
    var draft = {
      name: HB.state.profile.name, partner: HB.state.profile.partner,
      age: HB.state.profile.age, partnerAge: HB.state.profile.partnerAge,
      relationship: HB.state.profile.relationship,
      vibes: HB.state.profile.vibes.slice(), chatStyle: HB.state.profile.chatStyle.slice(),
      story: HB.state.profile.story, theme: HB.state.profile.theme,
      togetherSince: HB.state.profile.togetherSince
    };

    var TITLES = [
      'Step 1 of ' + N_STEPS + ' · About you',
      'Step 2 of ' + N_STEPS + ' · About them',
      'Step 3 of ' + N_STEPS + ' · You, a little more',
      'Step 4 of ' + N_STEPS + ' · And them',
      'Step 5 of ' + N_STEPS + ' · Your relationship',
      'Step 6 of ' + N_STEPS + ' · Your vibe',
      'Step 7 of ' + N_STEPS + ' · How we should talk',
      'Step 8 of ' + N_STEPS + ' · Something special',
      'Step 9 of ' + N_STEPS + ' · Pick a vibe theme'
    ];

    function render() {
      var html = '<div class="wizard">' +
        '<div class="wizard-head"><div class="hand">' + (step === 0 ? 'hello, sweet stranger ♡' : 'we\'re getting to know you') + '</div>' +
        '<h2>' + TITLES[step] + '</h2></div>' +
        '<div class="progress"></div>' +
        '<div class="wizard-card"></div>' +
        '<div class="wizard-actions"></div>' +
        '</div>';

      main.innerHTML = html;
      renderStep(main.querySelector('.wizard-card'), main.querySelector('.wizard-actions'), main.querySelector('.progress'));
    }

    function renderStep(card, actions, progress) {
      var dots = '';
      for (var i = 0; i < N_STEPS; i++) {
        var cls = i < step ? 'done' : i === step ? 'current' : '';
        dots += '<span class="pstep ' + cls + '"></span>';
      }
      dots += '<span class="plabel">' + (step + 1) + ' / ' + N_STEPS + '</span>';
      progress.innerHTML = dots;

      var body = '';

      switch (step) {
        case 0:
          body = '<p class="wizard-step-q">What should we call <span class="hand" style="font-size:1.3em">you</span>?</p>' +
            '<p class="wizard-step-hint">Your name — your person will see this exact name.</p>' +
            '<div class="field"><input class="input input-lg" id="w-name" placeholder="Your name" value="' + HB.esc(draft.name) + '" maxlength="30" /></div>';
          break;
        case 1:
          body = '<p class="wizard-step-q">What\'s your <span class="hand" style="font-size:1.3em">person\'s</span> name?</p>' +
            '<p class="wizard-step-hint">If they\'re joining later, we\'ll use their real name the moment they connect. ♡</p>' +
            '<div class="field"><input class="input input-lg" id="w-partner" placeholder="Partner\'s name" value="' + HB.esc(draft.partner) + '" maxlength="30" /></div>';
          break;
        case 2:
          body = '<p class="wizard-step-q">How old are <span class="hand" style="font-size:1.3em">you</span>?</p>' +
            '<p class="wizard-step-hint">Just a number, but we like knowing you.</p>' +
            '<div class="field"><input class="input input-lg" id="w-age" type="number" min="13" max="99" placeholder="Your age" value="' + HB.esc(draft.age) + '" /></div>';
          break;
        case 3:
          body = '<p class="wizard-step-q">How old is <span class="hand" style="font-size:1.3em">your person</span>?</p>' +
            '<p class="wizard-step-hint">Equally important. (We won\'t tell them you told us — this one stays just between us.)</p>' +
            '<div class="field"><input class="input input-lg" id="w-page" type="number" min="13" max="99" placeholder="Partner\'s age" value="' + HB.esc(draft.partnerAge) + '" /></div>';
          break;
        case 4:
          body = '<p class="wizard-step-q">What\'s your <span class="hand" style="font-size:1.3em">relationship</span>?</p>' +
            '<p class="wizard-step-hint">Pick the closest one — it\'s shared with both of you.</p>' +
            '<div class="option-cards">' + optionCards(HB.RELATIONSHIPS, draft.relationship ? [draft.relationship] : [], false) + '</div>';
          break;
        case 5:
          body = '<p class="wizard-step-q">Tell us your <span class="hand" style="font-size:1.3em">vibe</span> ♡</p>' +
            '<p class="wizard-step-hint">Pick as many as feel like you two.</p>' +
            '<div class="option-cards">' + optionCards(HB.VIBES, draft.vibes, true) + '</div>';
          break;
        case 6:
          body = '<p class="wizard-step-q">How should we <span class="hand" style="font-size:1.3em">talk</span> to each other?</p>' +
            '<p class="wizard-step-hint">Your personality mix. Multiple picks welcome.</p>' +
            '<div class="option-cards">' + optionCards(HB.CHAT_STYLES, draft.chatStyle, true) + '</div>';
          break;
        case 7:
          body = '<p class="wizard-step-q">What\'s something <span class="hand" style="font-size:1.3em">special</span> about your relationship?</p>' +
            '<p class="wizard-step-hint">Maybe your first meeting, an inside joke, your favorite memory — shared with you two, forever.</p>' +
            '<div class="field"><textarea class="textarea" id="w-story" placeholder="Maybe your first meeting, an inside joke, your favorite memory..." maxlength="600">' + HB.esc(draft.story) + '</textarea></div>' +
            '<div class="field"><label class="label">Together since (optional)</label><input class="input" id="w-together" type="date" value="' + HB.esc(draft.togetherSince || '') + '" /></div>';
          break;
        case 8:
          body = '<p class="wizard-step-q">Choose your favorite <span class="hand" style="font-size:1.3em">theme</span></p>' +
            '<p class="wizard-step-hint">You can change it anytime in Settings.</p>' +
            '<div class="theme-picker">' + themeCards() + '</div>' +
            '<div class="mt-16 theme-live" style="text-align:center;font-size:13px;color:var(--ink-soft);font-weight:700">Live preview is active — just pick!</div>';
          break;
      }

      card.innerHTML = body;
      wireCard(card);

      var back = '<button class="btn btn-ghost" data-wback>' + (step === 0 ? 'Start over' : 'Back') + '</button>';
      var next = '<button class="btn btn-primary" data-wnext>' + (step === N_STEPS - 1 ? 'Create Our World ♡' : 'Continue ♡') + '</button>';
      actions.innerHTML = '<div>' + back + '</div>' + '<div>' + next + '</div>';

      actions.querySelector('[data-wnext]').addEventListener('click', function () { nextStep(); });
      actions.querySelector('[data-wback]').addEventListener('click', function () {
        if (step === 0) { HB.navigate('/'); return; }
        step--; render();
      });

      var input = card.querySelector('input[type="text"], input[type="number"], input[type="email"], input:not([type]), textarea');
      if (input) {
        input.focus();
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            if (input.tagName === 'TEXTAREA') return;
            e.preventDefault(); nextStep();
          }
        });
        if (input.id === 'w-name' || input.id === 'w-partner') {
          input.addEventListener('input', function () { HB.titleCaseInput(input); });
        }
      }

      var themePicker = card.querySelector('.theme-picker');
      if (themePicker) themePicker.addEventListener('click', function (e) {
        var t = e.target.closest('[data-theme]');
        if (!t) return;
        draft.theme = t.dataset.theme;
        themePicker.querySelectorAll('.theme-card').forEach(function (c) { c.classList.toggle('selected', c.dataset.theme === draft.theme); });
        document.body.className = document.body.className.replace(/theme-[a-z]+/, '').trim();
        document.body.classList.add('theme-' + draft.theme);
      });
    }

    function wireCard(card) {
      card.querySelectorAll('.option-card').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var multi = step === 5 || step === 6;
          if (multi) {
            btn.classList.toggle('selected');
          } else {
            card.querySelectorAll('.option-card').forEach(function (c) { c.classList.remove('selected'); });
            btn.classList.add('selected');
          }
          var sel = [];
          card.querySelectorAll('.option-card.selected').forEach(function (c) { sel.push(c.dataset.label); });
          if (step === 4) draft.relationship = sel[0] || '';
          if (step === 5) draft.vibes = sel;
          if (step === 6) draft.chatStyle = sel;
        });
      });
    }

    function nextStep() {
      var card = main.querySelector('.wizard-card');

      switch (step) {
        case 0:
          var name = HB.titleCase((card.querySelector('#w-name').value || '').trim());
          if (!name) { HB.toast('We\'d love your name first!', '🐻'); return; }
          draft.name = name; break;
        case 1:
          var partner = HB.titleCase((card.querySelector('#w-partner').value || '').trim());
          if (!partner) { HB.toast('What\'s their name?', '🐻'); return; }
          draft.partner = partner; break;
        case 2:
          draft.age = card.querySelector('#w-age').value.trim(); break;
        case 3:
          draft.partnerAge = card.querySelector('#w-page').value.trim(); break;
        case 4:
          if (!draft.relationship) { HB.toast('Pick one that feels like you two ♡', '💘'); return; }
          break;
        case 5:
          if (!draft.vibes.length) { HB.toast('Pick at least one vibe ♡', '🎈'); return; }
          break;
        case 6:
          if (!draft.chatStyle.length) { HB.toast('Pick at least one talking style ♡', '💬'); return; }
          break;
        case 7:
          draft.story = card.querySelector('#w-story').value.trim();
          draft.togetherSince = card.querySelector('#w-together').value || '';
          break;
        case 8:
          finalize();
          return;
      }

      step++;
      render();
    }

    function finalize() {
      Object.assign(HB.state.profile, draft);
      HB.state.onboarded = true;
      HB.save();

      HB.state.chatHistory = [{
        id: HB.uid(), from: 'ai', text: HB.chatIntro().text, time: Date.now()
      }];
      HB.save();

      if (!backend) {
        celebrate();
        setTimeout(function () { HB.navigate('/home'); }, 600);
        return;
      }
      setupAccount();
    }

    function celebrate() {
      HB.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
      HB.toast('Your little world is ready ✨', '🎉');
    }

    function setupAccount() {
      var card = main.querySelector('.wizard-card');
      var actions = main.querySelector('.wizard-actions');
      var progress = main.querySelector('.progress');
      progress.innerHTML = '';
      actions.innerHTML = '';
      card.innerHTML = '<div class="connect-center"><div class="dudu-small-stage" data-du></div>' +
        '<h3>Setting up your little world…</h3>' +
        '<div class="typing"><i></i><i></i><i></i></div></div>';
      card.querySelector('[data-du]').innerHTML = HB.chars.stageHtml({ which: 'dudu', action: 'think', size: 'sm', alt: 'Dudu is thinking' });

      var run = function () {
        HB.rel.ensureProfile({
          name: draft.name,
          age: draft.age
        }).then(function (res) {
          if (res && res.error) {
            throw new Error(res.error.message || 'PROFILE_FAILED');
          }
          return HB.rel.init(true).then(function () {
            if (HB.pendingCode) {
              var pending = HB.pendingCode;
              HB.pendingCode = null;
              return HB.rel.connectWithCode(pending).then(function (out) {
                if (out && out.error) throw new Error(out.error.message || 'CONNECT_FAILED');
                celebrate();
                setTimeout(function () { HB.navigate('/home'); }, 600);
              });
            }
            var code = HB.rel.data.me && HB.rel.data.me.pairing_code;
            if (HB.rel.data.status === 'connected') {
              celebrate();
              setTimeout(function () { HB.navigate('/home'); }, 600);
            } else {
              showCode(code);
            }
          });
        }).catch(function (err) {
          var msg = friendly(err);
          card.innerHTML = '<div class="connect-center"><p>' + msg + '</p>' +
            '<button class="btn btn-soft" data-retry>Try again</button></div>';
          card.querySelector('[data-retry]').addEventListener('click', run);
        });
      };

      var go = function () {
        run();
      };

      if (HB.auth.user()) {
        go();
        return;
      }
      HB.auth.signInAnonymously().then(function (res) {
        if (res && res.error) {
          card.innerHTML = '<div class="connect-center"><p>We couldn\'t create your little identity: ' + HB.esc(String(res.error.message || res.error)) + '</p>' +
            '<button class="btn btn-soft" data-back>Back to start</button></div>';
          card.querySelector('[data-back]').addEventListener('click', function () { HB.navigate('/onboarding'); });
          return;
        }
        go();
      });
    }

    /* Reveal the LOVE- code so the other person can pair with you */
    function showCode(code) {
      code = code || 'LOVE-?????';
      var card = main.querySelector('.wizard-card');
      var actions = main.querySelector('.wizard-actions');
      var progress = main.querySelector('.progress');
      progress.innerHTML = '';
      actions.innerHTML = '';

      card.innerHTML =
        '<div class="connect-center">' +
          '<div class="dudu-small-stage" data-du></div>' +
          '<h2 class="hand" style="font-size:30px">Your person is next ♡</h2>' +
          '<p class="wizard-step-hint">Share this code with your person — they\'ll open your little world on <b>their</b> phone, tap "I already have our space", and enter it to connect with you.</p>' +
          '<div class="code-card">' +
            '<div class="code-card-label">Your pairing code 💕</div>' +
            '<div class="code-card-value">' + HB.esc(code) + '</div>' +
            '<button class="code-card-copy" data-copy>' + HB.icon('copy') + ' Copy code</button>' +
          '</div>' +
          '<p class="muted" style="font-size:12.5px;margin-top:16px">Your little world is ready — you can also go in now and wait. We\'ll throw a tiny celebration the moment they connect. ♡</p>' +
          '<button class="btn btn-ghost" data-home>Go to my little world →</button>' +
        '</div>';

      HB.chars.hero(card.querySelector('[data-du]'), { which: 'both', actions: ['love', 'hug', 'happy', 'dance', 'wait'], size: 'sm', alt: 'Bubu ♡ Dudu' });

      card.querySelector('[data-copy]').addEventListener('click', function () {
        var btn = this;
        navigator.clipboard.writeText(code).then(function () {
          btn.innerHTML = '✓ Copied 💕';
          setTimeout(function () { btn.innerHTML = HB.icon('copy') + ' Copy code'; }, 1600);
          HB.toast('Code copied — send it to your person ♡', '💌');
        }).catch(function () {
          HB.toast('Couldn\'t copy — long-press the code instead ♡', '🐻');
        });
      });

      card.querySelector('[data-home]').addEventListener('click', function () { HB.navigate('/home'); });

      // The moment the partner connects, celebrate and head home.
      window.addEventListener('hb:relchange', function onConnect() {
        if (HB.rel.data.status === 'connected') {
          window.removeEventListener('hb:relchange', onConnect);
          celebrate();
          setTimeout(function () { HB.navigate('/home'); }, 900);
        }
      });
    }

    render();
  });
})();
