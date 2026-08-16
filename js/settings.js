/* ============================================================
   SETTINGS — profile (synced), theme, preferences, data,
   relationship & connection, creator
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var backend = false;
  var connected = false;
  var relWired = false;

  HB.route('/settings', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    backend = !!(window.HB && HB.db && HB.db.configured());
    connected = HB.rel.data.status === 'connected';

    /* Normalize the on-device profile so a missing/null field can never
       crash the page (the old saved state was the "Oops…" culprit). */
    var p = HB.state.profile = HB.state.profile || {};
    p.name = p.name || '';
    p.partner = p.partner || '';
    p.age = p.age == null ? '' : p.age;
    p.partnerAge = p.partnerAge == null ? '' : p.partnerAge;
    p.relationship = p.relationship || '';
    p.vibes = Array.isArray(p.vibes) ? p.vibes : [];
    p.chatStyle = Array.isArray(p.chatStyle) ? p.chatStyle : [];
    p.story = p.story || '';
    p.togetherSince = p.togetherSince || '';
    p.theme = p.theme || 'milk';
    if (!HB.state.settings || typeof HB.state.settings !== 'object') HB.state.settings = {};
    HB.state.settings.notifications = HB.state.settings.notifications !== false;
    HB.state.settings.music = !!HB.state.settings.music;
    HB.state.settings.privacy = HB.state.settings.privacy !== false;

    function relOptions() {
      return HB.RELATIONSHIPS.map(function (r) {
        return '<option value="' + HB.esc(r.label) + '"' + (p.relationship === r.label ? ' selected' : '') + '>' + r.emoji + ' ' + r.label + '</option>';
      }).join('');
    }

    function vibeChips() {
      return HB.VIBES.map(function (v) {
        var sel = p.vibes.indexOf(v.label) !== -1 ? ' selected' : '';
        return '<button class="chip' + sel + '" data-vibe="' + HB.esc(v.label) + '">' + v.emoji + ' ' + v.label + '</button>';
      }).join('');
    }

    function styleChips() {
      return HB.CHAT_STYLES.map(function (s) {
        var sel = p.chatStyle.indexOf(s.label) !== -1 ? ' selected' : '';
        return '<button class="chip' + sel + '" data-style="' + HB.esc(s.label) + '">' + s.emoji + ' ' + s.label + '</button>';
      }).join('');
    }

    function themeCards() {
      return HB.THEMES.map(function (t) {
        var sel = p.theme === t.id ? ' selected' : '';
        return '<button class="theme-card' + sel + '" data-theme="' + t.id + '">' +
          '<span class="theme-swatch" style="background:' + t.swatch + '">' + t.icon + '</span>' +
          '<span class="tname">' + t.name + '</span></button>';
      }).join('');
    }

    function switchHtml(id, checked, title, sub) {
      return '<div class="setting-row"><div><div class="sr-title">' + title + '</div><div class="sr-sub">' + sub + '</div></div>' +
        '<label class="switch"><input type="checkbox" id="' + id + '"' + (checked ? ' checked' : '') + '><span class="track"></span></label></div>';
    }

    /* relationship & connection card */
    var relCard = '';
    if (backend) {
      var statusText = connected ? 'You two are connected ♡'
        : HB.rel.data.status === 'waiting' ? 'Waiting for your person to join…'
        : 'Not connected yet';
      var code = HB.rel.data.me && HB.rel.data.me.pairing_code;
      var partnerName = HB.rel.data.partner && HB.rel.data.partner.name ? HB.titleCase(HB.rel.data.partner.name) : '';
      relCard =
        '<div class="card settings-card">' +
          '<h3><span class="sc-emoji">💞</span> Connection</h3>' +
          '<div class="setting-row"><div><div class="sr-title">Status</div><div class="sr-sub">' + statusText + '</div></div>' +
          '<span class="cc-dot' + (connected ? ' on' : '') + '" style="position:static;margin-left:8px"></span></div>' +
          (partnerName ? '<div class="setting-row"><div><div class="sr-title">Your partner</div><div class="sr-sub">' + HB.esc(partnerName) + ' — connected securely to you</div></div><span class="sr-badge">💞</span></div>' : '') +
          (code && !connected ? '<div class="code-card code-card--sm" style="margin:6px 0 14px"><div class="code-card-label">Your pairing code 💕</div><div class="code-card-value">' + HB.esc(code) + '</div><button class="code-card-copy" data-copy-code>' + HB.icon('copy') + ' Copy</button></div>' : '') +
          '<div class="row" style="gap:10px;flex-wrap:wrap">' +
            '<button class="btn btn-soft btn-sm" data-manage>Manage connection</button>' +
            (connected ? '<button class="btn btn-danger btn-sm" data-leave>Delete my data & leave</button>' : '') +
          '</div>' +
        '</div>';
    }

    main.innerHTML =
      '<div class="page">' +
      '<div class="dash-hello"><h1>Profile & <span class="hand" style="font-size:1.15em">settings</span> ⚙️</h1>' +
      '<p>Everything about your little world, all in one place. Change it anytime.</p></div>' +

      '<div class="settings-grid">' +

        '<div class="card settings-card">' +
          '<h3><span class="sc-emoji">🧸</span> About you two</h3>' +
          '<div class="row"><div class="field" style="flex:1"><label class="label">Your name</label><input class="input" id="s-name" value="' + HB.esc(p.name) + '"/></div>' +
          (connected && HB.firstNames().partner
            ? '<div class="field" style="flex:1"><label class="label">Their name (from their phone)</label><div class="partner-static">' + HB.esc(HB.firstNames().partner) + ' ♡</div></div>'
            : '<div class="field" style="flex:1"><label class="label">Their name</label><input class="input" id="s-partner" value="' + HB.esc(p.partner) + '"/></div>') + '</div>' +
          '<div class="row"><div class="field" style="flex:1"><label class="label">Your age</label><input class="input" id="s-age" type="number" min="13" max="99" value="' + HB.esc(p.age) + '"/></div>' +
          '<div class="field" style="flex:1"><label class="label">Their age (just for you)</label><input class="input" id="s-page" type="number" min="13" max="99" value="' + HB.esc(p.partnerAge) + '"/></div></div>' +
          '<div class="field"><label class="label">Relationship</label><select class="select" id="s-rel">' + relOptions() + '</select></div>' +
          '<div class="field"><label class="label">Together since (optional)</label><input class="input" id="s-together" type="date" value="' + HB.esc(p.togetherSince || '') + '"/></div>' +
          '<div class="field"><label class="label">Your vibe</label><div class="chip-grid" id="s-vibes">' + vibeChips() + '</div></div>' +
          '<div class="field"><label class="label">How we talk</label><div class="chip-grid" id="s-styles">' + styleChips() + '</div></div>' +
          '<div class="field"><label class="label">Your special story</label><textarea class="textarea" id="s-story" maxlength="600">' + HB.esc(p.story) + '</textarea></div>' +
          '<button class="btn btn-primary" id="save-profile" style="width:100%">Save changes ♡</button>' +
        '</div>' +

        '<div class="settings-grid" style="align-content:start">' +

          (relCard || '') +

          '<div class="card settings-card">' +
            '<h3><span class="sc-emoji">🎨</span> Theme</h3>' +
            '<div class="theme-picker" id="s-themes">' + themeCards() + '</div>' +
            '<p class="muted mt-16" style="font-size:12.5px;font-weight:600">The theme updates live as you pick — it saves automatically.</p>' +
          '</div>' +

          '<div class="card settings-card">' +
            '<h3><span class="sc-emoji">🔔</span> Preferences</h3>' +
            switchHtml('s-notifs', HB.state.settings.notifications, 'Notifications', 'Gentle reminders for your little world') +
            switchHtml('s-music', HB.state.settings.music, 'Cute music', 'Play the soft lullaby in the background') +
            switchHtml('s-privacy', HB.state.settings.privacy, 'Private mode', 'Everything stays on this device only') +
          '</div>' +

          '<div class="card settings-card">' +
            '<h3><span class="sc-emoji">💾</span> Your data</h3>' +
            '<div class="setting-row"><div><div class="sr-title">Reset companion chat</div><div class="sr-sub">Clear your talks with your little companion (your couple chat is never touched)</div></div>' +
            '<button class="btn btn-ghost btn-sm" id="reset-chat">Reset</button></div>' +
            '<div class="setting-row"><div><div class="sr-title">Clear memories</div><div class="sr-sub">Remove all saved memories & notes</div></div>' +
            '<button class="btn btn-ghost btn-sm" id="clear-data">Clear</button></div>' +
            '<div class="setting-row"><div><div class="sr-title">Export memories</div><div class="sr-sub">Download your memories as a keepsake file</div></div>' +
            '<button class="btn btn-soft btn-sm" id="export-data">Export</button></div>' +
            '<div class="setting-row"><div><div class="sr-title">Start over on this device</div><div class="sr-sub">Erase this device\'s little world and begin again</div></div>' +
            '<button class="btn btn-danger btn-sm" id="reset-all">Reset</button></div>' +
          '</div>' +

          (HB.creator ? HB.creator.html() : '') +

        '</div>' +
      '</div></div>';

    /* vibes / styles chips */
    main.querySelectorAll('[data-vibe]').forEach(function (c) {
      c.addEventListener('click', function () { c.classList.toggle('selected'); });
    });
    main.querySelectorAll('[data-style]').forEach(function (c) {
      c.addEventListener('click', function () { c.classList.toggle('selected'); });
    });

    /* theme selection (saves immediately) */
    main.querySelectorAll('#s-themes [data-theme]').forEach(function (c) {
      c.addEventListener('click', function () {
        p.theme = c.dataset.theme;
        main.querySelectorAll('#s-themes [data-theme]').forEach(function (x) { x.classList.toggle('selected', x === c); });
        document.body.className = document.body.className.replace(/theme-[a-z]+/, '').trim();
        document.body.classList.add('theme-' + p.theme);
        HB.save();
        HB.toast('Theme changed ♡', '🎨');
      });
    });

    main.querySelector('#save-profile').addEventListener('click', function () {
      var name = main.querySelector('#s-name').value.trim();
      var partnerEl = main.querySelector('#s-partner');
      var partner = partnerEl ? partnerEl.value.trim() : p.partner;
      if (!name) { HB.toast('Your name can\'t be empty ♡', '🐻'); return; }
      if (!connected && !partner) { HB.toast('Their name can\'t be empty ♡', '🐻'); return; }

      p.name = name;
      p.partner = partner;
      p.age = main.querySelector('#s-age').value.trim();
      p.partnerAge = main.querySelector('#s-page').value.trim();
      p.relationship = main.querySelector('#s-rel').value;
      p.togetherSince = main.querySelector('#s-together').value || '';
      p.story = main.querySelector('#s-story').value.trim();

      var vibes = [];
      main.querySelectorAll('[data-vibe].selected').forEach(function (c) { vibes.push(c.dataset.vibe); });
      p.vibes = vibes;
      var styles = [];
      main.querySelectorAll('[data-style].selected').forEach(function (c) { styles.push(c.dataset.style); });
      p.chatStyle = styles;

      HB.save();
      HB.updateNav();

      // push to the shared little world
      if (backend && HB.rel) {
        HB.rel.updateMyProfile({ name: name, age: p.age });
        HB.rel.updateShared({
          relationship_type: p.relationship,
          vibes: p.vibes,
          chat_style: p.chatStyle,
          story: p.story,
          together_since: p.togetherSince || null
        });
      }
      HB.toast('Your little world is updated everywhere ♡', '✨');
    });

    main.querySelector('#s-notifs').addEventListener('change', function (e) {
      HB.state.settings.notifications = e.target.checked; HB.save();
      HB.toast(e.target.checked ? 'Notifications on ♡' : 'Notifications off', '🔔');
    });
    main.querySelector('#s-music').addEventListener('change', function (e) {
      if (e.target.checked !== HB.music.isOn()) HB.music.toggle();
    });
    main.querySelector('#s-privacy').addEventListener('change', function (e) {
      HB.state.settings.privacy = e.target.checked; HB.save();
      HB.toast(e.target.checked ? 'Everything stays private on this device' : 'Privacy mode off', '🔐');
    });

    main.querySelector('#reset-chat').addEventListener('click', function () {
      HB.confirm('Reset your companion chat?', 'Your talks with your little companion will be cleared. Your couple chat is never touched.', function () {
        HB.state.chatHistory = [];
        HB.save();
        HB.toast('Chat reset — a fresh start ♡', '🧸');
      });
    });

    main.querySelector('#clear-data').addEventListener('click', function () {
      HB.confirm('Clear your memories & notes?', 'All saved memories, love notes, and daily answers will be removed. This can\'t be undone.', function () {
        HB.state.memories = [];
        HB.state.loveNotes = [];
        HB.state.dailyAnswers = [];
        HB.state.specialDates = [];
        HB.save();
        HB.toast('Cleared. Room for new memories ♡', '🌱');
      });
    });

    main.querySelector('#export-data').addEventListener('click', function () {
      var data = {
        couple: HB.couple(),
        profile: p,
        memories: HB.state.memories,
        loveNotes: HB.state.loveNotes,
        dailyAnswers: HB.state.dailyAnswers,
        specialDates: HB.state.specialDates,
        exportedAt: new Date().toISOString()
      };
      var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'our-little-world-' + Date.now() + '.json';
      a.click();
      URL.revokeObjectURL(a.href);
      HB.toast('Your memories are exported ♡', '📦');
    });

    main.querySelector('#reset-all').addEventListener('click', function () {
      HB.confirm('Start completely over?', 'This wipes everything on this device — profile, chats, memories, everything. Your little world will begin fresh.', function () {
        localStorage.removeItem('ourLittleWorld_v1');
        HB.toast('A new story begins... ✨', '🕊️');
        history.replaceState(null, '', location.pathname + location.search);
        setTimeout(function () { location.reload(); }, 800);
      }, 'Erase everything');
    });

    /* relationship card actions */
    var manage = main.querySelector('[data-manage]');
    if (manage) manage.addEventListener('click', function () { HB.navigate('/partner'); });

    var copyCode = main.querySelector('[data-copy-code]');
    if (copyCode) copyCode.addEventListener('click', function () {
      var btn = this;
      navigator.clipboard.writeText(HB.rel.data.me.pairing_code).then(function () {
        btn.innerHTML = '✓ Copied 💕';
        setTimeout(function () { btn.innerHTML = HB.icon('copy') + ' Copy'; }, 1600);
        HB.toast('Code copied ♡', '💌');
      });
    });

    var leave = main.querySelector('[data-leave]');
    if (leave) leave.addEventListener('click', function () {
      HB.confirm('Delete my data & leave?', 'This clears your profile and your connection on this side. Your partner\'s side stays.', function () {
        HB.rel.leave().then(function () {
          localStorage.removeItem('ourLittleWorld_v1');
          HB.toast('Your data is gone. Goodbye for now, love ♡', '🕊️');
          history.replaceState(null, '', location.pathname + location.search);
          setTimeout(function () { location.reload(); }, 900);
        }).catch(function () {
          HB.toast('Hmm, that didn\'t work. Try again?', '💔');
        });
      }, 'Delete everything');
    });

    /* When the partner connects, flip the "waiting" connection card to
       the "connected" one — but never clobber a half-typed form. */
    if (!relWired) {
      relWired = true;
      window.addEventListener('hb:relchange', function () {
        if (HB.currentPath() !== '/settings') return;
        var m = document.getElementById('main');
        if (!m || !m.isConnected) return;
        if (HB.rel.data.status === 'connected' && m.querySelector('[data-copy-code]')) {
          HB.navigate('/settings');
        }
      });
    }

    if (HB.creator) HB.creator.wire(main);
  });
})();
