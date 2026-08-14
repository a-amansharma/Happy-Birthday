/* ============================================================
   SERVICE: QUIZ — the Daily Bond Quiz
   Same quiz on both phones (relationship_id + quiz_date),
   independent answers, match result computed in the database
   and streamed back in real time to both devices.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var current = null;          // quiz row
  var myAnswers = null;        // my submitted answers (map idx->opt)
  var quizChange = null;       // callback(quiz)

  var BOND_CATEGORIES = [
    [90, 100, '💖 Deeply Connected', 'Basically one heart, two bodies. It\u2019s honestly adorable.'],
    [75, 89, '💕 Emotionally In Sync', 'You two read each other like your favorite book.'],
    [60, 74, '💗 Understanding Each Other', 'You listen well \u2014 and it clearly shows.'],
    [45, 59, '💞 Playful Partners', 'Half the fun is the not-quite-synced parts of you two.'],
    [30, 44, '💓 Growing Together', 'Every answer is a new little thing to learn about each other.'],
    [15, 29, '😄 Cute Opposites', 'Opposites attract \u2014 clearly, beautifully.'],
    [0, 14, '🌱 Still Discovering Each Other', 'The best part of a couple is the discovering. More quizzes = more fun.']
  ];

  /* Seedable RNG so both devices generate the same quiz */
  function hashStr(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function seeded(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* -------------------- question bank -------------------- */
  /* {q} and {p} placeholders are filled with live names at render */
  var BANK = [
    { q: 'What is {p}\u2019s favorite comfort food?', opts: ['Pizza', 'Ice cream / dessert', 'Maggi or noodles', 'Chocolate'] },
    { q: 'What does {p} check first in the morning?', opts: ['Phone', 'Messages from you', 'Water', 'A playlist'] },
    { q: 'What is {p}\u2019s "I need a hug" signal?', opts: ['Going quiet', 'Sending random memes', 'Saying "I\'m fine"', 'Dramatic sighing'] },
    { q: 'What could make {p}\u2019s whole day instantly?', opts: ['A good meal', 'A message from you', 'A nap', 'Winning at something'] },
    { q: 'Which late-night activity is most {p}\u2019s thing?', opts: ['Sleeping early', 'Talking to you for hours', 'Scrolling forever', 'Midnight snacks'] },
    { q: 'What says "I love you" loudest to {p}?', opts: ['A long tight hug', 'The right words at the right time', 'A thoughtful gift', 'Quality time together'] },
    { q: 'How do you usually comfort {p}?', opts: ['Hugs & presence', 'Words of reassurance', 'Doing something helpful', 'Just listening'] },
    { q: 'What would make {p} feel most appreciated today?', opts: ['A sweet message', 'A surprise treat', 'An uninterrupted evening', 'A genuine compliment'] },
    { q: '{p}\u2019s ideal "quality time" looks like\u2026', opts: ['Deep conversation', 'Laughing at dumb stuff', 'Doing things side by side', 'Trying something new'] },
    { q: 'A small love gesture {p} secretly loves?', opts: ['A random "thinking of you" text', 'You save the last bite for them', 'A hand on the back', 'A surprise plan'] },
    { q: 'If you two were animals, which pair fits best?', opts: ['Bears (obviously)', 'Otters', 'Cats', 'Golden retrievers'] },
    { q: 'Who is more likely to lose their phone at home?', opts: ['You', '{p}', 'Neither \u2014 you\u2019re legends', 'Both, at the same time'] },
    { q: 'What is your couple superpower?', opts: ['Finishing each other\u2019s sentences', 'Finding food anywhere', 'Making each other laugh', 'Reading each other\u2019s mood'] },
    { q: 'Your perfect lazy Sunday together\u2026', opts: ['Binge something together', 'Nap with snacks', 'A tiny adventure', 'Parallel screen time'] },
    { q: 'Your couple snack?', opts: ['Popcorn', 'Anything shared', 'Coffee', 'Stealing each other\u2019s food'] },
    { q: 'Who is the bigger tease in the relationship?', opts: ['You', '{p}', 'Equal criminals', 'You both roast everyone else'] },
    { q: 'Which movie night mood wins for you two?', opts: ['Cute romcom', 'Cozy animated', 'Rewatching your show', 'Scrolling instead of deciding'] },
    { q: 'When one of you is stressed, the other usually\u2026', opts: ['Makes them laugh', 'Gives space & snacks', 'Talks it through', 'Sends a voice note'] },
    { q: 'What do you admire most about {p}?', opts: ['Their kindness', 'Their strength', 'Their humor', 'The way they care'] },
    { q: 'If you could relive one moment with {p}, which?', opts: ['Your first meeting', 'Your first date', 'A random cozy day', 'The first "I love you"'] },
    { q: 'What is a promise you want to keep forever?', opts: ['To always communicate', 'To never give up on each other', 'To keep choosing each other', 'To keep laughing together'] },
    { q: 'Who texts first when you\u2019re excited about something?', opts: ['You', '{p}', 'Depends on the news', 'Simultaneously, always'] },
    { q: 'Where would you two teleport right now?', opts: ['Somewhere tropical', 'A cozy cabin', 'A new city to explore', 'Your favorite spot at home'] },
    { q: 'What song screams "you two"?', opts: ['A slow romantic one', 'A silly hype song', 'The one from your first date', 'The one you can\u2019t agree on'] },
    { q: 'What would {p} pick for your dream date?', opts: ['Sunset picnic', 'Caf\u00e9 hopping', 'A long walk', 'Staying in, just the two of you'] }
  ];

  function buildQuestions(relId, dateKey) {
    var seed = hashStr(relId + '|' + dateKey);
    var rnd = seeded(seed);
    var indices = [];
    for (var i = 0; i < BANK.length; i++) indices.push(i);
    for (var j = indices.length - 1; j > 0; j--) {
      var k = Math.floor(rnd() * (j + 1));
      var t = indices[j]; indices[j] = indices[k]; indices[k] = t;
    }
    var picked = indices.slice(0, 5).map(function (idx) {
      var q = BANK[idx];
      var opts = q.opts.slice();
      for (var o = opts.length - 1; o > 0; o--) {
        var ko = Math.floor(rnd() * (o + 1));
        var to = opts[o]; opts[o] = opts[ko]; opts[ko] = to;
      }
      return { q: q.q, opts: opts };
    });
    return picked;
  }

  /* fill {q}/{p} names live at render */
  function fillNames(q) {
    var names = HB.firstNames();
    return {
      q: q.q.replace(/\{p\}/g, names.partner).replace(/\{q\}/g, names.me),
      opts: q.opts.map(function (o) { return o.replace(/\{p\}/g, names.partner).replace(/\{q\}/g, names.me); })
    };
  }

  var quiz = {

    current: function () { return current; },
    myAnswers: function () { return myAnswers; },

    result: function () {
      return current ? (current.result || null) : null;
    },

    bondCategory: function (pct) {
      for (var i = 0; i < BOND_CATEGORIES.length; i++) {
        if (pct >= BOND_CATEGORIES[i][0] && pct <= BOND_CATEGORIES[i][1]) {
          return { emoji: BOND_CATEGORIES[i][2], desc: BOND_CATEGORIES[i][3] };
        }
      }
      return { emoji: '🌱 Still Discovering Each Other', desc: '' };
    },

    /* fetch (or create) today's quiz for the relationship */
    today: function () {
      var rel = HB.rel.data.relationship;
      if (!rel) return Promise.resolve(null);
      var dateKey = HB.rel.todayKey();
      var questions = buildQuestions(rel.id, dateKey);

      return HB.db.client().rpc('get_or_create_daily_quiz', {
        p_relationship_id: rel.id,
        p_quiz_date: dateKey,
        p_questions: questions
      }).then(function (res) {
        if (res.error) throw res.error;
        current = res.data;
        return HB.db.client().from('quiz_answers').select('*').eq('quiz_id', current.id).maybeSingle()
          .then(function (aRes) {
            if (!aRes.error && aRes.data) myAnswers = aRes.data.answers || {};
            quiz.subscribe();
            return current;
          });
      }).catch(function (err) {
        current = null;
        throw err;
      });
    },

    submit: function (answers) {
      if (!current) return Promise.resolve({ error: { message: 'NO_QUIZ' } });
      myAnswers = answers;
      return HB.db.client().rpc('submit_quiz_answers', {
        p_quiz_id: current.id,
        p_answers: answers
      }).then(function (res) {
        if (res.error) return { error: res.error };
        return { data: res.data };
      });
    },

    /* realtime: watch the quiz row + my answers (both devices get the result) */
    subscribe: function () {
      if (!current) return;
      var key = 'quiz:' + current.id;
      HB.db.subscribe(key, { table: 'daily_quizzes', filter: 'id=eq.' + current.id },
        function (payload) {
          if (payload.new) {
            current = payload.new;
            if (quizChange) quizChange(current);
          }
        });
      HB.db.subscribe('quizans:' + current.id, { table: 'quiz_answers', filter: 'quiz_id=eq.' + current.id },
        function (payload) {
          if (quizChange) quizChange(current);
        });
    },

    onChange: function (fn) { quizChange = fn; },

    /* helpers for render */
    fillNames: fillNames,
    buildQuestions: buildQuestions,
    todayKey: HB.rel && HB.rel.todayKey ? HB.rel.todayKey : function () {
      var d = new Date();
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
  };

  HB.quiz = quiz;
})();
