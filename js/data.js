/* ============================================================
   DATA — onboarding options, themes, daily questions, quizzes
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  HB.RELATIONSHIPS = [
    { label: 'Couple', emoji: '💑' },
    { label: 'Best Friends', emoji: '🧸' },
    { label: 'Crush', emoji: '💘' },
    { label: 'Long Distance', emoji: '🌍' },
    { label: 'Newly Together', emoji: '🌱' },
    { label: 'Married', emoji: '💍' },
    { label: 'Talking Stage', emoji: '💬' },
    { label: "It's Complicated", emoji: '🌀' },
    { label: 'Other', emoji: '✨' }
  ];

  HB.VIBES = [
    { label: 'Cute & Romantic', emoji: '🌷' },
    { label: 'Funny & Chaotic', emoji: '😂' },
    { label: 'Soft & Emotional', emoji: '🫧' },
    { label: 'Flirty', emoji: '😏' },
    { label: 'Deep & Meaningful', emoji: '🌊' },
    { label: 'Adventure Lovers', emoji: '🏔️' },
    { label: 'Introvert Couple', emoji: '🛋️' },
    { label: 'Long-Distance Love', emoji: '🌙' }
  ];

  HB.CHAT_STYLES = [
    { label: 'Sweet', emoji: '🍯' },
    { label: 'Playful', emoji: '🎈' },
    { label: 'Funny', emoji: '🤪' },
    { label: 'Romantic', emoji: '🌹' },
    { label: 'Protective', emoji: '🛡️' },
    { label: 'Motivational', emoji: '🚀' },
    { label: 'Calm', emoji: '🧘' },
    { label: 'Flirty', emoji: '😜' },
    { label: 'Emotional', emoji: '💗' },
    { label: 'Sarcastic', emoji: '🙃' }
  ];

  HB.THEMES = [
    { id: 'milk', name: 'Milk & Mocha', swatch: 'linear-gradient(135deg,#FFF6EE,#FFD9E0)', icon: '🥛' },
    { id: 'bubu', name: 'Bubu & Dudu', swatch: 'linear-gradient(135deg,#E6EAFF,#FCE4EE)', icon: '🫐' },
    { id: 'pink', name: 'Pink Love', swatch: 'linear-gradient(135deg,#FFE3EC,#F7A8C4)', icon: '🌸' },
    { id: 'midnight', name: 'Midnight Love', swatch: 'linear-gradient(135deg,#2B2750,#4A3560)', icon: '🌙' },
    { id: 'cafe', name: 'Cozy Café', swatch: 'linear-gradient(135deg,#F5E3CB,#C98A4B)', icon: '☕' },
    { id: 'sunset', name: 'Sunset Romance', swatch: 'linear-gradient(135deg,#FDE6DE,#F4A261)', icon: '🌅' },
    { id: 'minimal', name: 'Minimal Couple', swatch: 'linear-gradient(135deg,#F3F1EC,#6C5CE7)', icon: '🤍' }
  ];

  /* ---------------- Daily questions ---------------- */
  HB.DAILY_QUESTIONS = [
    'What is one tiny thing they do that always makes you smile?',
    'If you could teleport anywhere together right now, where would you go?',
    'What was your favorite memory together?',
    'What is something you want to experience together?',
    'What song reminds you of them, and why?',
    'When did you first realize you cared about them?',
    'What is their weirdest but cutest habit?',
    'If your relationship had a theme song, what would it be?',
    'What is one thing they do that makes you feel loved?',
    'If you could give them one superpower, what would it be?',
    'What place feels the most like "your spot"?',
    'What is a future adventure you dream about sharing?',
    'What is the most thoughtful thing they have ever done?',
    'If you were to plan a perfect day with them, what would it look like?',
    'What is one thing you still want to learn about them?',
    'What was the moment you felt the closest to them?'
  ];

  HB.dailyQuestionOfToday = function () {
    var day = Math.floor(Date.now() / 86400000);
    return HB.DAILY_QUESTIONS[day % HB.DAILY_QUESTIONS.length];
  };

  /* ---------------- Quiz data ---------------- */
  HB.QUIZ_CATEGORIES = [
    {
      id: 'know', name: 'How Well Do You Know Each Other?', emoji: '🧠',
      desc: 'Little details that prove you actually listen.',
      points: 2,
      questions: [
        { q: 'What is their favorite comfort food?', opts: ['Pizza', 'Ice cream', 'Maggi / noodles', 'Chocolate'], a: -1, playful: true },
        { q: 'Which do they check first in the morning?', opts: ['Phone', 'Their person (you)', 'Water', 'A playlist'], a: -1, playful: true },
        { q: 'What is their "I need a hug" signal?', opts: ['Going quiet', 'Sending random memes', 'Saying "I\'m fine"', 'Staring dramatically out a window'], a: -1, playful: true },
        { q: 'What could make their whole day instantly?', opts: ['A good meal', 'A message from you', 'A nap', 'Winning at something'], a: -1, playful: true },
        { q: 'Which late-night activity are they most likely to do?', opts: ['Sleep early', 'Talk to you for hours', 'Scroll forever', 'Get snacks'], a: -1, playful: true }
      ]
    },
    {
      id: 'love', name: 'Love Language', emoji: '💬',
      desc: 'Find out how you two say "I love you".',
      points: 1,
      questions: [
        { q: 'Which says "I love you" louder to you?', opts: ['A long tight hug', 'Words at the right moment', 'A thoughtful gift', 'Quality time together'], a: 0 },
        { q: 'How do you usually comfort them?', opts: ['Hugs & presence', 'Words of reassurance', 'Doing something helpful', 'Just listening'], a: 1 },
        { q: 'What would make you feel most appreciated today?', opts: ['A sweet message', 'A surprise treat', 'An uninterrupted evening', 'A genuine compliment'], a: 2 },
        { q: 'Your ideal "quality time" looks like…', opts: ['Deep conversation', 'Laughing at dumb stuff', 'Doing things side by side', 'Trying something new'], a: 3 },
        { q: 'A small love gesture you secretly love?', opts: ['A random "thinking of you" text', 'They save the last bite for you', 'A hand on your back', 'A surprise plan'], a: -1, playful: true }
      ]
    },
    {
      id: 'fun', name: 'Fun Couple Quiz', emoji: '🎉',
      desc: 'Silly, chaotic, and impossible to fail.',
      points: 1,
      questions: [
        { q: 'Who is more likely to lose their phone in the house?', opts: ['You', 'Them', 'Neither — we\'re legends', 'Both, at the same time'], a: -1, playful: true },
        { q: 'If you two were animals, which pair fits best?', opts: ['Bears (obviously)', 'Otters', 'Cats', 'Golden retrievers'], a: -1, playful: true },
        { q: 'Who would survive longer in a zombie apocalypse?', opts: ['You', 'Them', 'Together, obviously', 'We\'d both be gone in 48h'], a: -1, playful: true },
        { q: 'What is your couple superpower?', opts: ['Finishing each other\'s sentences', 'Finding food anywhere', 'Making each other laugh', 'Reading each other\'s mood'], a: -1, playful: true },
        { q: 'Who is the better driver?', opts: ['You', 'Them', 'Neither, we walk', 'The one not looking at their phone'], a: -1, playful: true }
      ]
    },
    {
      id: 'deep', name: 'Deep Questions', emoji: '🌊',
      desc: 'The kind that end in late-night talks.',
      points: 1,
      questions: [
        { q: 'What do you admire most about them?', opts: ['Their kindness', 'Their strength', 'Their humor', 'The way they care'], a: -1, playful: false },
        { q: 'What is something you\'ve grown softer about since meeting them?', opts: ['My trust', 'My patience', 'My future plans', 'My self-image'], a: -1, playful: false },
        { q: 'If you could relive one moment together, which?', opts: ['Our first meeting', 'Our first date', 'A random cozy day', 'The first "I love you"'], a: -1, playful: false },
        { q: 'What is a promise you want to keep forever?', opts: ['To always communicate', 'To never give up on us', 'To keep choosing them', 'To keep us laughing'], a: -1, playful: false }
      ]
    },
    {
      id: 'random', name: 'Random Questions', emoji: '🎲',
      desc: 'Silly little things, zero pressure.',
      points: 1,
      questions: [
        { q: 'Who texts first when you\'re excited about something?', opts: ['You', 'Them', 'Depends who it is', 'Simultaneously, always'], a: -1, playful: true },
        { q: 'What is your couple snack?', opts: ['Popcorn', 'Anything shared', 'Coffee', 'Chaos (you eat each other\'s food)'], a: -1, playful: true },
        { q: 'Which movie night mood wins?', opts: ['Cute romcom', 'Cozy animated', 'Rewatching your show', 'We can\'t agree so we scroll'], a: -1, playful: true },
        { q: 'Who is the bigger tease?', opts: ['You', 'Them', 'We\'re equal criminals', 'We just roast everyone else'], a: -1, playful: true },
        { q: 'Your couple catchphrase?', opts: ['"Five more minutes"', '"One more episode"', '"Wait, what?"', '"Love you, bye!"'], a: -1, playful: true }
      ]
    },
    {
      id: 'compat', name: 'Compatibility', emoji: '💞',
      desc: 'The ultimate "are we basically the same person" test.',
      points: 2,
      questions: [
        { q: 'On a lazy Sunday, you\'d both choose…', opts: ['Binge something together', 'Nap with snacks', 'A tiny adventure', 'Parallel screen time'], a: -1, playful: true },
        { q: 'When you fight, you\'re more likely to…', opts: ['Talk it out quickly', 'Take a break then talk', 'Joke it away', 'Get food together first'], a: -1, playful: true },
        { q: 'Your perfect temperature?', opts: ['Cold room + blankets', 'Warm and cozy', 'Fan on, always', 'Whatever — as long as we\'re together'], a: -1, playful: true },
        { q: 'If one of you is stressed, the other usually…', opts: ['Makes them laugh', 'Gives space & snacks', 'Talks it through', 'Sends a voice note'], a: -1, playful: true },
        { q: 'You two are most unstoppable when…', opts: ['Planning a trip', 'Cooking together', 'Roasting a shared enemy', 'Late-night deep talks'], a: -1, playful: true }
      ]
    }
  ];

  HB.QUIZ_SCORE_MSGS = [
    [0, 40, 'Oops, we\'ve been busy humans 😅 — time to start a fun convo, {me} and {partner} still have so much to discover!', 'No wrong answers here. This just gave you two an excuse to talk. Which is, honestly, the whole point.'],
    [41, 70, 'You\'re getting there! You definitely listen… sometimes 😄', 'A solid couple score. Now go ask them the one question you got wrong. That\'s the real game.'],
    [71, 90, '{score}% — You two basically share one brain cell, and it\'s adorable 😂♡', 'That\'s proper couple level. You clearly pay attention — or at least fake it very convincingly.'],
    [91, 100, '{score}% — You two are basically the same person 😂♡', 'We\'re not saying it\'s fate. But also… it\'s definitely fate. Nobody listens this well on accident.']
  ];

  HB.quizScoreMessage = function (score, names) {
    for (var i = 0; i < HB.QUIZ_SCORE_MSGS.length; i++) {
      var band = HB.QUIZ_SCORE_MSGS[i];
      if (score >= band[0] && score <= band[1]) {
        return band[2].replace('{score}', score).replace('{me}', names.me).replace('{partner}', names.partner);
      }
    }
    return 'Perfect score, you absolute legends ♡';
  };

  HB.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  HB.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  };
})();
