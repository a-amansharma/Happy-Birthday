/* ============================================================
   DATE IDEAS — personalized generator with filters
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var BUDGETS = ['Free', '₹500', '₹1,000', '₹2,500', '₹5,000+'];
  var LOCATIONS = ['At Home', 'Outdoors', 'Café', 'City', 'Anywhere'];
  var MOODS = ['Romantic', 'Adventure', 'Cozy', 'Funny', 'Relaxing', 'Foodie', 'Creative'];
  var TIMES = ['30 minutes', '1 hour', '2–3 hours', 'Full Day'];

  var IDEAS = [
    { title: 'Sunset Picnic Duo', emoji: '🧺', budget: 'Free', location: 'Outdoors', mood: 'Romantic', time: '2–3 hours', needs: 'A blanket, snacks, water, a playlist', desc: 'Pack the simple things and find a patch of sky. Watch the sunset turn gold and talk about everything and nothing.', sweet: 'Extra sweet if you each bring one thing that reminds you of the other.' },
    { title: 'Café Hop & Rate', emoji: '☕', budget: '₹1,000', location: 'Café', mood: 'Foodie', time: '2–3 hours', needs: 'Comfortable shoes, empty stomachs', desc: 'Visit two or three cafés, order one signature drink at each, and rate them like food critics. Loser pays for the next dessert.', sweet: 'Keep the receipts — they\'re tiny memories too.' },
    { title: 'Home Cooking Challenge', emoji: '🍳', budget: '₹500', location: 'At Home', mood: 'Funny', time: '2–3 hours', needs: 'Ingredients, an apron, zero dignity', desc: 'Pick a dish neither of you has made. Cook it together, catastrophically if needed, and taste-test like it\'s a Michelin review.', sweet: 'The messier the kitchen, the better the story.' },
    { title: 'City Lights Walk', emoji: '🌃', budget: 'Free', location: 'City', mood: 'Romantic', time: '1 hour', needs: 'A jacket, a good song on repeat', desc: 'Walk the streets as the lights come on. Stop at anything that catches your eye — a window display, a busker, a bench with a view.', sweet: 'End it at a spot where you can see the whole city breathing.' },
    { title: 'Star-Gazing Blanket Night', emoji: '⭐', budget: 'Free', location: 'Outdoors', mood: 'Relaxing', time: '1 hour', needs: 'Blankets, hot drinks, zero rush', desc: 'Find the darkest spot you can and lie down with the sky above. Point out shapes in the clouds and make up constellations together.', sweet: 'Name one constellation after your relationship.' },
    { title: 'DIY Museum Date', emoji: '🖼️', budget: '₹500', location: 'At Home', mood: 'Creative', time: '2–3 hours', needs: 'Printer or paper, tape, imagination', desc: 'Fill your walls with "exhibits" — silly drawings, printed memes, old photos — and take a formal tour of your own museum.', sweet: 'Write a plaque for each piece explaining why it matters to you two.' },
    { title: 'Board Game Rivalry', emoji: '🎲', budget: 'Free', location: 'At Home', mood: 'Funny', time: '2–3 hours', needs: 'One game, snacks, a fake scoreboard', desc: 'Pick a game you both love — or a silly one neither of you takes seriously. Keep a running trophy and a list of "unforgivable plays".', sweet: 'The loser owes the winner one made-up wish.' },
    { title: 'Scavenger Hunt for Two', emoji: '🗺️', budget: '₹1,000', location: 'City', mood: 'Adventure', time: 'Full Day', needs: 'A list of 10 small missions, phone battery', desc: 'Make a list of tiny missions — a purple wall, a weird sign, the best chai. Split up for 30 minutes, then meet and swap stories.', sweet: 'End at a spot with a view of where you first met.' },
    { title: 'Candlelit Night In', emoji: '🕯️', budget: '₹500', location: 'At Home', mood: 'Romantic', time: '2–3 hours', needs: 'Candles, fairy lights, a movie, takeout', desc: 'Turn off the main lights and turn on the cozy ones. One movie, one blanket, no phones. The world can wait.', sweet: 'Pause the movie once and tell each other a "why I love you" fact.' },
    { title: 'DIY Karaoke Night', emoji: '🎤', budget: 'Free', location: 'At Home', mood: 'Funny', time: '1 hour', needs: 'A phone, speakers, questionable confidence', desc: 'One song each, performed with maximum drama. Applause is mandatory. Cringe is the point.', sweet: 'Record the highlight reel — future you two will need it.' },
    { title: 'Solo Mission Swap', emoji: '🕵️', budget: '₹500', location: 'Anywhere', mood: 'Adventure', time: '1 hour', needs: 'Nothing but curiosity', desc: 'Each person goes on a tiny solo adventure for an hour — then meet and share what you saw, found, or overthought.', sweet: 'Bring back one little thing for the other (a flower, a pebble, a packet of chips).' },
    { title: 'Dream Trip Planning', emoji: '✈️', budget: 'Free', location: 'At Home', mood: 'Creative', time: '2–3 hours', needs: 'A notebook, wild imaginations', desc: 'Plan the trip of your dreams on paper — flights, food, chaos. Cost doesn\'t matter. It\'s about building a future story together.', sweet: 'Write the title of your future photo album at the top.' },
    { title: 'Sunrise Chai Date', emoji: '🌅', budget: '₹500', location: 'Outdoors', mood: 'Romantic', time: '1 hour', needs: 'Thermos of chai, sleepy smiles', desc: 'Wake up unreasonably early and watch the morning arrive. The quiet before the world wakes up is yours alone.', sweet: 'Make a pact to do it once a month. Call it your dawn ritual.' },
    { title: 'Dessert Detective', emoji: '🍰', budget: '₹1,000', location: 'Café', mood: 'Foodie', time: '1 hour', needs: 'Sweet tooth, loose appetite', desc: 'Order two different desserts and swap halfway. Rate each other\'s choice. This is serious research.', sweet: 'The winner gets to pick next week\'s date.' },
    { title: 'Love Letter Exchange', emoji: '💌', budget: 'Free', location: 'At Home', mood: 'Romantic', time: '30 minutes', needs: 'Paper, pens, honesty', desc: 'Write each other a letter — no pressure, just whatever you\'re feeling — and read them aloud over tea.', sweet: 'Date-stamp them and stash them away to re-read next year.' },
    { title: 'Rainy Window Coziness', emoji: '🌧️', budget: 'Free', location: 'At Home', mood: 'Relaxing', time: '2–3 hours', needs: 'Rain (or a long playlist if it doesn\'t rain)', desc: 'Sit by the window with drinks, watch the rain, and people-watch the umbrellas. Low effort, high heart.', sweet: 'Guess little stories for the people you see. Share your favorite ones.' }
  ];

  HB.route('/dates', function (main) {
    if (!HB.state.onboarded) { HB.navigate('/onboarding'); return; }

    var filters = { budget: 'Any', location: 'Any', mood: 'Any', time: 'Any' };
    var results = [];

    function chipGroup(label, values) {
      var chips = ['Any'].concat(values).map(function (v) {
        var sel = filters[label] === v ? ' selected' : '';
        return '<button class="chip' + sel + '" data-filt="' + label + '" data-val="' + HB.esc(v) + '">' + HB.esc(v) + '</button>';
      }).join('');
      return '<div class="field"><label class="label">' + label + '</label><div class="filter-chips">' + chips + '</div></div>';
    }

    function runFilter() {
      results = IDEAS.filter(function (idea) {
        if (filters.budget !== 'Any' && idea.budget !== filters.budget) return false;
        if (filters.location !== 'Any' && idea.location !== filters.location) return false;
        if (filters.mood !== 'Any' && idea.mood !== filters.mood) return false;
        if (filters.time !== 'Any' && idea.time !== filters.time) return false;
        return true;
      });
      if (!results.length) results = HB.shuffle(IDEAS).slice(0, 4);
      else results = HB.shuffle(results);
      renderResults();
    }

    function renderResults() {
      var grid = main.querySelector('#date-results');
      if (!grid) return;
      if (!results.length) {
        grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="es-emoji">' + HB.chars.stageHtml({ which: 'bubu', action: 'think', size: 'empty', alt: 'Bubu is thinking of ideas' }) + '</div><h4>No matches</h4><p>Loosen a filter and let the magic find you.</p></div>';
        return;
      }
      grid.innerHTML = results.map(function (idea, i) {
        return '<div class="date-idea" style="animation-delay:' + (i * 0.07) + 's">' +
          '<div class="di-emoji">' + idea.emoji + '</div>' +
          '<h3>' + HB.esc(idea.title) + '</h3>' +
          '<div class="di-desc">' + HB.esc(idea.desc) + '</div>' +
          '<div class="di-tags">' +
            '<span class="di-tag">💰 ' + idea.budget + '</span>' +
            '<span class="di-tag">📍 ' + idea.location + '</span>' +
            '<span class="di-tag">⏱ ' + idea.time + '</span>' +
            '<span class="di-tag">🎈 ' + idea.mood + '</span>' +
          '</div>' +
          '<div class="di-tags"><span class="di-tag" style="background:var(--surface-2)">🎒 ' + HB.esc(idea.needs) + '</span></div>' +
          '<div class="di-sweet">' + HB.esc(idea.sweet) + '</div>' +
          '</div>';
      }).join('');
    }

    main.innerHTML =
      '<div class="page">' +
      '<div class="dash-hello"><h1>Date <span class="hand" style="font-size:1.15em">ideas</span> 🌙</h1>' +
      '<p>Tell me your mood, budget, and time — I\'ll find the perfect little adventure for you two.</p></div>' +

      '<div class="card date-filter-card">' +
        '<div class="filter-grid">' +
          chipGroup('budget', BUDGETS) +
          chipGroup('location', LOCATIONS) +
          chipGroup('mood', MOODS) +
          chipGroup('time', TIMES) +
        '</div>' +
        '<button class="btn btn-primary btn-lg" id="generate-dates" style="width:100%">✨ Find our date</button>' +
      '</div>' +

      '<div class="date-ideas-grid" id="date-results"></div>' +
      '</div>';

    main.querySelectorAll('[data-filt]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        filters[btn.dataset.filt] = btn.dataset.val;
        main.querySelectorAll('[data-filt="' + btn.dataset.filt + '"]').forEach(function (x) {
          x.classList.toggle('selected', x === btn);
        });
      });
    });

    main.querySelector('#generate-dates').addEventListener('click', function () {
      HB.toast('Finding your perfect little date...', '✨');
      setTimeout(runFilter, 400);
    });

    runFilter();
  });
})();
