/* ============================================================
   DAILY — daily relationship question
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  HB.route('/daily', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var q = HB.dailyQuestionOfToday();
    var answeredToday = false;
    var todayKey = new Date().toDateString();

    HB.state.dailyAnswers.forEach(function (a) {
      if (new Date(a.time).toDateString() === todayKey) answeredToday = true;
    });

    main.innerHTML =
      '<div class="page"><div class="daily-wrap">' +
      '<div class="dash-hello text-center"><h1>Daily <span class="hand" style="font-size:1.15em">question</span> ☀️</h1>' +
      '<p>One sweet little question for you two, every single day.</p></div>' +

      '<div class="daily-card">' +
        '<div class="big-q">🫶</div>' +
        '<h2>' + HB.esc(q) + '</h2>' +
        (answeredToday
          ? '<div class="empty-state" style="padding:20px"><div class="es-emoji">' + HB.chars.stageHtml({ which: 'dudu', action: 'happy', size: 'mini', alt: 'Dudu is happy you answered' }) + '</div><h4>You answered today\'s question</h4><p>Come back tomorrow for a new one — or scroll below to revisit your little answers.</p></div>'
          : '<div class="field mb-16"><textarea class="textarea" id="daily-answer" placeholder="Your answer, from your heart..."></textarea></div>' +
            '<button class="btn btn-primary btn-lg" id="daily-save">Save my answer ♡</button>') +
      '</div>' +

      '<div class="section-title"><h3>Your past answers</h3><span class="hand">tiny time capsules</span></div>' +
      '<div class="daily-answers" id="daily-answers"></div>' +
      '</div></div>';

    if (!answeredToday) {
      main.querySelector('#daily-save').addEventListener('click', function () {
        var ans = main.querySelector('#daily-answer').value.trim();
        if (!ans) { HB.toast('Write something first, even a little ♡', '✍️'); return; }
        HB.state.dailyAnswers.unshift({ id: HB.uid(), q: q, answer: ans, time: Date.now() });
        HB.save();
        HB.toast('Answer saved — this one\'s for your future selves ♡', '🫶');
        HB.navigate('/daily');
      });
    }

    var box = main.querySelector('#daily-answers');
    var answers = HB.state.dailyAnswers;
    if (!answers.length) {
      box.innerHTML = '<div class="empty-state"><div class="es-emoji">' + HB.chars.stageHtml({ which: 'bubu', action: 'cute', size: 'empty', alt: 'Bubu wants to see your answers' }) + '</div><h4>No answers yet</h4><p>Answer today\'s question above and start your little collection.</p></div>';
    } else {
      box.innerHTML = answers.slice(0, 20).map(function (a, i) {
        return '<div class="answer-card" style="animation-delay:' + (i * 0.05) + 's">' +
          '<div class="a-date">' + new Date(a.time).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + '</div>' +
          '<div><div class="a-q">' + HB.esc(a.q) + '</div><div class="a-t">' + HB.esc(a.answer) + '</div></div>' +
          '<span style="margin-left:auto;cursor:pointer" data-del title="Remove">🗑️</span>' +
          '</div>';
      }).join('');
      box.querySelectorAll('[data-del]').forEach(function (b) {
        b.addEventListener('click', function () {
          var card = b.closest('.answer-card');
          var idx = Array.prototype.indexOf.call(card.parentElement.children, card);
          HB.state.dailyAnswers.splice(idx, 1);
          HB.save();
          card.remove();
          HB.toast('Removed', '🗑️');
        });
      });
    }
  });
})();
