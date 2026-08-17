/* ============================================================
   MEMORIES — two-column gallery (Person 1 & Person 2)
   Text-only memories = sticky note cards
   Image memories = polaroid with proper aspect ratio
   Click → responsive modal popup
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  /* Sticky note color palette (rotated per card) */
  var STICKY_COLORS = [
    { bg: '#FFF9C4', border: '#FFEE58', text: '#5D4037' },
    { bg: '#F8BBD0', border: '#F48FB1', text: '#880E4F' },
    { bg: '#C8E6C9', border: '#81C784', text: '#2E7D32' },
    { bg: '#BBDEFB', border: '#64B5F6', text: '#1565C0' },
    { bg: '#E1BEE7', border: '#BA68C8', text: '#6A1B9A' },
    { bg: '#FFE0B2', border: '#FFB74D', text: '#E65100' },
    { bg: '#B2EBF2', border: '#4DD0E1', text: '#00838F' },
    { bg: '#F0F4C3', border: '#DCE775', text: '#9E9D24' }
  ];

  function stickyStyle(i) {
    var c = STICKY_COLORS[i % STICKY_COLORS.length];
    var rot = ((i * 7 + 3) % 7) - 3;
    return 'background:' + c.bg + ';border:2px solid ' + c.border + ';color:' + c.text +
      ';transform:rotate(' + rot + 'deg)';
  }

  function stickyText(i) {
    var c = STICKY_COLORS[i % STICKY_COLORS.length];
    return 'color:' + c.text;
  }

  function memoryCardHtml(m, i, ownerName) {
    if (m.img) {
      /* Image memory — polaroid style */
      return '<div class="mem-card mem-photo" data-id="' + m.id + '" style="animation-delay:' + (i * 0.06) + 's">' +
        '<button class="mem-del" data-del title="Remove">✕</button>' +
        '<img class="mem-img" src="' + HB.esc(m.img) + '" alt="' + HB.esc(m.title) + '" loading="lazy"/>' +
        '<div class="mem-caption">' +
          '<div class="mem-title">' + HB.esc(m.title) + '</div>' +
          (m.date ? '<div class="mem-date">' + HB.esc(m.date) + (m.location ? ' · ' + HB.esc(m.location) : '') + '</div>' : '') +
        '</div>' +
      '</div>';
    }
    /* Text-only memory — sticky note style */
    return '<div class="mem-card mem-sticky" data-id="' + m.id + '" style="' + stickyStyle(i) + ';animation-delay:' + (i * 0.06) + 's">' +
      '<button class="mem-del mem-del-sticky" data-del title="Remove">✕</button>' +
      '<div class="mem-sticky-title" style="' + stickyText(i) + '">' + HB.esc(m.title) + '</div>' +
      (m.description ? '<div class="mem-sticky-desc" style="' + stickyText(i) + '">' + HB.esc(m.description) + '</div>' : '') +
      (m.date ? '<div class="mem-sticky-date" style="' + stickyText(i) + '">' + HB.esc(m.date) + '</div>' : '') +
    '</div>';
  }

  function openMemoryModal(m) {
    var body = '';
    if (m.img) {
      body = '<img class="mem-modal-img" src="' + HB.esc(m.img) + '" alt="' + HB.esc(m.title) + '"/>';
    }
    if (m.description) {
      body += '<p class="mem-modal-desc">' + HB.esc(m.description) + '</p>';
    }
    if (m.date || m.location) {
      body += '<p class="mem-modal-meta">' +
        (m.date ? '🗓 ' + HB.esc(m.date) : '') +
        (m.location ? ' · 📍 ' + HB.esc(m.location) : '') +
      '</p>';
    }
    HB.modal({
      title: m.title + (m.favorite ? ' ♥' : ''),
      body: body,
      actions: [
        { label: 'Close', kind: 'btn-soft' }
      ]
    });
  }

  function renderColumn(container, memories, ownerLabel, isOwn) {
    var html = '<div class="mem-col-header">' +
      '<h3 class="mem-col-name">' + HB.esc(ownerLabel) + '</h3>' +
      '<span class="mem-col-count">' + memories.length + ' kept</span>' +
    '</div>';

    if (!memories.length) {
      html += '<div class="mem-empty">' +
        '<p>' + (isOwn ? 'Add your first memory ♡' : 'No memories yet from ' + HB.esc(ownerLabel)) + '</p>' +
      '</div>';
    } else {
      html += '<div class="mem-col-grid">';
      memories.forEach(function (m, i) {
        html += memoryCardHtml(m, i, ownerLabel);
      });
      html += '</div>';
    }

    if (isOwn) {
      html += '<button class="btn btn-primary mem-add-btn" data-add-mem>+ Add Memory</button>';
    }

    container.innerHTML = html;

    /* Wire delete buttons */
    container.querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var card = b.closest('.mem-card');
        var id = card.dataset.id;
        HB.confirm('Remove this memory?', 'It will be taken out of your gallery.', function () {
          HB.state.memories = HB.state.memories.filter(function (m) { return m.id !== id; });
          HB.save();
          renderAll();
          HB.toast('Memory removed', '🗑️');
        });
      });
    });

    /* Wire card click → modal */
    container.querySelectorAll('.mem-card').forEach(function (card) {
      card.addEventListener('click', function (e) {
        if (e.target.closest('[data-del]')) return;
        var allMems = HB.state.memories;
        var m = allMems.filter(function (x) { return x.id === card.dataset.id; })[0];
        if (m) openMemoryModal(m);
      });
    });
  }

  function renderAll() {
    var mems = HB.state.memories || [];
    var names = HB.firstNames();

    /* Determine owner for each memory — use 'me' or 'partner'
       property if present, otherwise default to 'me' (backward compat) */
    var myMems = mems.filter(function (m) { return !m.owner || m.owner === 'me'; });
    var partnerMems = mems.filter(function (m) { return m.owner === 'partner'; });

    var col1 = document.getElementById('mem-col-me');
    var col2 = document.getElementById('mem-col-partner');
    if (col1) renderColumn(col1, myMems, names.me, true);
    if (col2) renderColumn(col2, partnerMems, names.partner, false);
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
            time: Date.now(),
            owner: 'me'
          };
          HB.state.memories.unshift(m);
          HB.save();
          HB.toast('Memory saved ♡', '📸');
          renderAll();
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

  HB.route('/memories', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var mems = HB.state.memories || [];
    var total = mems.length;

    main.innerHTML =
      '<div class="page">' +
      '<div class="dash-hello"><h1>Our <span class="hand" style="font-size:1.15em">memories</span> 📸</h1>' +
      '<p>Your digital memory gallery — little moments worth keeping, from each of you.</p></div>' +

      '<div class="mem-toolbar">' +
        '<span class="chip selected" id="mem-filter-all">All</span>' +
        '<span class="chip" id="mem-filter-fav">Favorites ♥</span>' +
        '<span class="muted" style="font-size:13px;font-weight:700">' + total + ' kept</span>' +
      '</div>' +

      '<div class="mem-columns" id="mem-columns">' +
        '<div class="mem-column" id="mem-col-me"></div>' +
        '<div class="mem-column" id="mem-col-partner"></div>' +
      '</div>' +
      '</div>';

    renderAll();

    /* Add memory button (wired inside renderColumn for own column) */
    main.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-add-mem]');
      if (btn) showAddForm();
    });

    /* Filter toggle */
    main.querySelector('#mem-filter-all').addEventListener('click', function () {
      this.classList.add('selected');
      main.querySelector('#mem-filter-fav').classList.remove('selected');
      main.querySelectorAll('.mem-card').forEach(function (c) { c.style.display = ''; });
    });
    main.querySelector('#mem-filter-fav').addEventListener('click', function () {
      this.classList.add('selected');
      main.querySelector('#mem-filter-all').classList.remove('selected');
      main.querySelectorAll('.mem-card').forEach(function (c) {
        var id = c.dataset.id;
        var m = (HB.state.memories || []).filter(function (x) { return x.id === id; })[0];
        c.style.display = (m && m.favorite) ? '' : 'none';
      });
    });
  });
})();
