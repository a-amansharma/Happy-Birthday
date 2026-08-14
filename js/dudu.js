/* ============================================================
   DUDU & BUBU — premium 3D-inspired animated SVG characters
   ------------------------------------------------------------
   Soft radial-graded bodies, glossy highlights, big sparkle
   eyes, blush cheeks — CSS-driven animation (GPU friendly),
   respects prefers-reduced-motion. Dudu = cream + teal bow,
   Bubu = pink + lavender bow.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  function rad(id, stops) {
    return '<radialGradient id="' + id + '" cx="38%" cy="30%" r="75%">' + stops.join('') + '</radialGradient>';
  }

  function defs() {
    return rad('ddBodyD', [
        '<stop offset="0%" stop-color="#FFF4E6"/>',
        '<stop offset="55%" stop-color="#FFE3C2"/>',
        '<stop offset="100%" stop-color="#F4C79E"/>'
      ])
      + rad('ddBodyB', [
        '<stop offset="0%" stop-color="#FFF0F5"/>',
        '<stop offset="55%" stop-color="#FFD9E6"/>',
        '<stop offset="100%" stop-color="#F7B6CD"/>'
      ])
      + rad('ddHeadD', [
        '<stop offset="0%" stop-color="#FFF7EC"/>',
        '<stop offset="60%" stop-color="#FFE7CB"/>',
        '<stop offset="100%" stop-color="#F6CDA6"/>'
      ])
      + rad('ddHeadB', [
        '<stop offset="0%" stop-color="#FFF7FA"/>',
        '<stop offset="60%" stop-color="#FFDEEA"/>',
        '<stop offset="100%" stop-color="#F8BBD1"/>'
      ])
      + rad('ddBelly', [
        '<stop offset="0%" stop-color="#FFFFFF"/>',
        '<stop offset="100%" stop-color="#FFF4E6"/>'
      ])
      + rad('ddBellyB', [
        '<stop offset="0%" stop-color="#FFFFFF"/>',
        '<stop offset="100%" stop-color="#FFF0F5"/>'
      ]);
  }

  var DU = {
    name: 'Dudu',
    body: 'url(#ddBodyD)', head: 'url(#ddHeadD)', belly: 'url(#ddBelly)',
    line: '#E3B98F', inner: '#F9BE98', cheek: 'rgba(255,150,140,0.5)',
    dark: '#7A4E33', bow: '#6EC6B5', bowDark: '#4FA899'
  };
  var BU = {
    name: 'Bubu',
    body: 'url(#ddBodyB)', head: 'url(#ddHeadB)', belly: 'url(#ddBellyB)',
    line: '#F0B3CC', inner: '#F9B6D4', cheek: 'rgba(255,140,180,0.5)',
    dark: '#7A3B5C', bow: '#A99DF2', bowDark: '#8A7BE8'
  };

  /* A single character, origin at ground (0,0), centered x=50.
     width ~ 100, height ~ 118. Facing right by default. */
  function character(c, uid) {
    var p = [];
    p.push('<g class="dd-char">');
    // shadow
    p.push('<ellipse cx="50" cy="-2" rx="40" ry="7" fill="rgba(0,0,0,0.08)"/>');
    // feet
    p.push('<ellipse cx="34" cy="-5" rx="11" ry="6" fill="' + c.body + '" stroke="' + c.line + '" stroke-width="1.6"/>');
    p.push('<ellipse cx="66" cy="-5" rx="11" ry="6" fill="' + c.body + '" stroke="' + c.line + '" stroke-width="1.6"/>');
    // body + belly
    p.push('<ellipse class="dd-body" cx="50" cy="-32" rx="33" ry="29" fill="' + c.body + '" stroke="' + c.line + '" stroke-width="2"/>');
    p.push('<ellipse class="dd-belly" cx="50" cy="-25" rx="20" ry="17" fill="' + c.belly + '"/>');
    p.push('<path class="dd-body-shine" d="M24 -48 q8 -16 22 -14" fill="none" stroke="rgba(255,255,255,0.65)" stroke-width="6" stroke-linecap="round"/>');
    // arms (stroke "fat" lines + paw circles)
    p.push('<g class="dd-armL"><path d="M21 -40 Q 8 -26 14 -10" fill="none" stroke="' + c.body + '" stroke-width="15" stroke-linecap="round"/><circle class="dd-armL-paw" cx="14" cy="-10" r="8" fill="' + c.head + '"/></g>');
    p.push('<g class="dd-armR"><path d="M79 -40 Q 92 -26 86 -10" fill="none" stroke="' + c.body + '" stroke-width="15" stroke-linecap="round"/><circle class="dd-armR-paw" cx="86" cy="-10" r="8" fill="' + c.head + '"/></g>');
    // head group (everything that blinks / tilts)
    p.push('<g class="dd-head">');
    // ears
    p.push('<circle cx="26" cy="-100" r="13" fill="' + c.head + '" stroke="' + c.line + '" stroke-width="2"/>');
    p.push('<circle cx="26" cy="-100" r="6" fill="' + c.inner + '"/>');
    p.push('<circle cx="74" cy="-100" r="13" fill="' + c.head + '" stroke="' + c.line + '" stroke-width="2"/>');
    p.push('<circle cx="74" cy="-100" r="6" fill="' + c.inner + '"/>');
    // head base
    p.push('<ellipse class="dd-headbase" cx="50" cy="-80" rx="31" ry="30" fill="' + c.head + '" stroke="' + c.line + '" stroke-width="2.2"/>');
    p.push('<path d="M24 -96 q8 -14 20 -12" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="6" stroke-linecap="round"/>');
    // eyes (group for blink)
    p.push('<g class="dd-eyeL"><circle cx="37" cy="-88" r="4.6" fill="' + c.dark + '"/><circle cx="38.6" cy="-89.6" r="1.6" fill="#fff"/></g>');
    p.push('<g class="dd-eyeR"><circle cx="63" cy="-88" r="4.6" fill="' + c.dark + '"/><circle cx="64.6" cy="-89.6" r="1.6" fill="#fff"/></g>');
    // blush
    p.push('<ellipse class="dd-cheekL" cx="29" cy="-76" rx="5.5" ry="3.4" fill="' + c.cheek + '"/>');
    p.push('<ellipse class="dd-cheekR" cx="71" cy="-76" rx="5.5" ry="3.4" fill="' + c.cheek + '"/>');
    // muzzle + nose + mouth
    p.push('<ellipse cx="50" cy="-70" rx="12.5" ry="9" fill="#FFF6EC"/>');
    p.push('<ellipse cx="50" cy="-74" rx="4.6" ry="3.3" fill="' + c.dark + '"/>');
    p.push('<ellipse cx="50" cy="-74.8" rx="1.5" ry="1" fill="#fff" opacity="0.85"/>');
    p.push('<path class="dd-mouth" d="M45 -66 q5 5 10 0" fill="none" stroke="' + c.dark + '" stroke-width="2.2" stroke-linecap="round"/>');
    p.push('<path class="dd-mouth-open" d="M44 -67 q6 8 12 0" fill="none" stroke="' + c.dark + '" stroke-width="2.2" stroke-linecap="round" opacity="0"/>');
    // head shine
    p.push('<ellipse cx="38" cy="-96" rx="7" ry="4" fill="#fff" opacity="0.35" transform="rotate(-18 38 -96)"/>');
    // bow
    p.push('<g class="dd-bow">'
      + '<path d="M40 -111 q-6 -3 -3 -8 q3 -5 8 -1 z" fill="' + c.bow + '" stroke="' + c.bowDark + '" stroke-width="1.4"/>'
      + '<path d="M60 -111 q6 -3 3 -8 q-3 -5 -8 -1 z" fill="' + c.bow + '" stroke="' + c.bowDark + '" stroke-width="1.4"/>'
      + '<circle cx="50" cy="-113" r="3.4" fill="' + c.bowDark + '"/>'
      + '</g>');
    p.push('</g>'); // /head
    p.push('</g>'); // /char
    return '<g class="dd-char-inner dd-' + uid + '">' + p.join('') + '</g>';
  }

  /* ---------- scene ----------
     opts: pose ('idle','wave','together','hug','kiss','celebrate','wait','look')
     size: width/height of svg viewBox */
  function heartSVG() {
    return '<path d="M0 4 C-8 -6 -19 0 -19 9 a9 9 0 0 0 17 2.5 a9 9 0 0 0 17 -2.5 C17 0 8 -6 0 4z" fill="#F47BA0" stroke="#D95584" stroke-width="1.8"/>';
  }

  /* Floating "?" bubble for the curious (not-yet-met) stage */
  function qb(x, y, r, fs, color) {
    return '<g class="dd-q">' +
      '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="#FFFFFF" opacity="0.95"/>' +
      '<text x="' + x + '" y="' + (y + fs * 0.36) + '" text-anchor="middle" font-size="' + fs + '" font-weight="800" fill="' + color + '">?</text>' +
      '</g>';
  }

  function scene(opts) {
    opts = opts || {};
    var pose = opts.pose || 'idle';
    var w = opts.width || 340;
    var h = opts.height || 240;
    var duFlip = '';   // Dudu faces right (toward Bubu on the right)
    var buFlip = ' transform="translate(340,0) scale(-1,1)"'; // Bubu mirrored to face left
    var duX = opts.duX !== undefined ? opts.duX : 92;
    var buX = opts.buX !== undefined ? opts.buX : 248;

    var du = '<g class="dd-pos du-pos" transform="translate(' + duX + ',0)"><g class="dd-move du-move">' + character(DU, 'du') + '</g></g>';
    var bu = '<g class="dd-pos bu-pos"' + buFlip + '>'
      + '<g transform="translate(' + (340 - buX) + ',0)"><g class="dd-move bu-move">' + character(BU, 'bu') + '</g></g></g>';

    var p = [];
    p.push('<svg class="dudu-svg" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">');
    p.push('<defs>' + defs() + '</defs>');
    p.push('<g class="dd-ground"><ellipse cx="' + w / 2 + '" cy="' + (h - 16) + '" rx="' + (w * 0.42) + '" ry="12" fill="var(--glow, rgba(232,160,168,0.25))"/></g>');
    p.push('<g class="dd-sparkles"><text x="30" y="34" font-size="13" fill="#F7B6CD" opacity="0.8">✦</text>'
      + '<text x="312" y="30" font-size="11" fill="#6EC6B5" opacity="0.8">✦</text>'
      + '<text x="170" y="26" font-size="10" fill="#F7B6CD" opacity="0.7">✦</text></g>');
    p.push(du);
    p.push(bu);
    if (opts.story) {
      p.push('<g class="dd-qs" aria-hidden="true">'
        + qb(24, 92, 12, 15, '#C4AEDD')
        + qb(72, 40, 10, 12, '#EFA9C4')
        + qb(270, 40, 10, 12, '#9CCBC4')
        + qb(316, 92, 12, 15, '#CDB5E4')
        + qb(172, 30, 9, 11, '#E2C6F0')
        + '</g>');
    }
    p.push('<g class="dd-heart-wrap" transform="translate(' + (w / 2) + ',' + (h - 62) + ')"><g class="dd-heart-inner">' + heartSVG() + '</g></g>');
    p.push('</svg>');
    return '<div class="dudu-stage dudu-' + pose + '">' + p.join('') +
      '<div class="dudu-hearts" aria-hidden="true"><span>♥</span><span>♡</span><span>♥</span><span>♡</span></div>' +
      '</div>';
  }

  /* Convenience scenes */
  function sceneIdle() { return scene({ pose: 'idle' }); }
  function sceneTogether() { return scene({ pose: 'together', duX: 112, buX: 228 }); }
  function sceneHug() { return scene({ pose: 'hug', duX: 126, buX: 214 }); }
  function sceneKiss() { return scene({ pose: 'kiss', duX: 126, buX: 214 }); }
  function sceneCelebrate() { return scene({ pose: 'celebrate', duX: 118, buX: 222 }); }
  function sceneWait() { return scene({ pose: 'wait' }); }
  function sceneLook() { return scene({ pose: 'look' }); }

  /* ---------- props (small standalone decorations) ---------- */
  function coffeeCup() {
    return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<path d="M14 18 h26 v24 q0 6 -6 6 h-14 q-6 0 -6 -6 z" fill="#FFFFFF" stroke="#E3B98F" stroke-width="2.4"/>' +
      '<ellipse cx="27" cy="18" rx="13" ry="5" fill="#FBE9D4" stroke="#E3B98F" stroke-width="2.2"/>' +
      '<path d="M40 22 q8 1 8 8 q0 7 -8 7" fill="none" stroke="#E3B98F" stroke-width="2.4" stroke-linecap="round"/>' +
      '<path d="M20 12 q3 -6 7 -5" fill="none" stroke="rgba(255,255,255,0.9)" stroke-width="3" stroke-linecap="round"/>' +
      '<ellipse cx="27" cy="26" rx="8" ry="4.5" fill="#C98A4B" opacity="0.9"/>' +
      '<path d="M18 30 q3 3 6 0" fill="none" stroke="#E3B98F" stroke-width="1.6" stroke-linecap="round"/>' +
      '</svg>';
  }

  function loveHeart() {
    return '<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      heartSVG().replace('fill="#F47BA0"', 'fill="#F47BA0"').replace('transform="translate(0,4)"', '') +
      '</svg>';
  }

  /* Small circular face avatar (for chat headers etc.) */
  function avatarFace(which) {
    var c = which === 'bu' ? BU : DU;
    return '<svg class="dudu-avatar" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' + rad('ddAv' + (which === 'bu' ? 'B' : 'D'), [
        '<stop offset="0%" stop-color="' + (which === 'bu' ? '#FFF7FA' : '#FFF7EC') + '"/>',
        '<stop offset="100%" stop-color="' + (which === 'bu' ? '#F8BBD1' : '#F6CDA6') + '"/>'
      ]) + '</defs>' +
      '<circle cx="32" cy="34" r="26" fill="url(#ddAv' + (which === 'bu' ? 'B' : 'D') + ')" stroke="' + c.line + '" stroke-width="2"/>' +
      '<circle cx="20" cy="14" r="6" fill="url(#ddAv' + (which === 'bu' ? 'B' : 'D') + ')" stroke="' + c.line + '" stroke-width="1.8"/>' +
      '<circle cx="44" cy="14" r="6" fill="url(#ddAv' + (which === 'bu' ? 'B' : 'D') + ')" stroke="' + c.line + '" stroke-width="1.8"/>' +
      '<circle cx="20" cy="14" r="2.6" fill="' + c.inner + '"/>' +
      '<circle cx="44" cy="14" r="2.6" fill="' + c.inner + '"/>' +
      '<g class="dd-ava-eye"><circle cx="26" cy="34" r="3.2" fill="' + c.dark + '"/><circle cx="27" cy="33" r="1.1" fill="#fff"/></g>' +
      '<g class="dd-ava-eye"><circle cx="38" cy="34" r="3.2" fill="' + c.dark + '"/><circle cx="39" cy="33" r="1.1" fill="#fff"/></g>' +
      '<ellipse cx="32" cy="42" rx="8" ry="5.5" fill="#FFF6EC"/>' +
      '<ellipse cx="32" cy="40" rx="3" ry="2.2" fill="' + c.dark + '"/>' +
      '<path d="M29 45 q3 3 6 0" fill="none" stroke="' + c.dark + '" stroke-width="1.8" stroke-linecap="round"/>' +
      '<g transform="translate(' + (which === 'bu' ? '42' : '22') + ',8)">' +
        '<path d="M0 -3 q-4 -2 -2 -5.5 q2 -3.5 5.5 -0.7 z" fill="' + c.bow + '" stroke="' + c.bowDark + '" stroke-width="1"/>' +
        '<path d="M0 -3 q4 -2 2 -5.5 q-2 -3.5 -5.5 -0.7 z" fill="' + c.bow + '" stroke="' + c.bowDark + '" stroke-width="1"/>' +
        '<circle r="2.2" fill="' + c.bowDark + '" cx="0" cy="-4"/>' +
      '</g>' +
      '<circle cx="24" cy="28" r="1.6" fill="#fff" opacity="0.5"/>' +
      '</svg>';
  }

  /* ---------- landing hero sequence ---------- */
  function landingSequence(el, loopCount) {
    if (!el || !el.isConnected) return;
    var stage = el.querySelector('.dudu-stage');
    if (!stage) return;

    var phases = ['look', 'approach', 'heart', 'touch', 'smile', 'kiss', 'rest'];
    var step = 0;
    var timers = [];

    function clear() {
      timers.forEach(function (t) { clearTimeout(t); });
      timers = [];
      stage.className = 'dudu-stage';
    }

    function run() {
      if (!el.isConnected || !stage.isConnected) return;
      var phase = phases[step];
      stage.className = 'dudu-stage dudu-phase-' + phase;
      step++;
      var next = step >= phases.length ? 0 : step;
      var delay = phase === 'kiss' ? 1500 : phase === 'rest' ? 2600 : 900;
      timers.push(setTimeout(run, delay));
    }

    clear();
    run();
    return { stop: clear };
  }

  /* ---------- story stages: gradual meeting ----------
     'curious'   → far apart + floating "?" (before personal details)
     'approach'  → walk closer, soft hearts (details done, waiting)
     'together'  → meet in the center, hug & kiss loop (connected) */
  var STORY_PHASES = ['look', 'approach', 'heart', 'touch', 'smile', 'kiss', 'rest'];
  var STORY_DELAY = { look: 2200, approach: 2400, heart: 2800, touch: 2400, smile: 2400, kiss: 3200, rest: 3600 };

  function stripStory(stage) {
    var keep = ['dudu-stage', 'dudu-small'];
    stage.className = stage.className.split(/\s+/).filter(function (c) {
      return keep.indexOf(c) !== -1 || !/^dudu-/.test(c);
    }).join(' ');
  }

  function stopPhases(stage) {
    if (stage.__ddTimer) { clearTimeout(stage.__ddTimer); stage.__ddTimer = null; }
    STORY_PHASES.forEach(function (p) { stage.classList.remove('dudu-phase-' + p); });
  }

  function startPhases(stage) {
    var i = 0;
    function loop() {
      if (!stage.isConnected) return;
      var phase = STORY_PHASES[i];
      stopPhases(stage);
      stage.classList.add('dudu-phase-' + phase);
      i = (i + 1) % STORY_PHASES.length;
      stage.__ddTimer = setTimeout(loop, STORY_DELAY[phase]);
    }
    loop();
  }

  function meeting(el, state) {
    if (!el || !el.isConnected) return;
    state = state === 'together' ? 'together' : state === 'approach' ? 'approach' : 'curious';
    var stage = el.querySelector('.dudu-stage');
    if (!stage) {
      el.innerHTML = scene({ story: true });
      stage = el.querySelector('.dudu-stage');
    }
    if (!stage) return;

    stopPhases(stage);
    stripStory(stage);

    if (state === 'curious') {
      stage.classList.add('dudu-story-curious');
      return;
    }

    stage.classList.add('dudu-story-curious');
    void stage.offsetWidth;
    stage.classList.remove('dudu-story-curious');
    stage.classList.add(state === 'together' ? 'dudu-story-together' : 'dudu-story-approach');
    if (state === 'together') startPhases(stage);
  }

  HB.dudu = {
    scene: scene,
    sceneIdle: sceneIdle,
    sceneTogether: sceneTogether,
    sceneHug: sceneHug,
    sceneKiss: sceneKiss,
    sceneCelebrate: sceneCelebrate,
    sceneWait: sceneWait,
    sceneLook: sceneLook,
    coffeeCup: coffeeCup,
    loveHeart: loveHeart,
    avatarFace: avatarFace,
    landingSequence: landingSequence,
    meeting: meeting,
    character: character,
    colors: { DU: DU, BU: BU }
  };
})();
