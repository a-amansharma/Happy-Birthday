/* ============================================================
   CHAT INFO — every photo & link you've shared, in one place ♡
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  HB.route('/chatinfo', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var connected = HB.rel.data.status === 'connected';
    if (!connected) {
      main.innerHTML = '<div class="page"><div class="dash-hello"><h1>Photos & <span class="hand" style="font-size:1.15em">links</span> 📷</h1>' +
        '<p>Once you two are connected, everything you share shows up here.</p>' +
        '<button class="btn btn-primary" data-partner>Open Partner page 💞</button></div></div>';
      main.querySelector('[data-partner]').addEventListener('click', function () { HB.navigate('/partner'); });
      return;
    }

    function render() {
      var media = HB.chat.mediaFrom();
      var links = HB.chat.linksFrom();

      var mediaHtml;
      if (media.length) {
        mediaHtml = '<div class="media-grid">' + media.map(function (m, i) {
          return '<div class="media-cell" data-i="' + i + '"><img data-mid="' + HB.esc(m.id) + '" alt="photo" loading="lazy"/></div>';
        }).join('') + '</div>';
      } else {
        mediaHtml = '<div class="chatinfo-empty">No photos yet — send your first one from Our Chat. ♡</div>';
      }

      var linksHtml;
      if (links.length) {
        linksHtml = '<div class="links-list">' + links.map(function (l) {
          return '<a class="link-row" href="' + HB.esc(l.url) + '" target="_blank" rel="noopener nofollow">' +
            '<span class="link-fav">🔗</span>' +
            '<span><span class="link-domain">' + HB.esc(l.domain) + '</span>' +
            '<span class="link-url">' + HB.esc(l.url.length > 60 ? l.url.slice(0, 60) + '…' : l.url) + '</span></span>' +
            '<span class="link-go">→</span></a>';
        }).join('') + '</div>';
      } else {
        linksHtml = '<div class="chatinfo-empty">No links shared yet — drop one in the chat. ♡</div>';
      }

      main.innerHTML =
        '<div class="page">' +
        '<div class="dash-hello"><h1>Our <span class="hand" style="font-size:1.15em">photos & links</span> 📷</h1>' +
        '<p>Everything you two have shared, all in one cozy place.</p></div>' +
        '<div class="section-title"><h3>Photos</h3><span class="hand">' + media.length + ' little moments</span></div>' +
        mediaHtml +
        '<div class="section-title" style="margin-top:34px"><h3>Shared links</h3><span class="hand">' + links.length + ' shared things</span></div>' +
        linksHtml +
        '</div>';

      main.querySelectorAll('.media-cell').forEach(function (cell) {
        var m = media[parseInt(cell.dataset.i, 10)];
        HB.chat.signedUrl(m).then(function (url) {
          if (!cell.isConnected) return;
          var img = cell.querySelector('img');
          if (img && url) {
            img.src = url;
            cell.addEventListener('click', function () { openLightbox(url, m.message || ''); });
          }
        });
      });
    }

    function openLightbox(url, caption) {
      HB.modal({
        title: caption ? caption : 'A little memory ♡',
        body: '<img class="lightbox-img" src="' + HB.esc(url) + '" alt="photo"/>',
        actions: [{ label: 'Close', kind: 'btn-soft' }]
      });
    }

    if (HB.chat.messages.length) { render(); return; }
    HB.chat.load().then(render);
  });
})();
