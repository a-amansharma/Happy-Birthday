/* ============================================================
   CHATDATA — contextual chatbot engine (demo AI companion)
   Uses profile + selected personality from onboarding.
   Structuring: swap HB.chatReply with a real API call later.
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  var lastIntent = '';

  function names() {
    return HB.firstNames();
  }

  function styleFlavor(msg, withFlavor) {
    if (!withFlavor) return msg;
    var styles = (HB.state.profile.chatStyle || []).map(function (s) { return typeof s === 'string' ? s : s.label; });
    var fav = {
      funny: ['Anyway — love you to bits 😂', 'Also, I\'m right and you\'re lucky. ♡', 'Okay that\'s my TED talk, done 😂'],
      sarcastic: ['Obviously. 🙃', 'As if I\'d tell you otherwise.', 'No pressure, but I\'m judging lightly. 😌'],
      flirty: ['And yes, you look good today. As always. 😏', 'Also, that message you sent? Still thinking about it. ♡'],
      romantic: ['And remember — you\'re my favorite ♡', 'Stay sweet, my person. 🌹'],
      sweet: ['Sending you a big virtual hug ♡', 'You\'re doing so well, you know?'],
      calm: ['Breathe. One thing at a time. 🧘', 'Whatever it is, we\'ll figure it out slowly.'],
      protective: ['And if anyone upsets you, tell me. I\'ll handle it. 🛡️', 'You deserve kindness. I mean it.'],
      motivational: ['You\'ve got this. I believe in you. 🚀', 'One step at a time — you\'re stronger than you think.'],
      playful: ['Wanna make it a game? I\'m great at games. 🎈', 'Ready when you are, partner. 😄']
    };
    var list = [];
    styles.forEach(function (s) {
      var key = s.toLowerCase().split(' ')[0];
      if (fav[key]) list.push(fav[key]);
    });
    if (!list.length) return msg;
    var flavor = HB.pick(HB.pick(list));
    return msg + '\n\n' + flavor;
  }

  function fill(msg) {
    var n = names();
    return msg
      .replace(/\{partner\}/g, n.partner)
      .replace(/\{me\}/g, n.me)
      .replace(/\{name\}/g, n.me);
  }

  function hasAny(str, words) {
    str = (str || '').toLowerCase();
    for (var i = 0; i < words.length; i++) {
      if (str.indexOf(words[i]) !== -1) return true;
    }
    return false;
  }

  function relLabel() {
    return HB.state.profile.relationship || 'your relationship';
  }

  /* ---------------- Intent handlers ---------------- */
  var INTENTS = [];

  function intent(key, words, fn) {
    INTENTS.push({ key: key, words: words, fn: fn });
  }

  intent('lovenote', ['love note', 'write a note', 'write note', 'note for'], function () {
    lastIntent = 'lovenote';
    var n = names();
    var list = [
      'Of course, {me} ♡ I just wrote you one — here it is:\n\n"' + n.partner + ', I keep falling for you in the tiniest moments. The way you say my name, the way you laugh at your own jokes first, the way you make ordinary days feel like memories. I love you. ♡"\n\nWant a different tone — sweet, funny or romantic?',
      'Say less. I\'m on it ✍️\n\n"My {partner} — you are the softest, best part of my days. When the world gets loud, you\'re my quiet. Thank you for being you. ♡"\n\nWant me to make it flirty? Long? Short and punchy? Just say the word.',
      'One love note, coming up ♡\n\n"Hey {partner}, quick reminder: you\'re still the reason I smile at my phone like an absolute fool. Keep being adorable. I love you. ♡"\n\nSay "tone: romantic" or "tone: funny" and I\'ll redo it.'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('cheerup', ['cheer me up', 'cheer up', 'feel better', 'bad day', 'tough day', 'having a bad'], function () {
    lastIntent = 'cheerup';
    var list = [
      'Hey {me}, come here 🧸 You\'re allowed to have rough days. But guess what — you\'ve gotten through 100% of your bad days so far. That\'s a perfect record. And {partner} is lucky to have someone who keeps going. I\'m proud of you. ♡',
      'Sending you a tiny virtual bear hug 🐻 First, take a slow breath. Then tell me — is it a "talk it out" bad day, or a "distract me with cute things" bad day? I\'m equipped for both.',
      'Okay, emergency protocol, {me}: imagine {partner} sending you the most ridiculous voice note right now. Messy hair, messy laugh. You smiled a little, didn\'t you? 😄 The bad days pass. You don\'t have to fix everything today.'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('relationship', ['ask about my relationship', 'about us', 'our relationship', 'about my relationship', 'our story'], function () {
    lastIntent = 'relationship';
    var p = HB.state.profile;
    var rel = relLabel();
    var parts = ['So, about you two ♡'];
    if (p.name) parts.push('There\'s {me}');
    if (p.partner) parts.push('and {partner}');
    parts.push('— a lovely ' + rel.toLowerCase() + '.');
    var vibes = (p.vibes || []).map(function (v) { return v.label; });
    if (vibes.length) parts.push('Your vibe? ' + vibes.slice(0, 3).join(', ') + '. I can tell. 😌');
    if (p.story) parts.push('And your little story — "' + p.story + '" — honestly, that\'s the sweetest part of you two.');
    parts.push('What would you like to know or do for {partner} today?');
    return styleFlavor(fill(parts.join(' ')), true);
  });

  intent('dateidea', ['date idea', 'give me a date', 'what should we do', 'plan a date', 'date night'], function () {
    lastIntent = 'dateidea';
    var list = [
      'Ooh, let me think of something cute for you and {partner} 💡 How about a "home café date"? Pick one country each, make their signature drink, and rate each other\'s masterpieces out of 10. Loser does the dishes. 😏',
      'Here\'s one: a sunset walk with a twist — you both write down 3 things you love about each other before you leave, and swap them halfway through. Ends with snacks. Always ends with snacks. ♡',
      'A "first date re-enactment" night! Recreate your first date as best you can — same food, same vibe, same chaos. Then add one new memory to the collection. 📸'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('laugh', ['make me laugh', 'make me smile', 'tell me a joke', 'funny'], function () {
    lastIntent = 'laugh';
    var list = [
      'Okay {me}, here\'s a classic: Why did the couple break up? Because they couldn\'t agree on which side of the bed was the "best side". Real dedication to a tiny argument. 😂',
      'Why did the teddy bear say no to dessert? Because it was already stuffed. 🐻 (I know. I\'m hilarious. You\'re welcome.)',
      'A couple goes to a café. The barista asks what they want. The girl says "whatever he\'s having". The boy says "whatever she wants but also make sure it has cheese". That\'s the whole joke. It\'s just them. 😂'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('apologize', ['help me apologize', 'apologize', 'i screwed up', 'help me say sorry', 'i was wrong'], function () {
    lastIntent = 'apologize';
    var list = [
      'Alright {me}, deep breath. Here\'s a good starting point:\n\n"{partner}, I want to apologize properly. I\'ve been thinking about what happened, and I was wrong. You mean too much to me for me to leave this unspoken. Can we talk when you\'re ready? ♡"\n\nOwn your part, don\'t rush them, and mean it. You\'ve got this.',
      'Saying sorry is brave, {me} ♡ Try this:\n\n"I hurt you, and that\'s the last thing I want to do. I\'m sorry, {partner}. I\'d like to make it right — my ears are open whenever you\'re ready."\n\nThe key? Actually listen after you say it.'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('romantic', ['something romantic', 'romantic', 'be romantic', 'say something sweet', 'sweet something'], function () {
    lastIntent = 'romantic';
    var list = [
      'Close your eyes for a second, {me} 🕯️ Imagine this: it\'s late, it\'s quiet, and you\'re sitting somewhere warm with {partner}. They look at you like you\'re the answer to a question they didn\'t know they had. That\'s what you two are. ♡',
      'Here\'s something romantic: "I hope {partner} knows that in a lifetime of moments, the ones with them are the ones I\'d keep."\n\nRead that one out loud. It hits different. ♡'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('miss', ['miss', 'longing', 'far away', 'i wish they were here'], function () {
    lastIntent = 'miss';
    var list = [
      'I know, {me} 🥺 Missing {partner} can feel heavier than it sounds. Want me to write a tiny message you can send them? I promise I\'ll make it say exactly what your heart means.',
      'That missing feeling just means your heart already knows where home is — and it\'s with {partner}. 🥺 Want to send them a little "thinking of you" note? I can write it in a second.'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('loveyou', ['love you', 'i love', 'luv u'], function () {
    lastIntent = 'loveyou';
    var list = [
      'And I love that you love them so openly, {me} ♡ You two are the kind of love story that makes the world softer. Tell them today — don\'t wait for a special day.',
      'Aww ♡ You clearly love them a lot, and honestly? It shows. Big fan of you two. Now go send {partner} that exact message — they deserve to hear it.'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('sad', ['sad', 'depressed', 'crying', 'down', 'lonely', 'hurt', 'broken'], function () {
    lastIntent = 'sad';
    var list = [
      'Hey {me}, that sounds really heavy. I\'m here, and I\'m not going anywhere. 🧸 Sometimes the bravest thing is just admitting you\'re not okay — so thank you for telling me. Want to talk it out, or would you rather I sit quietly with you for a bit?',
      'I hear you, {me}. It\'s okay to feel this. You don\'t have to be okay right now. But remember — {partner} chose you, and the way you feel today doesn\'t change how much you\'re loved. ♡ I\'m right here if you want to keep talking.'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('anxious', ['anxious', 'nervous', 'worried', 'stress', 'overthink'], function () {
    lastIntent = 'anxious';
    var list = [
      'Okay {me}, let\'s do this together: one slow breath in… hold it… and out. 🌬️ Now, what\'s one small thing you can control right now? Start there. The rest can wait. And if it helps — I\'m pretty sure {partner} loves you even on your messy days.',
      'Anxiety loves to make everything feel urgent, {me}. Here\'s a trick: write the worry down, then ask yourself "is this true, or is my brain being dramatic right now?" Nine times out of ten, it\'s drama. You\'re stronger than this moment. ♡'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('fight', ['fight', 'argue', 'argument', 'angry', 'mad at', 'upset with', 'tension'], function () {
    lastIntent = 'fight';
    var list = [
      'Fights happen in every real relationship, {me} — it\'s not a sign something\'s broken, it\'s a sign you both care enough to have feelings about it. ♡ Can you tell me what happened? I can help you find the words. (Spoiler: "I\'m sorry, I reacted too fast" goes a long way.)',
      'Breathe, {me}. Right now it\'s you two against the problem — not against each other. Want me to help you cool down first, or draft an apology that doesn\'t make it worse? I\'m very good at this. 😌'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('jealous', ['jealous', 'jealousy', 'insecure'], function () {
    lastIntent = 'jealous';
    var list = [
      'Hey, feeling a little jealous is human, {me} — it just means you really value {partner}. ♡ The trick is talking about it kindly instead of letting it fester. Want me to help you say it in a way that brings you closer instead of pushing apart?',
      'I get it. Love can make us a little protective. 💛 Remember this: {partner} chose you. Every single day, they choose you. If you want, I can help you turn that worry into a sweet little check-in instead.'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('surprise', ['surprise', 'gift', 'present', 'something special'], function () {
    lastIntent = 'surprise';
    var list = [
      'A surprise, I love it! 🎁 Here\'s a sweet one: hide a tiny note in a book they\'re reading, or in their bag, with something you love about them written on it. They\'ll find it at the most random moment and think of you. Bonus points for a little doodle.',
      'Surprise idea: recreate their favorite snack and present it with a handmade "menu" card — "Tonight\'s special: made with love by {me}". It\'s cute, personal, and costs almost nothing. ♡'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('anniv', ['anniversary', 'special date', 'birthday', 'milestone'], function () {
    lastIntent = 'anniv';
    var list = [
      'Ooh, a milestone! 🎉 For an anniversary or birthday, the best gifts aren\'t things — they\'re memories. Why not make a little "year in review" — top 5 moments together, one line each, written like movie subtitles. It\'ll make them cry (in a good way). ♡',
      'Celebration time! ✨ Here\'s an idea: write down 7 reasons you love them, one for each day of the week leading up to the big day. Watch them melt a little more each day. And I can write one for you right now if you want!'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('longdistance', ['long distance', 'ldr', 'far apart', 'different city', 'video call'], function () {
    lastIntent = 'longdistance';
    var list = [
      'Long distance is hard, and I\'m not going to pretend it isn\'t — but you two are tougher than the miles. 💛 Want a few "distance date" ideas you can do on a call? Dinner at the same time, a movie synced up, or a shared playlist where you add a song for each other every day.',
      'I know the distance weighs on you, {me}. But here\'s the thing about you and {partner} — you\'re building a story that\'s stronger than geography. Keep little rituals: a good morning voice note, a nightly "today I thought of you because…" message. They work. ♡'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('marry', ['marry', 'marriage', 'propose', 'proposal', 'engaged'], function () {
    lastIntent = 'marry';
    var list = [
      'Okay {me}, marriage talk! 😍 My advice: the proposal matters less than the promise. Keep it personal — a place that means something to you two, or a line that\'s inside-joke level personal. And when you ask, look them in the eyes. That\'s the whole secret. ♡',
      'Whoa, big step! 💍 Whatever way you do it, make it unmistakably *you two*. If you two are the "pizza and a terrible movie" kind of couple, propose over pizza. If you\'re the sunset walk kind, do that. They\'ll say yes either way. I already know it. ♡'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('help', ['help', 'what can you do', 'commands'], function () {
    lastIntent = 'help';
    return 'I\'m your little love companion ♡ Here\'s what I\'m best at:\n\n💌 Writing love notes\n🧸 Cheering you up\n💞 Talking about you two\n🌙 Date ideas\n😂 Making you laugh\n🙏 Apologies & hard talks\n🌹 Random romance\n\nTry saying: "write me a love note" or "I miss {partner}" — I\'ll take it from there.';
  });

  intent('hello', ['hi', 'hello', 'hey', 'yo', 'hii', 'heyy', 'namaste', 'hola'], function () {
    lastIntent = 'hello';
    var list = [
      'Hey {me}! ♡ Your favorite (and only) little bear companion is here. How\'s your heart doing today?',
      'Hello hello, {me}! 🐻 I was just thinking about you two. What are we feeling today — sweet, silly, or "I need some serious advice"?'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('thanks', ['thank', 'thx', 'thanks', 'appreciate'], function () {
    lastIntent = 'thanks';
    var list = [
      'Anything for you, {me} ♡ That\'s literally my job. (And I love it.)',
      'You\'re so welcome! ♡ Now go be sweet to {partner}. And if you need me, I\'ll be right here, waving a tiny paw. 🐾'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('who', ['who are you', 'your name', 'what are you'], function () {
    lastIntent = 'who';
    return 'I\'m your little bear companion for you and {partner} ♡ I\'m not them — I\'m just a very enthusiastic assistant who knows everything about your little world and is 100% on your side. Ask me anything.';
  });

  intent('bye', ['bye', 'goodbye', 'see you', 'talk later'], function () {
    lastIntent = 'bye';
    var list = [
      'Bye for now, {me} ♡ Go be loved, and if you need me — I\'m one message away. 🐻',
      'See you soon! I\'ll be here, practicing my wave. 👋♡'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  intent('partnermention', ['partner', 'them', 'their', 'she', 'he'], function () {
    lastIntent = 'partnermention';
    var list = [
      'Tell me more, {me} ♡ How is {partner} doing? You seem to have a lot on your heart about them today — I\'ve got all the time in the world.',
      'I\'m all ears about {partner} ♡ What\'s on your mind? Sweet thing they did, something you want to plan, or just a "I want to talk about them" kind of moment?'
    ];
    return styleFlavor(fill(HB.pick(list)), true);
  });

  /* Fallbacks */
  var FALLBACKS = [
    'I\'m listening, {me} ♡ Tell me more — or if it\'s easier, try one of the little buttons below. I\'m best at love notes, date ideas, cheering you up, and being extremely emotionally supportive. 🐻',
    'Hmm, that one\'s new to me, {me}! 😄 Let\'s unpack it a little — how are you feeling about it right now? And remember, {partner} is lucky to have someone who thinks about them this much.',
    'I\'m with you, {me} ♡ I don\'t always have the perfect words, but I always have the patience. Want to tell me a bit more? Or we could switch gears and I can write {partner} something sweet.'
  ];

  /* ---------------- Public API ---------------- */
  HB.chatIntro = function () {
    var p = HB.state.profile;
    var n = names();
    var rel = relLabel();
    var greet = '';
    if (n.me) {
      var h = new Date().getHours();
      greet = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
      greet = greet + ', ' + n.me + ' ♡';
    } else {
      greet = 'Welcome to your little world ♡';
    }
    var body = '';
    if (n.partner) {
      body = 'I\'m your little companion for you and ' + n.partner + '. I know about your ' + rel.toLowerCase() + ', your vibes, all of it — so tell me what\'s on your heart. I\'m all ears (and a little fuzzy). 🐻';
    } else {
      body = 'I\'m your little companion. Tell me what\'s on your heart — I\'m all ears (and a little fuzzy). 🐻';
    }
    return { text: greet + '\n\n' + body };
  };

  HB.chatSuggestions = [
    'Write a Love Note',
    'Cheer Me Up',
    'Ask About My Relationship',
    'Give Me A Date Idea',
    'Make Me Laugh',
    'Help Me Apologize',
    'Something Romantic'
  ];

  HB.chatReply = function (input) {
    var raw = input;
    var low = raw.toLowerCase();

    // Quick-action aliases
    var actionMap = {
      'write a love note': 'lovenote',
      'cheer me up': 'cheerup',
      'ask about my relationship': 'relationship',
      'give me a date idea': 'dateidea',
      'make me laugh': 'laugh',
      'help me apologize': 'apologize',
      'something romantic': 'romantic'
    };
    if (actionMap[low]) {
      var act = INTENTS.filter(function (i) { return i.key === actionMap[low]; })[0];
      return act.fn();
    }

    // Tone-switch commands like "tone: romantic" while in lovenote context
    if (lastIntent === 'lovenote' && low.indexOf('tone:') !== -1) {
      var tone = low.replace('tone:', '').trim();
      if (HB.NOTE_TONES.indexOf(tone) !== -1) {
        var tpl = HB.noteTemplates['Random Love'] && (HB.noteTemplates['Random Love'][tone] || HB.noteTemplates['Random Love']['Sweet']);
        var note = HB.pick(tpl);
        var n2 = names();
        return 'Here you go — a "' + tone + '" one ♡\n\n' + note.replace(/\{partner\}/g, n2.partner) + '\n\nSay "tone: sweet" / "funny" / "flirty" and I\'ll keep switching.';
      }
    }

    // Intent matching
    for (var i = 0; i < INTENTS.length; i++) {
      if (hasAny(low, INTENTS[i].words)) {
        return INTENTS[i].fn();
      }
    }

    // Fallback
    lastIntent = 'fallback';
    return styleFlavor(fill(HB.pick(FALLBACKS)), true);
  };

  /* Ready-to-connect API structure (no keys in frontend) */
  HB.chatAPI = {
    enabled: false,
    endpoint: '',
    async ask(text) {
      // If a real API is configured (server-side key), call it here.
      // For now we fall back to the demo engine.
      return HB.chatReply(text);
    }
  };
})();
