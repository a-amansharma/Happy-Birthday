/* ============================================================
   SPECIAL DATES — love timer & countdowns
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var EVENT_TYPES = [
    { label: 'First Meeting', emoji: '👋' },
    { label: 'First Date', emoji: '🌹' },
    { label: 'Anniversary', emoji: '💍' },
    { label: 'Birthday', emoji: '🎂' },
    { label: 'First "I Love You"', emoji: '💬' },
    { label: 'Special Memory', emoji: '✨' },
    { label: 'Custom Event', emoji: '📌' }
  ];

  HB.route('/special', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    function startDate() {
      if (HB.state.profile.togetherSince) return new Date(HB.state.profile.togetherSince + 'T00:00:00');
      // fall back to first date event or earliest event
      var first = HB.state.specialDates.slice().sort(function (a, b) { return a.date.localeCompare(b.date); })[0];
      return first ? new Date(first.date + 'T00:00:00') : null;
    }

    function animateCount(el, from, to) {
      var dur = 1100, start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        p = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * p);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    function renderStats() {
      var sd = startDate();
      var daysEl = main.querySelector('#stat-days'), monthsEl = main.querySelector('#stat-months'), yearsEl = main.querySelector('#stat-years');
      var hint = main.querySelector('.stats-hint');
      if (!sd) {
        if (daysEl) {
          daysEl.textContent = '—'; monthsEl.textContent = '—'; yearsEl.textContent = '—';
        }
        if (hint) hint.style.display = 'flex';
        return;
      }
      if (hint) hint.style.display = 'none';
      var diff = Date.now() - sd.getTime();
      var days = Math.floor(diff / 86400000);
      var months = Math.floor(days / 30.44);
      var years = Math.floor(days / 365.25);
      animateCount(daysEl, 0, Math.max(days, 0));
      animateCount(monthsEl, 0, Math.max(months, 0));
      animateCount(yearsEl, 0, Math.max(years, 0));
    }

    function diffText(dateISO) {
      var d = new Date(dateISO + 'T00:00:00');
      var diff = d.getTime() - Date.now();
      if (diff < 0) return null;
      var days = Math.ceil(diff / 86400000);
      if (days === 0) return 'Today!! ♡';
      if (days === 1) return 'Tomorrow ♡';
      if (days < 30) return days + ' days to go';
      var months = Math.floor(days / 30.44);
      if (months < 12) return months + ' month' + (months > 1 ? 's' : '') + ' to go';
      var years = Math.floor(days / 365.25);
      return years + ' year' + (years > 1 ? 's' : '') + ' to go';
    }

    function pastSince(dateISO) {
      var d = new Date(dateISO + 'T00:00:00');
      var diff = Date.now() - d.getTime();
      if (diff < 0) return null;
      var days = Math.floor(diff / 86400000);
      return 'Together for ' + days + ' day' + (days === 1 ? '' : 's');
    }

    function renderEvents() {
      var grid = main.querySelector('#events-grid');
      var events = HB.state.specialDates.slice().sort(function (a, b) { return a.date.localeCompare(b.date); });
      if (!events.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="es-emoji">' + HB.chars.stageHtml({ which: 'dudu', action: 'wait', size: 'empty', alt: 'Dudu is waiting for your dates' }) + '</div><h4>No special dates yet</h4><p>Add your first meeting, your anniversary, their birthday — and we\'ll count down to every one.</p></div>';
        return;
      }
      grid.innerHTML = events.map(function (ev, i) {
        var type = EVENT_TYPES.filter(function (t) { return t.label === ev.type; })[0] || EVENT_TYPES[6];
        var upcoming = diffText(ev.date);
        var past = !upcoming ? pastSince(ev.date) : null;
        var count = upcoming
          ? '<div class="de-count">' + HB.esc(upcoming) + '</div>'
          : past ? '<div class="de-count">' + HB.esc(past) + '</div>'
          : '<div class="de-count">Your day ♡</div>';
        return '<div class="card date-event" style="animation-delay:' + (i * 0.07) + 's">' +
          '<button class="de-del" data-id="' + ev.id + '" title="Remove">✕</button>' +
          '<div class="de-emoji">' + type.emoji + '</div>' +
          '<h4>' + HB.esc(ev.title) + '</h4>' +
          '<div class="de-date">' + type.label + ' · ' + HB.esc(formatDate(ev.date)) + '</div>' +
          count +
          '</div>';
      }).join('');
      grid.querySelectorAll('[data-id]').forEach(function (b) {
        b.addEventListener('click', function () {
          var id = b.dataset.id;
          HB.confirm('Remove this date?', 'It will be removed from your countdowns.', function () {
            HB.state.specialDates = HB.state.specialDates.filter(function (e) { return e.id !== id; });
            HB.save();
            renderEvents();
            renderStats();
            HB.toast('Removed', '🗑️');
          });
        });
      });
    }

    function formatDate(iso) {
      try {
        return new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
      } catch (e) { return iso; }
    }

    function showAddEvent() {
      var typeOptions = EVENT_TYPES.map(function (t, i) {
        return '<button class="chip' + (i === 0 ? ' selected' : '') + '" data-eve>' + t.emoji + ' ' + t.label + '</button>';
      }).join('');
      var ov = HB.modal({
        title: 'Add a special date ♡',
        text: 'Every countdown is just excitement in disguise.',
        body: '<div class="field"><label class="label">Type</label><div class="chip-grid">' + typeOptions + '</div></div>' +
          '<div class="field"><label class="label">Title</label><input class="input" id="ev-title" placeholder="Our First Date ♡"/></div>' +
          '<div class="field"><label class="label">Date</label><input class="input" id="ev-date" type="date"/></div>',
        actions: [
          { label: 'Cancel', kind: 'btn-ghost' },
          { label: 'Add it ♡', kind: 'btn-primary', onClick: function (o) {
            var title = o.querySelector('#ev-title').value.trim();
            var date = o.querySelector('#ev-date').value;
            var selType = o.querySelector('.chip.selected');
            var type = selType ? selType.textContent.replace(/^[^\w]+/, '').trim() : 'Custom Event';
            if (!title || !date) { HB.toast('Add a title and a date ♡', '📌'); return false; }
            HB.state.specialDates.push({ id: HB.uid(), title: title, date: date, type: type, time: Date.now() });
            HB.save();
            HB.toast('Date added — counting down ♡', '⏳');
            renderEvents(); renderStats();
          } }
        ]
      });

      var selType = 'First Meeting';
      ov.querySelectorAll('[data-eve]').forEach(function (b) {
        b.addEventListener('click', function () {
          ov.querySelectorAll('[data-eve]').forEach(function (x) { x.classList.toggle('selected', x === b); });
          selType = b.textContent.replace(/^[^\w]+/, '').trim();
        });
      });
    }

    main.innerHTML =
      '<div class="page">' +
      '<div class="dash-hello"><h1>Special <span class="hand" style="font-size:1.15em">dates</span> ⏳</h1>' +
      '<p>Count every day you\'ve been together, and count down to every day worth waiting for.</p></div>' +

      '<div class="stats-row">' +
        '<div class="stat-card"><div class="st-num" id="stat-days">0</div><div class="st-label">Days together</div></div>' +
        '<div class="stat-card"><div class="st-num" id="stat-months">0</div><div class="st-label">Months together</div></div>' +
        '<div class="stat-card"><div class="st-num" id="stat-years">0</div><div class="st-label">Years together</div></div>' +
        '<div class="stat-card"><div class="st-num" style="font-size:30px">♡</div><div class="st-label">Forever</div></div>' +
      '</div>' +
      '<div class="stats-hint" style="display:none;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--ink-soft);margin:-8px 0 14px">' +
        '<span>🧸</span><span>Tell us <a href="' + HB.base + '/settings" data-path="/settings" style="color:var(--primary);cursor:pointer">when you got together</a> and we\'ll count every day.</span>' +
      '</div>' +

      '<div class="memories-toolbar">' +
        '<div class="section-title" style="margin:0"><h3>Countdowns</h3><span class="hand">days worth looking forward to</span></div>' +
        '<button class="btn btn-primary" id="add-event">+ Add a date</button>' +
      '</div>' +

      '<div class="dates-grid" id="events-grid"></div>' +
      '</div>';

    main.querySelector('#add-event').addEventListener('click', showAddEvent);

    var togetherLink = main.querySelector('[data-path="/settings"]');
    if (togetherLink) togetherLink.addEventListener('click', function (e) {
      e.preventDefault();
      HB.navigate('/settings');
    });

    renderEvents();
    renderStats();
  });
})();
