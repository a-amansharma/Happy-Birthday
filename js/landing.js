/* ============================================================
   LANDING — welcome page
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  HB.route('/', function (main) {
    // If already onboarded, show the personalized dashboard instead
    if (HB.state.onboarded) {
      if (HB.renderHome) { HB.renderHome(main); return; }
      HB.navigate('/home');
      return;
    }

    main.innerHTML =
      '<section class="landing">' +
      '<div class="landing-badge"><span class="pulse-dot"></span> a cozy corner for two hearts</div>' +
      '<div class="landing-bears">' +
        HB.bearPairSVG({ mood: 'love' }) +
        '<span class="heart-float h1">💗</span><span class="heart-float h2">♡</span><span class="heart-float h3">✨</span>' +
      '</div>' +
      '<h1>A little corner made just for <span class="accent">you two</span> ♡</h1>' +
      '<p class="sub">Tell us a little about your story, and we\'ll make this space yours — a private little world for the two of you.</p>' +
      '<div class="landing-ctas">' +
        '<button class="btn btn-primary btn-lg" data-go="onboarding">Create Our Space ♡</button>' +
        '<button class="btn btn-ghost btn-lg" data-go="preview">Explore First</button>' +
      '</div>' +
      '<div class="landing-scroll"><span class="mouse"></span><span>scroll into your story</span></div>' +
      '</section>';

    main.querySelector('[data-go="onboarding"]').addEventListener('click', function () {
      HB.navigate('/onboarding');
    });

    main.querySelector('[data-go="preview"]').addEventListener('click', function () {
      HB.modal({
        title: 'A peek before you begin ♡',
        text: 'This little world is built for two — an AI companion who remembers your names, your vibe, and your story.',
        body: '<div class="chip-grid"><span class="chip">💬 Cute chatbot</span><span class="chip">💌 Love notes</span><span class="chip">📸 Memories</span><span class="chip">🎲 Couple quiz</span><span class="chip">🌙 Date ideas</span><span class="chip">⏳ Love timer</span></div>',
        actions: [
          { label: 'Sounds perfect — let\'s go ♡', kind: 'btn-primary', onClick: function () { HB.navigate('/onboarding'); } }
        ]
      });
    });
  });

  /* Personalized home (dashboard) is aliased from /home in dashboard.js */
})();
