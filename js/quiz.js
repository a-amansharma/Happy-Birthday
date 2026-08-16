/* ============================================================
   DAILY BOND QUIZ — 5 questions a day, answered on both phones,
   match result computed in the database and revealed in real time.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var qIndex = 0;
  var answers = {};

  HB.route('/quiz', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var connected = HB.rel.data.status === 'connected';

    if (!connected) {
      main.innerHTML =
        '<div class="page"><div class="dash-hello"><h1>Daily Bond <span class="hand" style="font-size:1.15em">Quiz</span> 🎲</h1>' +
        '<p>Five sweet questions a day — answered on both phones, revealed together.</p></div>' +
        '<div class="connect-center"><div class="dudu-big" data-du></div>' +
        '<h3>' + (HB.rel.data.status === 'waiting' ? 'Waiting for your person ♡' : 'This needs you two ♡') + '</h3>' +
        '<p class="wizard-step-hint">Connect with your person first, and tomorrow\'s quiz starts from today.</p>' +
        '<button class="btn btn-primary" data-partner>Open Partner page 💞</button></div></div>';
      var du = main.querySelector('[data-du]');
      if (du && HB.chars) du.innerHTML = HB.chars.stageHtml({ which: 'both', action: 'wait', size: 'big', alt: 'Bubu ♡ Dudu' });
      main.querySelector('[data-partner]').addEventListener('click', function () { HB.navigate('/partner'); });
      return;
    }

    HB.quiz.onChange(function () {
      if (HB.currentPath() === '/quiz') renderQuiz(main);
    });

    qIndex = 0;
    answers = {};
    HB.quiz.today().then(function (q) {
      if (!main.isConnected) return;
      if (!q) {
        main.innerHTML = '<div class="page"><div class="dash-hello"><h1>Daily Bond <span class="hand" style="font-size:1.15em">Quiz</span> 🎲</h1>' +
          '<p>This project\'s database doesn\'t have the quiz tables yet — so for now the Daily Bond lives in your little love-note routine. The quiz unlocks the moment the schema is upgraded.</p></div></div>';
        return;
      }
      renderQuiz(main);
    }).catch(function (err) {
      if (main.isConnected) main.innerHTML = '<div class="page"><div class="dash-hello"><h1>Daily Bond Quiz 🎲</h1><p>Hmm, the quiz couldn\'t load: ' + HB.esc(String(err.message || err)) + '</p></div></div>';
    });
  });

  function renderQuiz(main) {
    var quiz = HB.quiz.current();
    if (!quiz) return;
    var my = HB.quiz.myAnswers();
    var result = quiz.result;

    if (result) { renderResult(main, quiz, result); return; }

    var questions = quiz.questions || [];
    if (!questions.length) {
      main.innerHTML = '<div class="page"><div class="dash-hello"><h1>Daily Bond Quiz 🎲</h1><p>No questions yet — check back soon.</p></div></div>';
      return;
    }

    if (my && Object.keys(my).length) {
      renderWaiting(main, quiz);
      return;
    }

    renderQuestions(main, questions);
  }

  function renderQuestions(main, questions) {
    var total = questions.length;
    var q = HB.quiz.fillNames(questions[qIndex]);

    var opts = q.opts.map(function (o, i) {
      return '<button class="quiz-opt" data-i="' + i + '"><span class="qo-letter">' + String.fromCharCode(65 + i) + '</span><span>' + HB.esc(o) + '</span></button>';
    }).join('');

    main.innerHTML =
      '<div class="page" style="max-width:680px">' +
      '<div class="dash-hello"><h2 class="hand" style="font-size:26px">Daily Bond Quiz</h2>' +
      '<p>Question ' + (qIndex + 1) + ' of ' + total + '</p></div>' +
      '<div class="quiz-progress-bar"><i style="width:' + (qIndex / total * 100) + '%"></i></div>' +
      '<div class="quiz-q">' + HB.esc(q.q) + '</div>' +
      '<div class="quiz-opts">' + opts + '</div>' +
      '</div>';

    main.querySelectorAll('.quiz-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        main.querySelectorAll('.quiz-opt').forEach(function (o) { o.classList.add('correct'); });
        btn.classList.add('correct');
        answers[qIndex] = parseInt(btn.dataset.i, 10);
        setTimeout(function () {
          if (!main.querySelector('.quiz-q')) return;
          qIndex++;
          if (qIndex < total) renderQuestions(main, questions);
          else submitAll(main);
        }, 500);
      });
    });
  }

  function submitAll(main) {
    main.innerHTML = '<div class="page" style="max-width:680px"><div class="dash-hello"><h2 class="hand" style="font-size:26px">Locking in your answers…</h2></div>' +
      '<div class="connect-center"><div class="dudu-small-stage" data-du></div><div class="typing"><i></i><i></i><i></i></div></div></div>';
    var du = main.querySelector('[data-du]');
    if (du && HB.chars) du.innerHTML = HB.chars.stageHtml({ which: 'both', action: 'happy', size: 'sm', alt: 'Bubu ♡ Dudu' });

    HB.quiz.submit(answers).then(function (res) {
      if (res && res.error) {
        HB.toast('Couldn\'t submit — try again?', '💔');
        if (main.isConnected) renderQuiz(main);
        return;
      }
      // my submit is in — wait for partner in real time
      if (main.isConnected) renderQuiz(main);
    });
  }

  function renderWaiting(main, quiz) {
    var my = HB.quiz.myAnswers() || {};
    var count = Object.keys(my).length;
    var partnerName = HB.firstNames().partner;
    main.innerHTML =
      '<div class="page" style="max-width:680px">' +
      '<div class="dash-hello"><h1>Daily Bond <span class="hand" style="font-size:1.15em">Quiz</span> 🎲</h1>' +
      '<p>You answered ' + count + ' of ' + (quiz.questions || []).length + ' — now for the sweet part.</p></div>' +
      '<div class="connect-center"><div class="dudu-big" data-du></div>' +
      '<h3>Waiting for ' + HB.esc(partnerName) + ' to answer… ♡</h3>' +
      '<p class="wizard-step-hint">The moment you both answer, your match appears here in real time.</p>' +
      '<div class="typing"><i></i><i></i><i></i></div>' +
      '</div></div>';
    var du = main.querySelector('[data-du]');
    if (du && HB.chars) du.innerHTML = HB.chars.stageHtml({ which: 'both', action: 'wait', size: 'big', alt: 'Bubu ♡ Dudu' });
  }

  function renderResult(main, quiz, result) {
    var pct = result.pct || 0;
    var cat = HB.quiz.bondCategory(pct);
    var ringLen = 565;
    var dash = (pct / 100) * ringLen;
    var names = HB.firstNames();

    main.innerHTML =
      '<div class="page" style="max-width:680px">' +
      '<div class="dash-hello text-center"><h1>Your Bond <span class="hand" style="font-size:1.15em">Score</span> ♡</h1>' +
      '<p>' + HB.esc(names.me) + ' & ' + HB.esc(names.partner) + ' — today, you matched on <b>' + (result.matches || 0) + '</b> of <b>' + (result.total || 5) + '</b>.</p></div>' +
      '<div class="card score-reveal">' +
        '<div class="eyebrow" style="margin:0 auto;display:flex;justify-content:center">' + HB.esc(cat.emoji) + '</div>' +
        '<div class="score-ring">' +
          '<svg viewBox="0 0 200 200"><circle class="ring-bg" cx="100" cy="100" r="90"/><circle class="ring-val" id="ring-val" cx="100" cy="100" r="90"/></svg>' +
          '<div><div class="score-num" id="score-num">0</div><div class="score-pct">%</div></div>' +
        '</div>' +
        '<div class="score-message">' + HB.esc(cat.emoji + ' ' + cat.desc) + '</div>' +
        '<div class="dudu-small-stage" data-du style="max-width:180px;margin:6px auto 0"></div>' +
        '<p class="muted" style="font-size:12.5px;margin-top:12px">A fresh quiz appears tomorrow — see you then, love. ♡</p>' +
      '</div>' +
      '</div>';

    var du = main.querySelector('[data-du]');
    if (du && HB.chars) du.innerHTML = HB.chars.stageHtml({ which: 'both', action: 'happy', size: 'sm', alt: 'Bubu ♡ Dudu' });

    var num = main.querySelector('#score-num');
    var ring = main.querySelector('#ring-val');
    setTimeout(function () {
      if (!num || !ring || !num.isConnected) return;
      ring.style.strokeDashoffset = (ringLen - dash);
      animateNum(num, 0, pct, 1200);
      HB.burst(window.innerWidth / 2, window.innerHeight / 3, 30);
    }, 300);
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

  /* Partner connected while we sat on the "waiting" screen → load the quiz. */
  window.addEventListener('hb:relchange', function () {
    if (HB.currentPath() !== '/quiz') return;
    var main = document.getElementById('main');
    if (!main || !main.isConnected) return;
    if (HB.rel.data.status === 'connected' && main.querySelector('[data-partner]')) {
      HB.navigate('/quiz');
    }
  });
})();
