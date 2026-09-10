(function () {

  var RECENT_KEY = 'ourLittleWorld_recentEmojis';
  var MAX_RECENTS = 24;

  var CATS = [
    { id: 'smileys', name: 'Smileys', emojis: ['😀', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😜', '🤪', '😝', '🤩', '😎', '🤓', '🥳', '😏', '😌', '😢', '😭', '🥹', '😤', '😳', '🥺', '😴', '🤗', '🤭', '🙃', '😶', '😬', '😈'] },
    { id: 'love', name: 'Love', emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💖', '💗', '💓', '💞', '💕', '💘', '💝', '💟', '❣️', '💑', '👩‍❤️‍👨', '💋', '😍', '🥰', '😘', '😻', '💌', '💍', '🌹', '💐'] },
    { id: 'gestures', name: 'Gestures', emojis: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👈', '👉', '👆', '👇', '☝️', '👋', '🤚', '🖐️', '✋', '🖖', '👏', '🙌', '🤝', '🙏', '💪', '🫶', '👐', '✊', '👊', '🤛', '🤜'] },
    { id: 'animals', name: 'Animals', emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦉', '🦄', '🐝', '🦋', '🐢', '🐙', '🦀', '🐠', '🐬', '🐳', '🐾'] },
    { id: 'nature', name: 'Nature', emojis: ['🌺', '🌸', '🌼', '🌻', '🌷', '🌹', '🌵', '🌲', '🌳', '🌴', '🍀', '🌿', '🍄', '🌾', '⭐', '🌟', '✨', '☀️', '🌤️', '🌙', '🌈', '☁️', '⚡', '❄️', '🔥', '💧', '🌊', '🏔️', '🌋', '🍂'] },
    { id: 'food', name: 'Food', emojis: ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🥑', '🍞', '🧀', '🍔', '🍟', '🍕', '🌭', '🌮', '🌯', '🍝', '🍜', '🍣', '🍪', '🍩', '🍰', '🎂', '🍫', '🍿', '🥤', '🍵', '☕', '🍺', '🍷'] },
    { id: 'fun', name: 'Fun', emojis: ['🎉', '🎊', '🎈', '🎁', '🎀', '🎵', '🎶', '🎤', '🎧', '🧩', '🎲', '🎯', '🎨', '🎮', '🕹️', '🎬', '🎭', '🎪', '🎢', '🚀', '🌈', '💃', '🕺', '🥳', '🎆', '🎇', '🌟', '👑'] },
    { id: 'travel', name: 'Travel', emojis: ['✈️', '🚀', '🚗', '🚕', '🚲', '🏍️', '🚆', '🚌', '⛵', '🚤', '🗺️', '📍', '📌', '🏖️', '🏝️', '🌅', '🌄', '🌃', '🌆', '🏰', '🗽', '🎡', '🏛️', '🏠', '🏡', '⛺', '🗻', '🌊', '☀️'] },
    { id: 'objects', name: 'Objects', emojis: ['💬', '💭', '💡', '📷', '📸', '📱', '💻', '⌚', '🕰️', '📚', '📖', '✏️', '📝', '📌', '📎', '✂️', '🔑', '🔒', '🔓', '🔔', '🎁', '🖼️', '📺', '📻', '🧸', '🎀', '🕯️', '💌', '🏺'] },
    { id: 'symbols', name: 'Symbols', emojis: ['✔️', '✖️', '❌', '✅', '❓', '❗', '💯', '⚠️', '🚫', '🔆', '🔅', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '💠', '🔶', '🔷', '💤', '💢', '💫', '❣️'] }
  ];

  function readRecents() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch (e) { return []; }
  }

  function writeRecents(list) {
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function pushRecent(emoji) {
    var list = readRecents().filter(function (e) { return e !== emoji; });
    list.unshift(emoji);
    writeRecents(list.slice(0, MAX_RECENTS));
  }

  function tabHtml(cat, active) {
    return '<button class="ep-tab' + (active ? ' active' : '') + '" data-ep-tab="' + cat.id + '">' + HB.esc(cat.name) + '</button>';
  }

  function gridHtml(list) {
    return list.map(function (e) { return '<button class="ep-em" data-ep-em="' + HB.esc(e) + '">' + e + '</button>'; }).join('');
  }

  function render(root, catId) {
    var tabs = root.querySelector('.ep-tabs');
    var grid = root.querySelector('.ep-grid');
    var isRecent = catId === 'recent';
    var list = isRecent ? readRecents() : (CATS.filter(function (c) { return c.id === catId; })[0] || {}).emojis || [];
    tabs.innerHTML = tabHtml({ id: 'recent', name: 'Recent' }, isRecent) +
      CATS.map(function (c) { return tabHtml(c, c.id === catId); }).join('');
    grid.innerHTML = list.length ? gridHtml(list) : '<div class="ep-empty">No recent emojis yet</div>';
    grid.dataset.epCat = isRecent ? 'recent' : catId;
  }

  function pickerHtml() {
    return '<div class="emoji-pop" data-emojipop hidden>' +
      '<div class="ep-tabs"></div>' +
      '<div class="ep-body"><div class="ep-grid" data-ep-cat="recent"></div></div>' +
      '</div>';
  }

  function wire(root, onPick) {
    if (root.__epWired) return;
    root.__epWired = true;
    render(root, 'recent');
    root.addEventListener('click', function (ev) {
      var em = ev.target.closest('.ep-em');
      if (em && em.dataset.epEm) {
        pushRecent(em.dataset.epEm);
        if (onPick) onPick(em.dataset.epEm, 'emoji');
        return;
      }
      var tab = ev.target.closest('.ep-tab');
      if (tab && tab.dataset.epTab) {
        render(root, tab.dataset.epTab);
        if (onPick) onPick(tab.dataset.epTab, 'tab');
      }
    });
  }

  window.HB.emojiCategories = CATS;
  window.HB.emojiRecents = readRecents;
  window.HB.emojiPushRecent = pushRecent;
  window.HB.emojiPickerHtml = pickerHtml;
  window.HB.emojiWire = wire;

})();