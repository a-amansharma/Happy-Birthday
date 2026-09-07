/* ============================================================
   DP — personal + couple display pictures ♡
   ------------------------------------------------------------
   * duo (sidebar, next to "Our Little World") = two overlapping
     circles — MY first-name initial top-left, my partner's
     bottom-right (Aman → A, Stuti → S) with a ♥ between them —
     until a synced chat photo replaces either circle. Each phone
     sees its OWN top circle (reversed order per device).
   * personal DP (chat bubbles) = my first letter on my bubbles,
     partner's on theirs; tapping EITHER bubble's DP opens the
     gallery for that person's photo (mine syncs to my row, my
     partner's syncs to their row — both phones always agree).
   * couple DP (Partner page) = shared photo for both phones.
   * tapping any DP that already has a photo opens a simple
     full-screen preview with a ✕ close — and a "change photo"
     action whenever that photo is editable by this phone.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  /* First-and-first initials for the shared couple chip: [me][partner]. */
  function initials() {
    var p = (HB.state && HB.state.profile) || {};
    var m = String(p.name || '').trim().charAt(0) || '';
    var t = String(p.partner || '').trim().charAt(0) || '';
    return ((m + t).toUpperCase()) || '♥';
  }

  /* A single person's initial — mine vs my partner's. Used by the
     top-left "two little circles" avatar (Aman → A, Stuti → S). */
  function firstOf(name) { return (String(name || '').trim().charAt(0) || '♥').toUpperCase(); }
  function myLetter() { return firstOf(HB.state && HB.state.profile && HB.state.profile.name); }
  function partnerLetter() { return firstOf(HB.state && HB.state.profile && HB.state.profile.partner); }

  function myPhoto() { return (HB.state && HB.state.profile && HB.state.profile.myAvatar) || ''; }
  function partnerPhoto() { return (HB.state && HB.state.profile && HB.state.profile.partnerAvatar) || ''; }
  function couplePhoto() { return (HB.state && HB.state.profile && HB.state.profile.coupleDp) || ''; }

  /* ---- top-left homepage duo: two overlapping circles (mine on top,
     my partner below), a heart between them, subtle float. Defaults to
     each person's first-name initial; a synced chat photo replaces it. ----
     data-duo → 'me' | 'them' so the sidebar can wire the taps. */
  function duoRing(who, cls, photo, letter, title) {
    var inner = photo
      ? '<img src="' + HB.esc(photo) + '" alt=""/>'
      : '<span class="duo-let">' + HB.esc(letter) + '</span>';
    return '<button type="button" class="duo-ring ' + cls + '" data-duo="' + who + '" title="' + HB.esc(title) + '" aria-label="' + HB.esc(title) + '">' + inner + '</button>';
  }
  function duoHtml() {
    var meN = (HB.state && HB.state.profile && HB.state.profile.name) || '';
    var ptN = (HB.state && HB.state.profile && HB.state.profile.partner) || '';
    var meT = myPhoto() ? 'View, change or delete your photo' : 'Set your photo';
    var ptT = partnerPhoto() ? ('View, change or delete ' + ptN + '\'s photo') : ('Set ' + (ptN || 'your person') + '\'s photo');
    return '<span class="duo-cluster">' +
      duoRing('me', 'duo-top', myPhoto(), firstOf(meN), meT) +
      duoRing('them', 'duo-bot', partnerPhoto(), firstOf(ptN), ptT) +
    '</span>';
  }

  /* Downscale a picked image to a small, chat-friendly square photo. */
  function toDataUrl(file, max) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onerror = function () { resolve({ error: 'READ_FAILED' }); };
      reader.onload = function () {
        var orig = reader.result;
        var img = new Image();
        img.onload = function () {
          try {
            /* Center-crop the photo to a perfect SQUARE so it always fills
               the circle completely — never stretched into an oval. */
            var size = Math.min(img.width || 1, img.height || 1);
            var out = Math.max(1, Math.min(size, max));
            var sx = Math.round(((img.width || 1) - size) / 2);
            var sy = Math.round(((img.height || 1) - size) / 2);
            var c = document.createElement('canvas');
            c.width = out; c.height = out;
            c.getContext('2d').drawImage(img, sx, sy, size, size, 0, 0, out, out);
            resolve({ dataUrl: c.toDataURL('image/jpeg', 0.85) });
          } catch (err) {
            resolve({ dataUrl: orig });
          }
        };
        img.onerror = function () { resolve({ dataUrl: orig }); };
        img.src = orig;
      };
      reader.readAsDataURL(file);
    });
  }

  /* Downscale an already-generated photo data URL into a tiny square
     thumbnail. Used for the "What's new" feed so we don't store and
     repaint the full-size picture on every row. Falls back to the
     original URL if the canvas path fails. */
  function thumb(url, max) {
    return new Promise(function (resolve) {
      if (!url || url.indexOf('data:') !== 0) return resolve(url);
      var img = new Image();
      img.onload = function () {
        try {
          var size = Math.min(img.width || 1, img.height || 1);
          var out = Math.max(1, Math.min(size, max));
          var c = document.createElement('canvas');
          c.width = out; c.height = out;
          c.getContext('2d').drawImage(
            img,
            Math.round(((img.width || 1) - size) / 2),
            Math.round(((img.height || 1) - size) / 2),
            size, size, 0, 0, out, out
          );
          resolve(c.toDataURL('image/jpeg', 0.78));
        } catch (err) { resolve(url); }
      };
      img.onerror = function () { resolve(url); };
      img.src = url;
    });
  }

  /* Open the phone's gallery; resolve with a compressed data URL. */
  function pick() {
    return new Promise(function (resolve) {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.addEventListener('change', function () {
        var f = input.files && input.files[0];
        if (!f) { resolve({ error: 'NO_FILE' }); return; }
        if (f.size > 8 * 1024 * 1024) { resolve({ error: 'TOO_LARGE' }); return; }
        toDataUrl(f, 300).then(resolve);
      });
      document.body.appendChild(input);
      input.click();
      setTimeout(function () { if (input.parentNode) input.parentNode.removeChild(input); }, 120000);
    });
  }

  /* Full-screen preview — the photo (big, pinch/zoom in, taps to zoom),
     a ✕ close, and when callbacks are given a "Change photo" and a
     "Delete photo" action. Deleting clears the photo so the person's
     first-name initial shows again. When an origin element is passed
     (the clicked circle/chip), the picture grows from that spot. */
  function preview(url, onChange, onDelete, originEl) {
    if (!url) return;
    var ov = document.createElement('div');
    ov.className = 'dp-preview';
    var changeBtn = onChange
      ? '<button type="button" class="dp-preview-action dp-preview-change" aria-label="Change photo">Change photo ♡</button>'
      : '';
    var delBtn = onDelete
      ? '<button type="button" class="dp-preview-action dp-preview-del" aria-label="Delete photo">Delete photo</button>'
      : '';
    ov.innerHTML = '<button type="button" class="dp-preview-close" aria-label="Close">✕</button>' +
      changeBtn + delBtn +
      '<div class="dp-preview-stage"><img src="' + HB.esc(url) + '" alt=""/></div>';
    var img = ov.querySelector('img');
    var stage = ov.querySelector('.dp-preview-stage');
    var zoom = 1;
    function applyZoom() { if (img) img.style.transform = 'scale(' + zoom + ')'; }
    function zoomDelta(d) {
      zoom = Math.min(4, Math.max(1, zoom + d));
      applyZoom();
    }
    img.addEventListener('click', function () {
      zoom = zoom === 1 ? 2 : 1; applyZoom();
    });
    ov.addEventListener('wheel', function (e) {
      if (e.ctrlKey) { e.preventDefault(); zoomDelta(e.deltaY < 0 ? 0.25 : -0.25); }
    }, { passive: false });
    img.addEventListener('touchstart', function (e) {
      if (e.touches.length === 2) { ov._pinchDist = dist(e.touches[0], e.touches[1]); }
    }, { passive: true });
    function dist(a, b) { return Math.abs(a.clientX - b.clientX) + Math.abs(a.clientY - b.clientY); }
    ov.addEventListener('touchmove', function (e) {
      if (e.touches.length === 2 && ov._pinchDist) {
        var d = dist(e.touches[0], e.touches[1]);
        zoomDelta((d - ov._pinchDist) * 0.01);
        ov._pinchDist = d;
      }
    }, { passive: true });
    img.addEventListener('touchend', function (e) {
      if (e.touches.length < 2) ov._pinchDist = null;
    }, { passive: true });
    function closeIt() {
      document.removeEventListener('keydown', onKey);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
    }
    function doChange() {
      closeIt();
      if (typeof onChange === 'function') { try { onChange(); } catch (e) {} }
    }
    function doDelete() {
      closeIt();
      if (typeof onDelete === 'function') { try { onDelete(); } catch (e) {} }
    }
    function onKey(e) {
      if (e.key === 'Escape') closeIt();
      else if (e.key === 'Enter') { if (onChange) doChange(); else closeIt(); }
      else if (e.key === 'Delete' || e.key === 'Backspace') { if (onDelete) doDelete(); }
    }
    ov.addEventListener('click', function (e) {
      if (e.target === ov || (e.target.classList && e.target.classList.contains('dp-preview-close'))) closeIt();
      else if (e.target && e.target.classList && e.target.classList.contains('dp-preview-change')) doChange();
      else if (e.target && e.target.classList && e.target.classList.contains('dp-preview-del')) doDelete();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);

    /* Entrance: the picture grows up from wherever it was tapped. The
       stage fills the viewport, so its border-box top-left is (0,0) and
       transform-origin in viewport px = the tapped spot. We start at a
       tiny scale (≈ the source circle) and animate to full size. */
    if (originEl && originEl.getBoundingClientRect) {
      var r = originEl.getBoundingClientRect();
      var cx = r.left + r.width / 2;
      var cy = r.top + r.height / 2;
      var startPx = Math.max(24, Math.min(r.width || 40, r.height || 40));
      var probe = new Image();
      probe.onload = function () {
        var vw = window.innerWidth * 0.96, vh = window.innerHeight * 0.78;
        var s = Math.min(vw / probe.width, vh / probe.height, 1);
        var fw = Math.max(1, Math.round(probe.width * s));
        var scale0 = startPx / fw;
        stage.style.transformOrigin = cx + 'px ' + cy + 'px';
        stage.style.transform = 'scale(' + scale0.toFixed(4) + ')';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            stage.style.transition = 'transform 0.5s cubic-bezier(.2,.7,.3,1)';
            stage.style.transform = 'scale(1)';
          });
        });
      };
      probe.onerror = function () { stage.style.transform = 'scale(1)'; };
      probe.src = url;
    }
  }

  /* Best-effort journal entry for DP changes (feeds the Partner page's
     "What's new" list). Fire-and-forget: never blocks the photo sync.
     Photo entries are downscaled to a tiny thumbnail first so the feed
     stays fast and light even after many photo changes. */
  function journal(entry) {
    if (!HB.journal || !HB.journal.log) return;
    if (!HB.rel || !HB.rel.data || HB.rel.data.status !== 'connected') return;
    if (entry.img) {
      thumb(entry.img, 88).then(function (tiny) {
        HB.journal.log(entry.kind, entry.msg, tiny || '').catch(function () {});
      });
      return;
    }
    HB.journal.log(entry.kind, entry.msg, '').catch(function () {});
  }

  /* MY personal photo (chat bubbles): applies instantly, then syncs to
     my profile row so the other phone shows it on my bubbles too.
     Tries the dedicated RPC first; if that's not in the DB schema yet it
     falls back to the bare column, and if that's missing too it broadcasts
     the photo straight to the partner over our realtime channel. */
  function setMy(dataUrl) {
    var pf = HB.state && HB.state.profile;
    var had = !!(pf && pf.myAvatar);
    if (pf) { pf.myAvatar = dataUrl || ''; if (HB.save) HB.save(); }
    if (HB.updateNav) HB.updateNav();
    if (window.dispatchEvent) {
      try { window.dispatchEvent(new window.CustomEvent('hb:relchange')); } catch (e) {}
    }
    journal(dataUrl
      ? { kind: 'photo', msg: had ? 'came back with a fresh profile photo ♡' : 'put up their very first profile photo ♡', img: dataUrl }
      : { kind: 'photo_off', msg: 'took down their profile photo — the initial is back ♡' });
    if (!HB.db || !HB.db.configured() || !HB.auth || !HB.auth.user()) return Promise.resolve({ error: null });
    var uid = HB.auth.user().id;
    var mark = function () {
      if (HB.rel && HB.rel.data && HB.rel.data.me) HB.rel.data.me.avatar_url = dataUrl || '';
    };
    return HB.db.client().rpc('update_my_avatar', { p_url: dataUrl || '' })
      .then(function (res) {
        if (!res.error) { mark(); return res; }
        if (!isMissingFunc(res.error)) return res;
        return HB.db.client().from('profiles')
          .update({ avatar_url: dataUrl || '' })
          .eq('id', uid)
          .then(function (r2) {
            if (r2.error) { blast({ kind: 'my', url: dataUrl || '' }); return { error: null }; }
            mark();
            return r2;
          });
      })
      .catch(function () {
        blast({ kind: 'my', url: dataUrl || '' });
        return { error: null };
      });
  }

  /* MY PARTNER'S personal photo (chat bubbles on my phone / the duo's
     lower circle): applies instantly, then syncs to their profile row so
     BOTH phones show it in their own perspective. Their phone sees it as
     their own photo; mine sees it as the partner's photo. Tries the
     update_partner_avatar RPC first; if that's not in the DB schema yet it
     broadcasts the photo straight to the partner over our realtime channel. */
  function setPartner(dataUrl) {
    var pf = HB.state && HB.state.profile;
    var had = !!(pf && pf.partnerAvatar);
    if (pf) { pf.partnerAvatar = dataUrl || ''; if (HB.save) HB.save(); }
    if (HB.updateNav) HB.updateNav();
    if (window.dispatchEvent) {
      try { window.dispatchEvent(new window.CustomEvent('hb:relchange')); } catch (e) {}
    }
    journal(dataUrl
      ? { kind: 'photo', msg: had ? 'gave you a fresh profile photo ♡' : 'set a profile photo for you ♡', img: dataUrl }
      : { kind: 'photo_off', msg: 'cleared your profile photo — a letter will do for now ♡' });
    if (!HB.db || !HB.db.configured() || !HB.auth || !HB.auth.user() || !HB.rel || !HB.rel.data) {
      return Promise.resolve({ error: null });
    }
    var mark = function () {
      if (HB.rel.data.partner) HB.rel.data.partner.avatar_url = dataUrl || '';
    };
    return HB.db.client().rpc('update_partner_avatar', { p_url: dataUrl || '' })
      .then(function (res) {
        if (!res.error) { mark(); return res; }
        if (!isMissingFunc(res.error)) return res;
        return HB.db.client().from('profiles')
          .update({ avatar_url: dataUrl || '' })
          .eq('id', HB.rel.data.partner ? HB.rel.data.partner.id : '')
          .then(function (r2) {
            if (r2.error) { blast({ kind: 'partner', url: dataUrl || '' }); return { error: null }; }
            mark();
            return r2;
          });
      })
      .catch(function () {
        blast({ kind: 'partner', url: dataUrl || '' });
        return { error: null };
      });
  }

  /* Couple photo (sidebar): applies instantly, then syncs to the shared
     relationship row so both phones show the same picture. Same fallback
     chain as setMy — RPC, then bare column, then realtime broadcast. */
  function setCouple(dataUrl) {
    var pf = HB.state && HB.state.profile;
    var had = !!(pf && pf.coupleDp);
    if (pf) { pf.coupleDp = dataUrl || ''; if (HB.save) HB.save(); }
    if (HB.updateNav) HB.updateNav();
    if (window.dispatchEvent) {
      try { window.dispatchEvent(new window.CustomEvent('hb:relchange')); } catch (e) {}
    }
    journal(dataUrl
      ? { kind: 'photo', msg: had ? 'swapped the couple photo ♡' : 'put up a couple photo for you two ♡', img: dataUrl }
      : { kind: 'photo_off', msg: 'removed the couple photo — the letters are back ♡' });
    if (!HB.db || !HB.db.configured() || !HB.rel || !HB.rel.data || !HB.rel.data.relationship) {
      return Promise.resolve({ error: null });
    }
    var rid = HB.rel.data.relationship.id;
    var mark = function () {
      if (HB.rel.data.relationship) HB.rel.data.relationship.couple_dp_url = dataUrl || '';
    };
    return HB.db.client().rpc('update_couple_dp', { p_url: dataUrl || '' })
      .then(function (res) {
        if (!res.error) { mark(); return res; }
        if (!isMissingFunc(res.error)) return res;
        return HB.db.client().from('relationships')
          .update({ couple_dp_url: dataUrl || '' })
          .eq('id', rid)
          .then(function (r2) {
            if (r2.error) { blast({ kind: 'couple', url: dataUrl || '' }); return { error: null }; }
            mark();
            return r2;
          });
      })
      .catch(function () {
        blast({ kind: 'couple', url: dataUrl || '' });
        return { error: null };
      });
  }

  /* Delete MY personal photo → the initials show again. Same sync as setMy. */
  function clearMy() { return setMy(''); }
  /* Delete MY PARTNER's personal photo → their initial shows again. */
  function clearPartner() { return setPartner(''); }
  /* Delete the shared couple photo → the AS initials show again. */
  function clearCouple() { return setCouple(''); }

  /* ---- realtime side-channel (DP photos + shared theme) ----
     The DB currently has no avatar_url/couple_dp_url/theme columns on the
     live schema, so writes fail and photos would never reach phone 2.
     When that happens we send the photo over the same per-couple channel
     presence already uses — phone 2 adopts it instantly, no schema needed. */
  var presCh = null;
  var presMe = null;

  function blast(payload) {
    if (!presCh) return false;
    payload = payload || {};
    if (presMe) payload.from = presMe.id;
    try {
      presCh.send({ type: 'broadcast', event: 'hb:dp', payload: payload });
      return true;
    } catch (e) {
      return false;
    }
  }

  function isMissingFunc(err) {
    return /PGRST202|Could not find the function|does not exist/i.test(String((err && (err.message || err)) || ''));
  }

  /* Apply a broadcasted change locally on the receiving phone. */
  function adoptKind(p) {
    var pf = HB.state && HB.state.profile;
    if (!pf) return;
    if (p.kind === 'my') {
      pf.partnerAvatar = p.url || '';
      if (HB.rel && HB.rel.data && HB.rel.data.partner) HB.rel.data.partner.avatar_url = p.url || '';
      if (HB.save) HB.save();
      if (HB.updateNav) HB.updateNav();
      if (window.dispatchEvent) { try { window.dispatchEvent(new window.CustomEvent('hb:relchange')); } catch (e) {} }
    } else if (p.kind === 'partner') {
      /* My partner changed MY picture from their phone → it's my photo here. */
      pf.myAvatar = p.url || '';
      if (HB.rel && HB.rel.data && HB.rel.data.me) HB.rel.data.me.avatar_url = p.url || '';
      if (HB.save) HB.save();
      if (HB.updateNav) HB.updateNav();
      if (window.dispatchEvent) { try { window.dispatchEvent(new window.CustomEvent('hb:relchange')); } catch (e) {} }
    } else if (p.kind === 'couple') {
      pf.coupleDp = p.url || '';
      if (HB.save) HB.save();
      if (HB.updateNav) HB.updateNav();
      if (window.dispatchEvent) { try { window.dispatchEvent(new window.CustomEvent('hb:relchange')); } catch (e) {} }
    } else if (p.kind === 'theme') {
      pf.theme = p.url || 'milk';
      if (HB.save) HB.save();
      if (HB.rel && HB.rel.paintTheme) HB.rel.paintTheme(pf.theme);
      if (window.dispatchEvent) { try { window.dispatchEvent(new window.CustomEvent('hb:relchange')); } catch (e) {} }
    }
  }

  /* Called by HB.presence once the couple channel is up (before subscribe). */
  function onPresenceAvailable(ch, chMe) {
    presCh = ch;
    presMe = chMe;
    try {
      ch.on('broadcast', { event: 'hb:dp' }, function (msg) {
        var p = msg && msg.payload;
        if (!p || !p.kind || !p.from) return;
        if (presMe && p.from === presMe.id) return;
        adoptKind(p);
      });
    } catch (e) {}
  }

  HB.dp = {
    initials: initials,
    firstOf: firstOf,
    myLetter: myLetter,
    partnerLetter: partnerLetter,
    myPhoto: myPhoto,
    partnerPhoto: partnerPhoto,
    couplePhoto: couplePhoto,
    duo: duoHtml,
    pick: pick,
    toDataUrl: toDataUrl,
    preview: preview,
    setMy: setMy,
    setPartner: setPartner,
    setCouple: setCouple,
    clearMy: clearMy,
    clearPartner: clearPartner,
    clearCouple: clearCouple,
    attachPresence: onPresenceAvailable,
    broadcast: blast
  };
})();