/* ============================================================
   MEMORIES — polaroid memory gallery with photo upload
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  HB.route('/memories', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    function renderGrid() {
      var grid = main.querySelector('#polaroid-grid');
      var mems = HB.state.memories;
      if (!mems.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="es-emoji">📸</div><h4>No memories yet</h4><p>Add your first little moment — a photo, a title, a tiny story. It\'s your gallery of us.</p></div>';
        return;
      }
      grid.innerHTML = mems.map(function (m, i) {
        var img = m.img
          ? '<img class="polaroid-img" src="' + m.img + '" alt="' + HB.esc(m.title) + '"/>'
          : '<div class="polaroid-img placeholder">' + (m.emoji || '📷') + '</div>';
        return '<div class="polaroid" data-id="' + m.id + '" style="animation-delay:' + (i * 0.06) + 's">' +
          '<button class="pol-del" data-del title="Remove memory">✕</button>' +
          (m.favorite ? '<span class="pol-heart">♥</span>' : '') +
          img +
          '<div class="polaroid-cap">' + HB.esc(m.title) +
            '<small>' + HB.esc(m.date || '') + (m.location ? ' · ' + HB.esc(m.location) : '') + '</small>' +
          '</div></div>';
      }).join('');

      grid.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          var card = b.closest('.polaroid');
          var id = card.dataset.id;
          HB.confirm('Remove this memory?', 'It will be taken out of your gallery.', function () {
            HB.state.memories = HB.state.memories.filter(function (m) { return m.id !== id; });
            HB.save();
            renderGrid();
            HB.toast('Memory removed', '🗑️');
          });
        });
      });

      grid.querySelectorAll('.polaroid').forEach(function (card) {
        card.addEventListener('click', function (e) {
          if (e.target.closest('[data-del]')) return;
          var m = mems.filter(function (x) { return x.id === card.dataset.id; })[0];
          if (m) openMemory(m);
        });
      });
    }

    function openMemory(m) {
      var imgHtml = m.img
        ? '<img class="polaroid-img" style="aspect-ratio:auto;margin-bottom:14px" src="' + m.img + '"/>'
        : '<div class="polaroid-img placeholder" style="margin-bottom:14px">' + (m.emoji || '📷') + '</div>';
      HB.modal({
        title: m.title + (m.favorite ? ' ♥' : ''),
        text: m.date ? '🗓 ' + m.date + (m.location ? ' · 📍 ' + m.location : '') : '',
        body: imgHtml + '<p style="font-weight:600;line-height:1.8">' + HB.esc(m.description || '') + '</p>',
        actions: [
          { label: 'Close', kind: 'btn-soft' },
          { label: 'Export', kind: 'btn-ghost', onClick: function () {
            exportMemory(m);
          } }
        ]
      });
    }

    function exportMemory(m) {
      var blob = new Blob([m.title + '\n' + (m.date || '') + (m.location ? ' - ' + m.location : '') + '\n\n' + (m.description || '')], { type: 'text/plain' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'memory-' + m.title.replace(/\s+/g, '-').toLowerCase() + '.txt';
      a.click();
      URL.revokeObjectURL(a.href);
      HB.toast('Memory exported ♡', '📤');
    }

    function showAddForm() {
      var overlay = HB.modal({
        title: 'Add a memory ♡',
        text: 'A photo, a title, a place — the recipe for a moment worth keeping.',
        body: '<div class="field"><label class="label">Photo (optional)</label>' +
          '<div class="row"><label class="btn btn-soft btn-sm" for="mem-file">📷 Choose photo</label><input type="file" id="mem-file" accept="image/*" class="hide"/><span id="mem-filename" class="muted" style="font-size:13px"></span></div></div>' +
          '<div class="field"><label class="label">Title</label><input class="input" id="mem-title" placeholder="Our First Date ♡"/></div>' +
          '<div class="row"><div class="field" style="flex:1"><label class="label">Date</label><input class="input" id="mem-date" type="date"/></div>' +
          '<div class="field" style="flex:1"><label class="label">Location</label><input class="input" id="mem-loc" placeholder="That tiny café"/></div></div>' +
          '<div class="field"><label class="label">Description</label><textarea class="textarea" id="mem-desc" placeholder="What happened that made this moment yours..."></textarea></div>' +
          '<label class="chip" style="cursor:pointer"><input type="checkbox" id="mem-fav" style="width:auto"/> My favorite memory ♥</label>',
        actions: [
          { label: 'Cancel', kind: 'btn-ghost' },
          { label: 'Save memory ♡', kind: 'btn-primary', onClick: function (ov) {
            var title = ov.querySelector('#mem-title').value.trim();
            if (!title) { HB.toast('Give it a title first ♡', '✍️'); return false; }
            var m = {
              id: HB.uid(),
              title: title,
              date: ov.querySelector('#mem-date').value,
              location: ov.querySelector('#mem-loc').value.trim(),
              description: ov.querySelector('#mem-desc').value.trim(),
              favorite: ov.querySelector('#mem-fav').checked,
              img: ov.__memImg || '',
              emoji: '📷',
              time: Date.now()
            };
            HB.state.memories.unshift(m);
            HB.save();
            HB.toast('Memory saved ♡', '📸');
            renderGrid();
          } }
        ]
      });
      var fileInput = overlay.querySelector('#mem-file');
      fileInput.addEventListener('change', function () {
        var file = fileInput.files[0];
        if (!file) return;
        if (file.size > 3 * 1024 * 1024) { HB.toast('Keep it under 3MB for the little world ♡', '🐻'); return; }
        var reader = new FileReader();
        reader.onload = function (e) {
          overlay.__memImg = e.target.result;
          overlay.querySelector('#mem-filename').textContent = '✓ ' + file.name;
        };
        reader.readAsDataURL(file);
      });
    }

    main.innerHTML =
      '<div class="page">' +
      '<div class="dash-hello"><h1>Our <span class="hand" style="font-size:1.15em">memories</span> 📸</h1>' +
      '<p>Your digital memory gallery — polaroids of all the little moments worth keeping.</p></div>' +

      '<div class="memories-toolbar">' +
        '<div class="row"><span class="chip selected">All memories</span><span class="chip" id="fav-filter">Favorites ♥</span><span class="muted" style="font-size:13px;font-weight:700">' + HB.state.memories.length + ' kept</span></div>' +
        '<button class="btn btn-primary" id="add-memory">+ Add a memory</button>' +
      '</div>' +

      '<div class="polaroid-grid" id="polaroid-grid"></div>' +
      '</div>';

    main.querySelector('#add-memory').addEventListener('click', showAddForm);
    main.querySelector('#fav-filter').addEventListener('click', function () {
      var showFavs = !this.classList.contains('selected');
      this.classList.toggle('selected', showFavs);
      main.querySelectorAll('.polaroid').forEach(function (p) {
        var isFav = p.querySelector('.pol-heart');
        p.style.display = (showFavs && !isFav) ? 'none' : '';
      });
      HB.toast(showFavs ? 'Showing your favorites ♥' : 'Showing all memories', '📸');
    });

    renderGrid();
  });
})();
