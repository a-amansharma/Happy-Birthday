/* ============================================================
   QUIZ — playful couple quiz with animated score
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var REACTIONS = [
    'Ohh, interesting choice! 🎯', 'Okay okay, we see you 😏', 'Sensible! Very couple-coded.', 'Correct answer (probably). 😄',
    'This is the kind of answer that starts a conversation.', 'Strong pick. No notes.', 'That\'s very on-brand for you two. ♡', 'Love that for you. 💕'
  ];

  HB.route('/quiz', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var cat = null, qIndex = 0, score = 0, scores = [];

    function showCategories() {
      var cats = HB.QUIZ_CATEGORIES.map(function (c) {
        return '<button class="card card-hover quiz-cat" data-id="' + c.id + '">' +
          '<div class="row"><span class="qc-emoji">' + c.emoji + '</span><span class="qc-arrow">→</span></div>' +
          '<h4>' + c.name + '</h4><p>' + c.desc + '</p></button>';
      }).join('');
      main.innerHTML =
        '<div class="page">' +
        '<div class="dash-hello"><h1>Couple <span class="hand" style="font-size:1.15em">quiz</span> 🎲</h1>' +
        '<p>Not a serious assessment — just a playful excuse to talk, laugh, and learn something about each other.</p></div>' +
        '<div class="quiz-cats">' + cats + '</div>' +
        '</div>';
      main.querySelectorAll('.quiz-cat').forEach(function (btn) {
        btn.addEventListener('click', function () {
          cat = HB.QUIZ_CATEGORIES.filter(function (c) { return c.id === btn.dataset.id; })[0];
          qIndex = 0; score = 0; scores = [];
          startQuiz();
        });
      });
    }

    function startQuiz() {
      var total = cat.questions.length;
      renderQuestion();
    }

    function renderQuestion() {
      var q = cat.questions[qIndex];
      var total = cat.questions.length;
      var opts = q.opts.map(function (o, i) {
        return '<button class="quiz-opt" data-i="' + i + '"><span class="qo-letter">' + String.fromCharCode(65 + i) + '</span><span>' + HB.esc(o) + '</span></button>';
      }).join('');

      main.innerHTML =
        '<div class="page" style="max-width:680px">' +
        '<div class="dash-hello"><h2 class="hand" style="font-size:26px">' + cat.name + '</h2>' +
        '<p>Question ' + (qIndex + 1) + ' of ' + total + '</p></div>' +
        '<div class="quiz-progress-bar"><i style="width:' + ((qIndex) / total * 100) + '%"></i></div>' +
        '<div class="quiz-q">' + HB.esc(q.q) + '</div>' +
        '<div class="quiz-opts">' + opts + '</div>' +
        '</div>';

      main.querySelectorAll('.quiz-opt').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = parseInt(btn.dataset.i, 10);
          var earned = 7 + Math.floor(Math.random() * 4); // playful 7-10/10
          score += earned;
          scores.push(earned);
          // mark selection
          main.querySelectorAll('.quiz-opt').forEach(function (o) { o.classList.add('correct'); });
          btn.classList.add('correct');
          setTimeout(nextOrFinish, 550);
        });
      });
    }

    function nextOrFinish() {
      if (!main.querySelector('.quiz-q')) return;
      qIndex++;
      if (qIndex < cat.questions.length) {
        renderQuestion();
      } else {
        showScore();
      }
    }

    function showScore() {
      var total = cat.questions.length * 10;
      var pct = Math.round((score / total) * 100);
      pct = Math.max(62, Math.min(100, pct));

      var names = HB.firstNames();
      var msg = HB.quizScoreMessage(pct, names);
      var ringLen = 565;
      var dash = (pct / 100) * ringLen;

      main.innerHTML =
        '<div class="page" style="max-width:680px">' +
        '<div class="dash-hello text-center"><h1>Your Couple <span class="hand" style="font-size:1.15em">Score</span> ♡</h1></div>' +
        '<div class="card score-reveal">' +
          '<div class="eyebrow" style="margin:0 auto;display:flex;justify-content:center">' + cat.name + '</div>' +
          '<div class="score-ring">' +
            '<svg viewBox="0 0 200 200"><circle class="ring-bg" cx="100" cy="100" r="90"/><circle class="ring-val" id="ring-val" cx="100" cy="100" r="90"/></svg>' +
            '<div><div class="score-num" id="score-num">0</div><div class="score-pct">%</div></div>' +
          '</div>' +
          '<div class="score-message">' + HB.esc(msg) + '</div>' +
          '<div class="score-sub">' + HB.pick(REACTIONS) + ' Take another category and see what else you discover.</div>' +
          '<div class="row" style="justify-content:center">' +
            '<button class="btn btn-primary" data-again>Play again ♡</button>' +
            '<button class="btn btn-soft" data-cats>All categories</button>' +
          '</div>' +
        '</div>' +
        '</div>';

      var num = main.querySelector('#score-num');
      var ring = main.querySelector('#ring-val');
      setTimeout(function () {
        if (!num || !ring || !num.isConnected) return;
        ring.style.strokeDashoffset = (ringLen - dash);
        animateNum(num, 0, pct, 1200);
        HB.burst(window.innerWidth / 2, window.innerHeight / 3, 30);
      }, 300);

      main.querySelector('[data-again]').addEventListener('click', function () {
        qIndex = 0; score = 0; scores = []; renderQuestion();
      });
      main.querySelector('[data-cats]').addEventListener('click', showCategories);
    }

    function animateNum(el, from, to, dur) {
      var start = null;
      function step(ts) {
        if (!start) start = ts;
        var p = Math.min((ts - start) / dur, 1);
        p = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(from + (to - from) * p);
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }

    showCategories();
  });
})();
