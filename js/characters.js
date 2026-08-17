/* ============================================================
   CHARACTERS — real Bubu & Dudu GIFs (Tenor / Tkthao219)
   ------------------------------------------------------------
   Replaces the SVG bears with the official "bubududu" sticker
   GIFs, hotlinked from media.tenor.com.

   API:
     HB.chars.stageHtml(opts)      -> HTML for a .bb-stage block
     HB.chars.show(el, opts)       -> crossfade a new GIF into a stage
     HB.chars.hero(el, opts)       -> auto-rotating pair/single hero
     HB.chars.avatarImg(w,a,cls)   -> round GIF avatar HTML
     HB.chars.preload(list)        -> warm the cache
     HB.chars.cornerStart()        -> random corner peekers
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var B = 'images/bb/';
  var FALLBACK = B + 'PXKZhCEfEfs-bubu-bubu-dudu.webp';

  var A = {
    dudu: {
      happy: [B + 'U46hkmgdkHI-dudu-dance-sparkly-eyes.webp'],
      dance: [B + 'U46hkmgdkHI-dudu-dance-sparkly-eyes.webp'],
      think: [B + 'FXGgx2p21G8-dudu-thinking-dudu.webp'],
      wait: [B + 'kmMQzovrlyg-bubu-dudu-dudu.webp'],
      cool: [B + '3qIAMwBVG8U-finger-guns-dudu.webp'],
      funny: [B + 'n6aqi5n3eOU-dudu-naughty.webp'],
      sad: [B + 'hJmehlxWCWE-bubu-bubu-dudu.webp']
    },
    bubu: {
      happy: [B + 'Qj40AdvEqKs-bubu-happy.webp', B + '9KwYWqOar2M-bubu-dance-happy.webp'],
      dance: [B + '9KwYWqOar2M-bubu-dance-happy.webp'],
      kiss: [B + 'NeAiZhhN4kk-beam-love.webp'],
      cute: [B + 'pdv5YIMB-hk-cute.webp', B + 'KNiXTCA36YY-bubu-dudu-sseeyall.webp'],
      love: [B + 'DSPmi9Mwrbc-screen-bubu.webp', B + 'UbiOjXKLkZI-bubu-dudu.webp'],
      think: [B + 'KNiXTCA36YY-bubu-dudu-sseeyall.webp'],
      wait: [B + 'KNiXTCA36YY-bubu-dudu-sseeyall.webp']
    },
    both: {
      kiss: [B + 'HKQ9w2VpTHw-ily.webp', B + 'mKr-KcMW9Rc-cute-bears.webp', B + 'oB0wHCkD6F4-danilimz.webp', B + 'vzkveVGDzmA-dudu-hug-bubu-dudu-kiss.webp'],
      hug: [B + 'PXKZhCEfEfs-bubu-bubu-dudu.webp', B + 'Lgr_6-nkvnU-casal-dudu.webp', B + 'aMOxt0o16TQ-bubu-bubu-dudu.webp', B + 'eEltmuPyMHU-hugs-hug.webp', B + 'hmYv6-dCkGg-bubu-dudu-bubu.webp'],
      sleep: [B + 'pUM4MBfvp7Y-bubu-dudu-sleep-dudu.webp', B + '9qZ1RvHNZJ4-bubu-dudu.webp', B + 'LGIdSmr7qUQ-bubu-love-bubu-dudu-love.webp'],
      love: [B + 'LGIdSmr7qUQ-bubu-love-bubu-dudu-love.webp', B + 'BnEsGZr4eUA-dudu-bubu-love.webp', B + 'VBZ2GDhkjOE-i-love-you-more-i-love-you-very-much.webp', B + 'KaTDbDxg8n0-tkthao219-bubududu.webp'],
      together: [B + 'KaTDbDxg8n0-tkthao219-bubududu.webp', B + '47MEc3Ifl28-bubu-dudu-bubu.webp', B + 'wKP-p_HtfOo-bubu-dudu.webp', B + 'VBZ2GDhkjOE-i-love-you-more-i-love-you-very-much.webp'],
      dance: [B + 'JStJlLTa44Y-dudu-bubu-dancing-dancung.webp', B + 'CDg7uH_hD84-tkthao219-bubududu.webp', B + 'tMK9w5Pk6HU-bubududu-panda.webp'],
      happy: [B + 'D6HDHJLAqb4-dudu-bubu-dudu.webp', B + 'Qj40AdvEqKs-bubu-happy.webp', B + '9KwYWqOar2M-bubu-dance-happy.webp', B + 'U46hkmgdkHI-dudu-dance-sparkly-eyes.webp'],
      missing: [B + 'eHHT6gj6v60-bubu-dudu.webp', B + 'hJmehlxWCWE-bubu-bubu-dudu.webp'],
      angry: [B + 'Z1pWYhQvF-s-bubu-dudu-bubu-angry.webp'],
      play: [B + 'QM8RkdRKc40-bubu-dudu-head.webp', B + '2hOzJ7GgeQ0-bubu-water-bubu-water-play.webp', B + 'syEpB0Ugdyc-bubu-dudu-bubu-dudu-love.webp'],
      romantic: [B + 'hmYv6-dCkGg-bubu-dudu-bubu.webp', B + 'oB0wHCkD6F4-danilimz.webp', B + 'LGIdSmr7qUQ-bubu-love-bubu-dudu-love.webp'],
      wait: [B + 'kmMQzovrlyg-bubu-dudu-dudu.webp'],
      cuddle: [B + 'Nes9mNbHJmY-dudu-bubu-dudu-ride-bubu.webp', B + 'pUM4MBfvp7Y-bubu-dudu-sleep-dudu.webp']
    }
  };

  function pick(list) { return list[(Math.random() * list.length) | 0]; }

  function src(which, action) {
    var list = (A[which] && A[which][action]) || (A[which] && A[which][which === 'both' ? 'love' : 'happy']) || null;
    return list && list.length ? pick(list) : null;
  }

  var SIZES = { land: 320, big: 300, hero: 180, sm: 180, tiny: 96, mini: 56, empty: 150 };

  function stageHtml(opts) {
    opts = opts || {};
    var which = opts.which || 'both';
    var action = opts.action || (which === 'both' ? 'love' : 'happy');
    var u = opts.src || src(which, action) || FALLBACK;
    var size = SIZES[opts.size] ? opts.size : 'big';
    var alt = opts.alt || 'Bubu ♡ Dudu';
    return '<div class="bb-stage bb-' + size + '" data-which="' + which + '">' +
      '<img class="bb-on" src="' + u + '" alt="' + HB.esc(alt) + '" loading="lazy" decoding="async" referrerpolicy="no-referrer"/>' +
      '</div>';
  }

  function show(el, opts) {
    if (!el || !el.isConnected) return;
    opts = opts || {};
    var stage = el.classList.contains('bb-stage') ? el : el.querySelector('.bb-stage');
    if (!stage) { el.innerHTML = stageHtml(opts); return; }
    var which = opts.which || stage.getAttribute('data-which') || 'both';
    var u = opts.src || src(which, opts.action || (which === 'both' ? 'love' : 'happy')) || FALLBACK;
    var top = stage.querySelector('img.bb-on');
    if (top && top.getAttribute('src') === u) return;
    var img = document.createElement('img');
    img.alt = opts.alt || 'Bubu ♡ Dudu';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.referrerPolicy = 'no-referrer';
    img.addEventListener('load', function () {
      if (!stage.isConnected) return;
      img.classList.add('bb-on');
      var olds = stage.querySelectorAll('img');
      olds.forEach(function (o) {
        if (o !== img) {
          o.classList.remove('bb-on');
          setTimeout(function () { if (o.parentNode === stage) o.remove(); }, 700);
        }
      });
    });
    img.addEventListener('error', function () { img.remove(); });
    stage.appendChild(img);
    img.src = u;
  }

  function preload(list) {
    if (!list || typeof Image === 'undefined') return;
    (Array.isArray(list) ? list : [list]).forEach(function (u) {
      var im = new Image();
      im.referrerPolicy = 'no-referrer';
      im.src = u;
    });
  }

  function peek(which, actions) {
    var out = [];
    var guard = 0;
    while (out.length < 2 && guard++ < 8) {
      var u = src(which, actions[(Math.random() * actions.length) | 0]);
      if (u && out.indexOf(u) === -1) out.push(u);
    }
    return out;
  }

  function hero(el, opts) {
    if (!el || !el.isConnected) return { stop: function () {} };
    opts = opts || {};
    var which = opts.which || 'both';
    var alternate = !!opts.alternate;
    var actions = opts.actions || (which === 'both'
      ? ['hug', 'kiss', 'love', 'dance', 'sleep', 'together', 'happy', 'romantic', 'play', 'cuddle', 'missing']
      : ['happy', 'cute', 'dance', 'funny', 'think', 'wait']);
    var min = opts.min || 10000;
    var max = opts.max || 32000;
    var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    el.innerHTML = stageHtml({ which: which, action: actions[0], size: opts.size, alt: opts.alt });
    var stage = el.querySelector('.bb-stage');
    if (!stage) return { stop: function () {} };
    preload(peek(which, actions));

    var timer = null;
    function cycle() {
      if (alternate) which = which === 'dudu' ? 'bubu' : 'dudu';
      var a = actions[(Math.random() * actions.length) | 0];
      show(stage, { which: which, action: a, alt: opts.alt });
      preload(peek(which, actions));
      schedule();
    }
    function schedule() {
      timer = setTimeout(function () {
        if (stage && stage.isConnected) cycle();
      }, min + Math.random() * (max - min));
    }
    if (!reduced) schedule();

    return { stop: function () { if (timer) clearTimeout(timer); } };
  }

  var AVATAR_MEMO = {};
  function avatarImg(which, action, cls) {
    var key = which + ':' + action;
    if (!AVATAR_MEMO[key]) AVATAR_MEMO[key] = src(which, action) || FALLBACK;
    return '<img class="bb-avatar' + (cls ? ' ' + cls : '') + '" src="' + AVATAR_MEMO[key] + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/>';
  }

  /* Random Bubu/Dudu characters that appear from screen edges and walk
     along the bottom. One character at a time. Supports:
       - Left edge peeking with a message
       - Right edge peeking with a message
       - Bottom walking animation across the screen
     Responsive sizes: smaller on mobile. */
  function cornerStart() {
    if (!document.body) return;
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var container = document.getElementById('bb-doodles');
    if (!container) {
      container = document.createElement('div');
      container.id = 'bb-doodles';
      container.className = 'bb-doodles';
      document.body.appendChild(container);
    }

    var activeDoodle = null; /* only one doodle at a time */

    var MESSAGES = [
      'Hi 👋', 'Hii 💕', 'Hello!', 'Hiii ♡', 'Hewwo~',
      'Heyy 💗', 'Hii there!', 'Hellooo ✨', 'Hiii 🥰', 'Hewwo ♡',
      'Heyy 🫧', 'Hiiii 💖', 'Hullo~', 'Hello! ♡', 'Hiii 🌸'
    ];

    function isMobile() {
      return window.innerWidth <= 860;
    }

    function pickChar() {
      return Math.random() < 0.5 ? 'dudu' : 'bubu';
    }

    function pickAction() {
      var actions = ['happy', 'cute', 'dance', 'funny', 'cool', 'think'];
      return actions[(Math.random() * actions.length) | 0];
    }

    function pickMessage() {
      return MESSAGES[(Math.random() * MESSAGES.length) | 0];
    }

    /* Remove any existing active doodle */
    function clearActive() {
      if (activeDoodle && activeDoodle.isConnected) {
        activeDoodle.classList.add('bb-doodle-exit');
        setTimeout(function () {
          if (activeDoodle && activeDoodle.parentNode) activeDoodle.remove();
          activeDoodle = null;
        }, 500);
      } else {
        activeDoodle = null;
      }
    }

    /* Create a peeker from left or right edge */
    function spawnPeek(side) {
      clearActive();
      var which = pickChar();
      var action = pickAction();
      var msg = pickMessage();
      var u = src(which, action) || FALLBACK;
      console.log('[DOODLE] Spawning peek:', side, which, action, msg);

      var el = document.createElement('div');
      el.className = 'bb-doodle bb-doodle-peek bb-doodle-' + side;
      el.innerHTML =
        '<div class="bb-doodle-msg">' + HB.esc(msg) + '</div>' +
        '<img class="bb-doodle-img" src="' + u + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/>';

      container.appendChild(el);
      activeDoodle = el;

      /* Auto-remove after 4-6 seconds */
      var dur = 4000 + Math.random() * 2000;
      setTimeout(function () {
        if (activeDoodle === el) {
          el.classList.add('bb-doodle-exit');
          setTimeout(function () {
            if (el.parentNode) el.remove();
            if (activeDoodle === el) activeDoodle = null;
          }, 500);
        }
      }, dur);
    }

    /* Create a walker along the bottom edge */
    function spawnWalker() {
      clearActive();
      var which = pickChar();
      var action = 'dance'; /* walking/dancing looks best */
      var u = src(which, action) || FALLBACK;
      var goRight = Math.random() < 0.5;
      console.log('[DOODLE] Spawning walker:', which, goRight ? 'left→right' : 'right→left');

      var el = document.createElement('div');
      el.className = 'bb-doodle bb-doodle-walk';
      if (goRight) {
        el.classList.add('bb-doodle-walk-lr');
      } else {
        el.classList.add('bb-doodle-walk-rl');
      }
      el.innerHTML = '<img class="bb-doodle-img" src="' + u + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"/>';

      container.appendChild(el);
      activeDoodle = el;

      /* Duration based on screen width */
      var walkDur = isMobile() ? 6000 : 8000 + Math.random() * 4000;
      el.style.setProperty('--walk-dur', walkDur + 'ms');

      /* Auto-remove after walk completes */
      setTimeout(function () {
        if (el.parentNode) el.remove();
        if (activeDoodle === el) activeDoodle = null;
      }, walkDur + 1000);
    }

    function once() {
      /* Random interval between spawns: 20-40 seconds */
      var wait = 20000 + Math.random() * 20000;
      setTimeout(function () {
        if (!document.body) return;
        if (!activeDoodle) {
          /* Pick a random behavior */
          var r = Math.random();
          if (r < 0.3) {
            spawnPeek('left');
          } else if (r < 0.6) {
            spawnPeek('right');
          } else {
            spawnWalker();
          }
        }
        once();
      }, wait);
    }

    once();
  }

  HB.chars = {
    src: src,
    stageHtml: stageHtml,
    show: show,
    hero: hero,
    avatarImg: avatarImg,
    preload: preload,
    cornerStart: cornerStart,
    FALLBACK: FALLBACK
  };
})();
