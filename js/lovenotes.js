/* ============================================================
   LOVE NOTES — generate, copy, save, share
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  HB.route('/notes', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var noteType = 'Random Love';
    var tone = 'Sweet';
    var lastGenerated = null;

    var typeChips = HB.NOTE_TYPES.map(function (t) {
      return '<button class="chip' + (t === noteType ? ' selected' : '') + '" data-type>' + HB.esc(t) + '</button>';
    }).join('');

    var toneChips = HB.NOTE_TONES.map(function (t) {
      return '<button class="chip' + (t === tone ? ' selected' : '') + '" data-tone>' + HB.esc(t) + '</button>';
    }).join('');

    function renderNote(note) {
      if (!note) return;
      lastGenerated = note;
      var result = main.querySelector('#note-result');
      if (!result) return;
      result.innerHTML = '';
      var el = document.createElement('div');
      el.className = 'note-card';
      el.innerHTML =
        '<div class="note-title">' + HB.esc(note.title) + '</div>' +
        '<div class="note-text">' + HB.esc(note.text).replace(/\n/g, '<br>') + '</div>' +
        '<div class="note-meta">' +
          '<span class="tag">' + HB.esc(note.type) + '</span>' +
          '<span class="tag">' + HB.esc(note.tone) + '</span>' +
          (note.years ? '<span class="tag">' + note.years + ' years of you ♡</span>' : '') +
        '</div>' +
        '<div class="row mt-16">' +
          '<button class="btn btn-soft btn-sm" data-copy>Copy</button>' +
          '<button class="btn btn-ghost btn-sm" data-regen>Regenerate ♡</button>' +
          '<button class="btn btn-primary btn-sm" data-save>Save</button>' +
          '<button class="btn btn-ghost btn-sm" data-share>Share</button>' +
        '</div>';
      result.appendChild(el);

      el.querySelector('[data-copy]').addEventListener('click', function () {
        navigator.clipboard.writeText(note.text).then(function () {
          HB.toast('Copied — go send it ♡', '📋');
        });
      });
      el.querySelector('[data-regen]').addEventListener('click', function () {
        HB.toast('Something sweet is on its way...', '✨');
        setTimeout(function () { renderNote(generate()); }, 500);
      });
      el.querySelector('[data-save]').addEventListener('click', function () {
        HB.state.loveNotes.unshift({ id: HB.uid(), title: note.title, text: note.text, type: note.type, tone: note.tone, time: Date.now() });
        HB.save();
        HB.toast('Note saved to your little collection ♡', '💌');
        renderSaved();
      });
      el.querySelector('[data-share]').addEventListener('click', function () {
        if (navigator.share) {
          navigator.share({ title: note.title, text: note.text }).catch(function () {});
        } else {
          navigator.clipboard.writeText(note.text).then(function () {
            HB.toast('Copied — share it anywhere ♡', '📤');
          });
        }
      });
    }

    function generate() {
      var tplSet = HB.noteTemplates[noteType];
      var tpls = (tplSet && tplSet[tone]) ? tplSet[tone] : (tplSet && tplSet.Sweet) || ['{partner} ♡ I love you. That\'s the note. That\'s the whole thing.'];
      var text = HB.pick(tpls);
      var n = HB.firstNames();
      var years = yearsTogether();
      text = text.replace(/\{partner\}/g, n.partner).replace(/\{me\}/g, n.me).replace(/\{years\}/g, years || '1');
      return { title: 'A little note for ' + n.partner, text: text, type: noteType, tone: tone, years: years };
    }

    function yearsTogether() {
      if (!HB.state.profile.togetherSince) return '';
      var d = new Date(HB.state.profile.togetherSince);
      var y = (Date.now() - d.getTime()) / (365.25 * 86400000);
      return Math.max(1, Math.floor(y)).toString();
    }

    function renderSaved() {
      var box = main.querySelector('#saved-notes');
      var notes = HB.state.loveNotes;
      if (!notes.length) {
        box.innerHTML = '<div class="empty-state"><div class="es-emoji">' + HB.chars.stageHtml({ which: 'bubu', action: 'love', size: 'empty', alt: 'Bubu ♡ Dudu' }) + '</div><h4>No saved notes yet</h4><p>Generate a note and hit "Save" to keep your little words here.</p></div>';
        return;
      }
      box.innerHTML = notes.map(function (nt, i) {
        return '<div class="note-card" style="animation-delay:' + (i * 0.06) + 's">' +
          '<div class="note-title">' + HB.esc(nt.title) + '</div>' +
          '<div class="note-text">' + HB.esc(nt.text).replace(/\n/g, '<br>') + '</div>' +
          '<div class="note-meta"><span class="tag">' + HB.esc(nt.type) + '</span><span class="tag">' + new Date(nt.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</span></div>' +
          '<div class="row mt-16">' +
            '<button class="btn btn-soft btn-sm" data-copy>Copy</button>' +
            '<button class="btn btn-ghost btn-sm" data-del>Remove</button>' +
          '</div></div>';
      }).join('');

      box.querySelectorAll('[data-copy]').forEach(function (b) {
        b.addEventListener('click', function () {
          var idx = Array.prototype.indexOf.call(b.closest('.note-card').parentElement.children, b.closest('.note-card'));
          navigator.clipboard.writeText(notes[idx].text).then(function () { HB.toast('Copied ♡', '📋'); });
        });
      });
      box.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          var card = b.closest('.note-card');
          var idx = Array.prototype.indexOf.call(card.parentElement.children, card);
          HB.confirm('Remove this note?', 'It will be gone from your saved collection.', function () {
            HB.state.loveNotes.splice(idx, 1);
            HB.save();
            renderSaved();
            HB.toast('Note removed', '🗑️');
          });
        });
      });
    }

    main.innerHTML =
      '<div class="page">' +
      '<div class="dash-hello"><h1>Little things worth <span class="hand" style="font-size:1.15em">saying</span> ♡</h1>' +
      '<p>Generate the perfect words for your person — then send them before you overthink it.</p></div>' +

      '<div class="notes-layout">' +
        '<div class="notes-controls">' +
          '<div class="card">' +
            '<label class="label">What kind of note?</label>' +
            '<div class="chip-grid">' + typeChips + '</div>' +
            '<div class="mt-16"><label class="label">Tone</label>' +
            '<div class="chip-grid">' + toneChips + '</div></div>' +
            '<div class="mt-16"><button class="btn btn-primary btn-lg" id="generate-note" style="width:100%">Generate ♡</button></div>' +
          '</div>' +
        '</div>' +
        '<div class="notes-result">' +
          '<div id="note-result"></div>' +
          '<div class="section-title" style="margin-top:6px"><h3>Saved notes</h3><span class="hand">your little collection</span></div>' +
          '<div id="saved-notes"></div>' +
        '</div>' +
      '</div></div>';

    main.querySelectorAll('[data-type]').forEach(function (c) {
      c.addEventListener('click', function () {
        noteType = c.textContent.trim();
        main.querySelectorAll('[data-type]').forEach(function (x) { x.classList.toggle('selected', x === c); });
      });
    });
    main.querySelectorAll('[data-tone]').forEach(function (c) {
      c.addEventListener('click', function () {
        tone = c.textContent.trim();
        main.querySelectorAll('[data-tone]').forEach(function (x) { x.classList.toggle('selected', x === c); });
      });
    });

    main.querySelector('#generate-note').addEventListener('click', function () {
      HB.toast('Something sweet is on its way...', '✨');
      setTimeout(function () { renderNote(generate()); }, 450);
    });

    renderSaved();
  });
})();
