/* ============================================================
   BEARS — cute Milk & Mocha style SVG illustrations
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var PALETTES = {
    milk: { body: '#FFF6EE', inner: '#FFD9E0', muzzle: '#FFFFFF', line: '#EBD5C0' },
    mocha: { body: '#A97E5B', inner: '#F0C9A8', muzzle: '#E8C9A6', line: '#8B6246' },
    pinky: { body: '#FFE9EF', inner: '#FFB7C9', muzzle: '#FFFFFF', line: '#F3C6D3' }
  };

  function bearHead(b, cx, cy, r, flip) {
    var f = flip ? -1 : 1;
    var parts = [];
    parts.push('<ellipse cx="' + (cx - r * 0.48 * f) + '" cy="' + (cy - r * 0.52) + '" rx="' + r * 0.34 + '" ry="' + r * 0.34 + '" fill="' + b.body + '" stroke="' + b.line + '" stroke-width="1.4"/>');
    parts.push('<ellipse cx="' + (cx + r * 0.48 * f) + '" cy="' + (cy - r * 0.52) + '" rx="' + r * 0.34 + '" ry="' + r * 0.34 + '" fill="' + b.body + '" stroke="' + b.line + '" stroke-width="1.4"/>');
    parts.push('<ellipse cx="' + (cx - r * 0.48 * f) + '" cy="' + (cy - r * 0.52) + '" rx="' + r * 0.18 + '" ry="' + r * 0.18 + '" fill="' + b.inner + '"/>');
    parts.push('<ellipse cx="' + (cx + r * 0.48 * f) + '" cy="' + (cy - r * 0.52) + '" rx="' + r * 0.18 + '" ry="' + r * 0.18 + '" fill="' + b.inner + '"/>');
    parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="' + b.body + '" stroke="' + b.line + '" stroke-width="1.6"/>');
    return parts.join('');
  }

  function bearFace(b, cx, cy, r, mood) {
    var f = '';
    var blush = 'rgba(240,130,140,0.35)';
    if (mood === 'love') {
      // closed happy eyes ^ ^
      f += '<path d="M' + (cx - r * 0.42) + ' ' + (cy - r * 0.08) + ' q ' + (r * 0.18) + ' ' + (-r * 0.24) + ' ' + (r * 0.36) + ' 0" fill="none" stroke="' + b.line + '" stroke-width="3" stroke-linecap="round"/>';
      f += '<path d="M' + (cx + r * 0.06) + ' ' + (cy - r * 0.08) + ' q ' + (r * 0.18) + ' ' + (-r * 0.24) + ' ' + (r * 0.36) + ' 0" fill="none" stroke="' + b.line + '" stroke-width="3" stroke-linecap="round"/>';
      f += '<path d="M' + (cx - r * 0.16) + ' ' + (cy + r * 0.18) + ' q ' + (r * 0.16) + ' ' + (r * 0.2) + ' ' + (r * 0.32) + ' 0" fill="none" stroke="' + b.line + '" stroke-width="2.6" stroke-linecap="round"/>';
    } else if (mood === 'happy') {
      f += '<circle cx="' + (cx - r * 0.42) + '" cy="' + (cy - r * 0.1) + '" r="' + r * 0.07 + '" fill="' + b.line + '"/>';
      f += '<circle cx="' + (cx + r * 0.42) + '" cy="' + (cy - r * 0.1) + '" r="' + r * 0.07 + '" fill="' + b.line + '"/>';
      f += '<path d="M' + (cx - r * 0.22) + ' ' + (cy + r * 0.12) + ' q ' + (r * 0.22) + ' ' + (r * 0.26) + ' ' + (r * 0.44) + ' 0" fill="none" stroke="' + b.line + '" stroke-width="2.6" stroke-linecap="round"/>';
    } else if (mood === 'blush') {
      f += '<circle cx="' + (cx - r * 0.42) + '" cy="' + (cy - r * 0.1) + '" r="' + r * 0.06 + '" fill="' + b.line + '"/>';
      f += '<circle cx="' + (cx + r * 0.42) + '" cy="' + (cy - r * 0.1) + '" r="' + r * 0.06 + '" fill="' + b.line + '"/>';
      f += '<ellipse cx="' + (cx - r * 0.34) + '" cy="' + (cy + r * 0.12) + '" rx="' + r * 0.11 + '" ry="' + r * 0.06 + '" fill="' + blush + '"/>';
      f += '<ellipse cx="' + (cx + r * 0.34) + '" cy="' + (cy + r * 0.12) + '" rx="' + r * 0.11 + '" ry="' + r * 0.06 + '" fill="' + blush + '"/>';
      f += '<path d="M' + (cx - r * 0.18) + ' ' + (cy + r * 0.18) + ' q ' + (r * 0.18) + ' ' + (r * 0.16) + ' ' + (r * 0.36) + ' 0" fill="none" stroke="' + b.line + '" stroke-width="2.4" stroke-linecap="round"/>';
    } else {
      f += '<circle cx="' + (cx - r * 0.4) + '" cy="' + (cy - r * 0.12) + '" r="' + r * 0.075 + '" fill="' + b.line + '"/>';
      f += '<circle cx="' + (cx + r * 0.4) + '" cy="' + (cy - r * 0.12) + '" r="' + r * 0.075 + '" fill="' + b.line + '"/>';
      f += '<circle cx="' + (cx - r * 0.22) + '" cy="' + (cy - r * 0.16) + '" r="' + r * 0.028 + '" fill="' + b.inner + '"/>';
      f += '<circle cx="' + (cx + r * 0.22) + '" cy="' + (cy - r * 0.16) + '" r="' + r * 0.028 + '" fill="' + b.inner + '"/>';
      f += '<path d="M' + (cx - r * 0.2) + ' ' + (cy + r * 0.14) + ' q ' + (r * 0.2) + ' ' + (r * 0.2) + ' ' + (r * 0.4) + ' 0" fill="none" stroke="' + b.line + '" stroke-width="2.4" stroke-linecap="round"/>';
    }
    f += '<ellipse cx="' + cx + '" cy="' + (cy + r * 0.2) + '" rx="' + r * 0.3 + '" ry="' + r * 0.21 + '" fill="' + b.muzzle + '" stroke="' + b.line + '" stroke-width="1.1"/>';
    f += '<ellipse cx="' + cx + '" cy="' + (cy + r * 0.1) + '" rx="' + r * 0.11 + '" ry="' + r * 0.08 + '" fill="' + b.line + '"/>';
    return f;
  }

  function bearBody(b, cx, cy, rx, ry, pose) {
    var parts = [];
    var f = pose === 'hug' || pose === 'wave' ? 0 : 1;
    // body
    parts.push('<ellipse cx="' + cx + '" cy="' + cy + '" rx="' + rx + '" ry="' + ry + '" fill="' + b.body + '" stroke="' + b.line + '" stroke-width="1.6"/>');
    // belly
    parts.push('<ellipse cx="' + cx + '" cy="' + (cy + ry * 0.18) + '" rx="' + rx * 0.6 + '" ry="' + ry * 0.62 + '" fill="' + b.muzzle + '" opacity="0.85"/>');
    if (pose === 'wave') {
      // raised arm
      parts.push('<path d="M' + (cx + rx * 0.7) + ' ' + (cy - ry * 0.3) + ' Q ' + (cx + rx * 1.6) + ' ' + (cy - ry * 1.9) + ' ' + (cx + rx * 1.35) + ' ' + (cy - ry * 2.5) + '" fill="none" stroke="' + b.line + '" stroke-width="' + (ry * 0.5) + '" stroke-linecap="round"/>');
      parts.push('<circle cx="' + (cx + rx * 1.38) + '" cy="' + (cy - ry * 2.55) + '" r="' + ry * 0.34 + '" fill="' + b.inner + '"/>');
      // other arm at side
      parts.push('<path d="M' + (cx - rx * 0.75) + ' ' + (cy - ry * 0.15) + ' Q ' + (cx - rx * 1.35) + ' ' + (cy + ry * 0.4) + ' ' + (cx - rx * 0.7) + ' ' + (cy + ry * 0.8) + '" fill="none" stroke="' + b.line + '" stroke-width="' + (ry * 0.42) + '" stroke-linecap="round"/>');
      parts.push('<circle cx="' + (cx - rx * 0.66) + '" cy="' + (cy + ry * 0.85) + '" r="' + ry * 0.3 + '" fill="' + b.inner + '"/>');
    } else if (pose === 'hug') {
      // arms open wide
      parts.push('<path d="M' + (cx - rx * 0.62) + ' ' + (cy - ry * 0.2) + ' Q ' + (cx - rx * 1.7) + ' ' + (cy + ry * 0.1) + ' ' + (cx - rx * 1.4) + ' ' + (cy + ry * 0.95) + '" fill="none" stroke="' + b.line + '" stroke-width="' + (ry * 0.42) + '" stroke-linecap="round"/>');
      parts.push('<circle cx="' + (cx - rx * 1.32) + '" cy="' + (cy + ry * 1.02) + '" r="' + ry * 0.3 + '" fill="' + b.inner + '"/>');
      parts.push('<path d="M' + (cx + rx * 0.62) + ' ' + (cy - ry * 0.2) + ' Q ' + (cx + rx * 1.7) + ' ' + (cy + ry * 0.1) + ' ' + (cx + rx * 1.4) + ' ' + (cy + ry * 0.95) + '" fill="none" stroke="' + b.line + '" stroke-width="' + (ry * 0.42) + '" stroke-linecap="round"/>');
      parts.push('<circle cx="' + (cx + rx * 1.32) + '" cy="' + (cy + ry * 1.02) + '" r="' + ry * 0.3 + '" fill="' + b.inner + '"/>');
    } else {
      // arms at sides
      parts.push('<path d="M' + (cx - rx * 0.62) + ' ' + (cy - ry * 0.1) + ' Q ' + (cx - rx * 1.3) + ' ' + (cy + ry * 0.5) + ' ' + (cx - rx * 0.72) + ' ' + (cy + ry * 0.85) + '" fill="none" stroke="' + b.line + '" stroke-width="' + (ry * 0.42) + '" stroke-linecap="round"/>');
      parts.push('<circle cx="' + (cx - rx * 0.68) + '" cy="' + (cy + ry * 0.9) + '" r="' + ry * 0.3 + '" fill="' + b.inner + '"/>');
      parts.push('<path d="M' + (cx + rx * 0.62) + ' ' + (cy - ry * 0.1) + ' Q ' + (cx + rx * 1.3) + ' ' + (cy + ry * 0.5) + ' ' + (cx + rx * 0.72) + ' ' + (cy + ry * 0.85) + '" fill="none" stroke="' + b.line + '" stroke-width="' + (ry * 0.42) + '" stroke-linecap="round"/>');
      parts.push('<circle cx="' + (cx + rx * 0.68) + '" cy="' + (cy + ry * 0.9) + '" r="' + ry * 0.3 + '" fill="' + b.inner + '"/>');
    }
    return parts.join('');
  }

  /* Full standing bear with pose */
  HB.bearSVG = function (colorName, pose, opts) {
    opts = opts || {};
    var b = PALETTES[colorName] || PALETTES.mocha;
    var parts = [];
    parts.push(bearBody(b, 50, 76, 27, 22, pose || 'sit'));
    parts.push(bearHead(b, 50, 40, 28, 1));
    parts.push(bearFace(b, 50, 40, 28, opts.mood || 'happy'));
    var extra = opts.accessory || '';
    if (opts.heart) {
      parts.push('<g transform="translate(50,86)"><g transform="translate(-2,-4)"><path d="M0 4 C-6 -4 -16 0 -16 8 a7 7 0 0 0 14 2 a7 7 0 0 0 14 -2 C12 0 6 -4 0 4z" fill="#F2799F" stroke="#D35C86" stroke-width="1.5"/></g></g>');
    }
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + parts.join('') + (extra || '') + '</svg>';
  };

  /* Simple head-only avatar (chat + logo) */
  HB.bearAvatarSVG = function (colorName, mood) {
    var b = PALETTES[colorName] || PALETTES.mocha;
    var parts = [];
    parts.push('<ellipse cx="30" cy="20" rx="13" ry="13" fill="' + b.body + '" stroke="' + b.line + '" stroke-width="1.4"/>');
    parts.push('<ellipse cx="70" cy="20" rx="13" ry="13" fill="' + b.body + '" stroke="' + b.line + '" stroke-width="1.4"/>');
    parts.push('<ellipse cx="30" cy="20" rx="6.5" ry="6.5" fill="' + b.inner + '"/>');
    parts.push('<ellipse cx="70" cy="20" rx="6.5" ry="6.5" fill="' + b.inner + '"/>');
    parts.push('<circle cx="50" cy="48" r="34" fill="' + b.body + '" stroke="' + b.line + '" stroke-width="1.8"/>');
    parts.push(bearFace(b, 50, 48, 34, mood || 'happy'));
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + parts.join('') + '</svg>';
  };

  HB.bearMiniSVG = function () {
    return '<svg viewBox="0 0 48 48" aria-hidden="true"><g transform="scale(0.44)"><ellipse cx="30" cy="20" rx="13" ry="13" fill="#FFF6EE" stroke="#EBD5C0" stroke-width="1.4"/><ellipse cx="70" cy="20" rx="13" ry="13" fill="#FFF6EE" stroke="#EBD5C0" stroke-width="1.4"/><ellipse cx="30" cy="20" rx="6.5" ry="6.5" fill="#FFD9E0"/><ellipse cx="70" cy="20" rx="6.5" ry="6.5" fill="#FFD9E0"/><circle cx="50" cy="48" r="34" fill="#FFF6EE" stroke="#EBD5C0" stroke-width="1.8"/><circle cx="40" cy="44" r="2.6" fill="#8B6246"/><circle cx="60" cy="44" r="2.6" fill="#8B6246"/><ellipse cx="50" cy="56" rx="10" ry="7" fill="#FFFFFF"/><ellipse cx="50" cy="53" rx="4" ry="2.8" fill="#8B6246"/><path d="M46 62 q4 5 8 0" fill="none" stroke="#8B6246" stroke-width="2.4" stroke-linecap="round"/><ellipse cx="32" cy="54" rx="4" ry="2.4" fill="rgba(240,130,140,0.35)"/><ellipse cx="68" cy="54" rx="4" ry="2.4" fill="rgba(240,130,140,0.35)"/></g></svg>';
  };

  /* Pair of bears (milk + mocha) sitting together — landing hero */
  HB.bearPairSVG = function (opts) {
    opts = opts || {};
    var milk = PALETTES.milk, mocha = PALETTES.mocha;
    var parts = [];
    // left bear (milk), pose wave, tilts slightly right
    parts.push('<g transform="translate(0,0)">' +
      bearBody(milk, 32, 76, 24, 20, 'wave') +
      bearHead(milk, 32, 42, 25, 1) +
      bearFace(milk, 32, 42, 25, 'love') + '</g>');
    // right bear (mocha), hugging heart
    parts.push('<g transform="translate(6,2)">' +
      bearBody(mocha, 72, 76, 24, 20, 'hug') +
      bearHead(mocha, 72, 42, 25, -1) +
      bearFace(mocha, 72, 42, 25, 'blush') + '</g>');
    // heart between them
    parts.push('<g transform="translate(48,70) scale(1.15)"><path d="M0 4 C-7 -5 -17 0 -17 8 a7.5 7.5 0 0 0 15 2 a7.5 7.5 0 0 0 15 -2 C15 0 7 -5 0 4z" fill="#F2799F" stroke="#D35C86" stroke-width="1.6"><animate attributeName="opacity" values="1;0.7;1" dur="2s" repeatCount="indefinite"/></path><text x="0" y="9" text-anchor="middle" font-size="9" fill="#fff" font-weight="bold" font-family="Georgia">♥</text></g>');
    // sparkles
    parts.push('<text x="16" y="14" font-size="10" fill="#C89F7B" opacity="0.7">✦</text>');
    parts.push('<text x="86" y="12" font-size="8" fill="#E8A0A8" opacity="0.8">✦</text>');
    parts.push('<text x="6" y="66" font-size="7" fill="#E8A0A8" opacity="0.6">♥</text>');
    parts.push('<text x="92" y="62" font-size="8" fill="#C89F7B" opacity="0.6">♡</text>');
    return '<svg viewBox="0 0 100 96" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + parts.join('') + '</svg>';
  };

  /* Small pair for dashboard hero */
  HB.bearCoupleSVG = function () {
    var milk = PALETTES.milk, mocha = PALETTES.mocha;
    var parts = [];
    parts.push('<g transform="translate(0,4)">' + bearBody(milk, 30, 80, 26, 22, 'sit') + bearHead(milk, 30, 44, 27, 1) + bearFace(milk, 30, 44, 27, 'love') + '</g>');
    parts.push('<g transform="translate(4,4)">' + bearBody(mocha, 72, 80, 26, 22, 'sit') + bearHead(mocha, 72, 44, 27, -1) + bearFace(mocha, 72, 44, 27, 'happy') + '</g>');
    parts.push('<g transform="translate(51,72)"><path d="M0 4 C-7 -5 -17 0 -17 8 a7.5 7.5 0 0 0 15 2 a7.5 7.5 0 0 0 15 -2 C15 0 7 -5 0 4z" fill="#F2799F" stroke="#D35C86" stroke-width="1.6"/></g>');
    return '<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' + parts.join('') + '</svg>';
  };
})();
