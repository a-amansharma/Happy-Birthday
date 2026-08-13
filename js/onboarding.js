/* ============================================================
   ONBOARDING — 9-step personalization wizard
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

  HB.route('/onboarding', function (main) {
    var step = 0;
    var draft = {
      name: HB.state.profile.name, partner: HB.state.profile.partner,
      age: HB.state.profile.age, partnerAge: HB.state.profile.partnerAge,
      relationship: HB.state.profile.relationship,
      vibes: HB.state.profile.vibes.slice(), chatStyle: HB.state.profile.chatStyle.slice(),
      story: HB.state.profile.story, theme: HB.state.profile.theme
    };

    var TITLES = [
      'Step 1 of 9 · About you',
      'Step 2 of 9 · About them',
      'Step 3 of 9 · You, a little more',
      'Step 4 of 9 · And them',
      'Step 5 of 9 · Your story',
      'Step 6 of 9 · Your vibe',
      'Step 7 of 9 · How I should talk',
      'Step 8 of 9 · Something special',
      'Step 9 of 9 · Pick a vibe theme'
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
      var card = main.querySelector('.wizard-card');
      var actions = main.querySelector('.wizard-actions');
      var progress = main.querySelector('.progress');

      renderStep(card, actions, progress);
    }

    function renderStep(card, actions, progress) {
      // Progress dots
      var dots = '';
      for (var i = 0; i < 9; i++) {
        var cls = i < step ? 'done' : i === step ? 'current' : '';
        dots += '<span class="pstep ' + cls + '"></span>';
      }
      dots += '<span class="plabel">' + (step + 1) + ' / 9</span>';
      progress.innerHTML = dots;

      var body = '';
      var multi = false;

      switch (step) {
        case 0:
          body = '<p class="wizard-step-q">What should we call <span class="hand" style="font-size:1.3em">you</span>?</p>' +
            '<p class="wizard-step-hint">Your name — we\'ll use it all over your little world.</p>' +
            '<div class="field"><input class="input input-lg" id="w-name" placeholder="Your name" value="' + HB.esc(draft.name) + '" maxlength="30" /></div>';
          break;
        case 1:
          body = '<p class="wizard-step-q">What\'s your <span class="hand" style="font-size:1.3em">person\'s</span> name?</p>' +
            '<p class="wizard-step-hint">Their name — the one that makes your heart go a little soft.</p>' +
            '<div class="field"><input class="input input-lg" id="w-partner" placeholder="Partner\'s name" value="' + HB.esc(draft.partner) + '" maxlength="30" /></div>';
          break;
        case 2:
          body = '<p class="wizard-step-q">How old are <span class="hand" style="font-size:1.3em">you</span>?</p>' +
            '<p class="wizard-step-hint">Just a number, but we like knowing you.</p>' +
            '<div class="field"><input class="input input-lg" id="w-age" type="number" min="13" max="99" placeholder="Your age" value="' + HB.esc(draft.age) + '" /></div>';
          break;
        case 3:
          body = '<p class="wizard-step-q">How old is <span class="hand" style="font-size:1.3em">your person</span>?</p>' +
            '<p class="wizard-step-hint">Equally important. (We won\'t tell them you told us.)</p>' +
            '<div class="field"><input class="input input-lg" id="w-page" type="number" min="13" max="99" placeholder="Partner\'s age" value="' + HB.esc(draft.partnerAge) + '" /></div>';
          break;
        case 4:
          body = '<p class="wizard-step-q">What\'s your <span class="hand" style="font-size:1.3em">relationship</span>?</p>' +
            '<p class="wizard-step-hint">Pick the closest one — this shapes how I talk.</p>' +
            '<div class="option-cards">' + optionCards(HB.RELATIONSHIPS, draft.relationship ? [draft.relationship] : [], false) + '</div>';
          break;
        case 5:
          multi = true;
          body = '<p class="wizard-step-q">Tell us your <span class="hand" style="font-size:1.3em">vibe</span> ♡</p>' +
            '<p class="wizard-step-hint">Pick as many as feel like you two.</p>' +
            '<div class="option-cards">' + optionCards(HB.VIBES, draft.vibes, true) + '</div>';
          break;
        case 6:
          multi = true;
          body = '<p class="wizard-step-q">How should your AI companion <span class="hand" style="font-size:1.3em">talk</span> to you?</p>' +
            '<p class="wizard-step-hint">Your personality mix. Multiple picks welcome.</p>' +
            '<div class="option-cards">' + optionCards(HB.CHAT_STYLES, draft.chatStyle, true) + '</div>';
          break;
        case 7:
          body = '<p class="wizard-step-q">What\'s something <span class="hand" style="font-size:1.3em">special</span> about your relationship?</p>' +
            '<p class="wizard-step-hint">Maybe your first meeting, an inside joke, your favorite memory, or anything you want us to know...</p>' +
            '<div class="field"><textarea class="textarea" id="w-story" placeholder="Maybe your first meeting, an inside joke, your favorite memory, or anything you want us to know..." maxlength="600">' + HB.esc(draft.story) + '</textarea></div>' +
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

      // Actions
      var back = '<button class="btn btn-ghost" data-wback>' + (step === 0 ? 'Start over' : 'Back') + '</button>';
      var next = '<button class="btn btn-primary" data-wnext>' + (step === 8 ? 'Create Our World ♡' : 'Continue ♡') + '</button>';
      actions.innerHTML = '<div>' + back + '</div>' + '<div>' + next + '</div>';

      actions.querySelector('[data-wnext]').addEventListener('click', function () { nextStep(); });
      actions.querySelector('[data-wback]').addEventListener('click', function () {
        if (step === 0) { HB.navigate('/'); return; }
        step--; render();
      });

      // Enter key to continue
      var input = card.querySelector('input[type="text"], input[type="number"], input:not([type]), textarea');
      if (input) {
        input.focus();
        input.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            if (input.tagName === 'TEXTAREA') return;
            e.preventDefault(); nextStep();
          }
        });
      }

      document.querySelector('.theme-picker') && document.querySelector('.theme-picker').addEventListener('click', function (e) {
        var t = e.target.closest('[data-theme]');
        if (!t) return;
        draft.theme = t.dataset.theme;
        document.querySelectorAll('.theme-card').forEach(function (c) { c.classList.toggle('selected', c.dataset.theme === draft.theme); });
        document.body.className = document.body.className.replace(/theme-[a-z]+/, '').trim();
        document.body.classList.add('theme-' + draft.theme);
      });
    }

    function wireCard(card) {
      card.querySelectorAll('.option-card').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var multi = btn.parentElement.classList.contains('option-cards') &&
            (step === 5 || step === 6);
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
          var name = (card.querySelector('#w-name').value || '').trim();
          if (!name) { HB.toast('We\'d love your name first!', '🐻'); return; }
          draft.name = name; break;
        case 1:
          var partner = (card.querySelector('#w-partner').value || '').trim();
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

      // First chat message from companion
      HB.state.chatHistory = [{
        id: HB.uid(), from: 'ai', text: HB.chatIntro().text, time: Date.now()
      }];
      HB.save();

      // Celebration
      HB.burst(window.innerWidth / 2, window.innerHeight / 3, 40);
      HB.toast('Your little world is ready ✨', '🎉');

      setTimeout(function () { HB.navigate('/home'); }, 600);
    }

    render();
  });
})();
