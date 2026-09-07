/* ============================================================
   DP — personal + couple display pictures ♡
   ------------------------------------------------------------
   * couple DP (sidebar, near "Our Little World") = first letters
     of both names (mine first: Aman+Stuti → AS, Stuti+Aman → SA)
     until a shared photo is added; tapping opens the gallery and
     the picked photo syncs to BOTH phones.
   * personal DP (chat bubbles) = my first letter on my bubbles,
     partner's on theirs; tapping MY bubbles' DP opens the gallery
     for MY photo only (it shows on all my bubbles everywhere).
   * tapping any DP that already has a photo opens a simple
     full-screen preview with a ✕ close — no file names shown,
     same clean preview for photos shared inside the chat.
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

  function myPhoto() { return (HB.state && HB.state.profile && HB.state.profile.myAvatar) || ''; }
  function partnerPhoto() { return (HB.state && HB.state.profile && HB.state.profile.partnerAvatar) || ''; }
  function couplePhoto() { return (HB.state && HB.state.profile && HB.state.profile.coupleDp) || ''; }

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
            var scale = Math.min(1, max / Math.max(img.width || 1, img.height || 1));
            var w = Math.max(1, Math.round((img.width || 1) * scale));
            var h = Math.max(1, Math.round((img.height || 1) * scale));
            var c = document.createElement('canvas');
            c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
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

  /* Simple full-screen preview — the photo, a ✕, and (optionally) a
     "change photo" action when the caller passes an onChange callback. */
  function preview(url, onChange) {
    if (!url) return;
    var ov = document.createElement('div');
    ov.className = 'dp-preview';
    var changeBtn = onChange
      ? '<button type="button" class="dp-preview-change" aria-label="Change photo">Change photo ♡</button>'
      : '';
    ov.innerHTML = '<button type="button" class="dp-preview-close" aria-label="Close">✕</button>' +
      changeBtn +
      '<img src="' + HB.esc(url) + '" alt=""/>';
    function closeIt() {
      document.removeEventListener('keydown', onKey);
      if (ov.parentNode) ov.parentNode.removeChild(ov);
    }
    function doChange() {
      closeIt();
      if (typeof onChange === 'function') { try { onChange(); } catch (e) {} }
    }
    function onKey(e) {
      if (e.key === 'Escape') closeIt();
      else if (e.key === 'Enter' && onChange) doChange();
    }
    ov.addEventListener('click', function (e) {
      if (e.target === ov || (e.target.classList && e.target.classList.contains('dp-preview-close'))) closeIt();
      else if (e.target && e.target.classList && e.target.classList.contains('dp-preview-change')) doChange();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(ov);
  }

  /* MY personal photo (chat bubbles): applies instantly, then syncs to
     my profile row so the other phone shows it on my bubbles too.
     Tries the dedicated RPC first; if that's not in the DB schema yet it
     falls back to the bare column, and if that's missing too it broadcasts
     the photo straight to the partner over our realtime channel. */
  function setMy(dataUrl) {
    var pf = HB.state && HB.state.profile;
    if (pf) { pf.myAvatar = dataUrl || ''; if (HB.save) HB.save(); }
    if (window.dispatchEvent) {
      try { window.dispatchEvent(new window.CustomEvent('hb:relchange')); } catch (e) {}
    }
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

  /* Couple photo (sidebar): applies instantly, then syncs to the shared
     relationship row so both phones show the same picture. Same fallback
     chain as setMy — RPC, then bare column, then realtime broadcast. */
  function setCouple(dataUrl) {
    var pf = HB.state && HB.state.profile;
    if (pf) { pf.coupleDp = dataUrl || ''; if (HB.save) HB.save(); }
    if (HB.updateNav) HB.updateNav();
    if (window.dispatchEvent) {
      try { window.dispatchEvent(new window.CustomEvent('hb:relchange')); } catch (e) {}
    }
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
      if (HB.save) HB.save();
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
    myPhoto: myPhoto,
    partnerPhoto: partnerPhoto,
    couplePhoto: couplePhoto,
    pick: pick,
    toDataUrl: toDataUrl,
    preview: preview,
    setMy: setMy,
    setCouple: setCouple,
    attachPresence: onPresenceAvailable,
    broadcast: blast
  };
})();