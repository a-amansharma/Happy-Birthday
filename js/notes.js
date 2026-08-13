/* ============================================================
   NOTES — love note template bank
   Keyed by [type][tone] -> array of templates
   Placeholders: {partner} {years} {me}
   ============================================================ */
(function () {
  'use strict';
  var HB = window.HB = window.HB || {};

  HB.NOTE_TYPES = ['Good Morning', 'Good Night', 'I Miss You', "I'm Sorry", 'Thank You', 'Anniversary', 'Birthday', 'Random Love', 'Flirty', 'Emotional', 'Funny'];

  HB.NOTE_TONES = ['Sweet', 'Romantic', 'Funny', 'Deep', 'Flirty', 'Short', 'Long'];

  var T = HB.noteTemplates = {};

  T['Good Morning'] = {
    Sweet: [
      'Good morning, {partner} ♡\nThe sun came up extra gently today — it knew you were waking up. I hope today is soft with you, warm like coffee, and full of little reasons to smile. I love you.',
      'Morning, {partner} ♡\nI woke up and the first thought was you. I think today is going to be a good one. I hope yours is too.'
    ],
    Romantic: ['Morning light, your name, my favorite start.\nGood morning {partner} — every day I get to wake up to the thought of you is a good day. ♡'],
    Funny: ['Rise and shine, {partner}! 🌞\nThe coffee has arrived, the bed is still calling, but you — you\'re the best part of today\'s agenda. Get up, gorgeous.'],
    Deep: ['Each morning I\'m reminded that the quietest thing I carry is how much I care about you, {partner}. Wake up soft. Today is ours.'],
    Flirty: ['Good morning, beautiful. 😏\nIf you\'re looking for the reason the room feels warmer — it\'s you.'],
    Short: ['Morning, {partner} ♡ Today\'s already better because you exist.'],
    Long: ['Good morning, {partner}.\nI hope you slept gently and dreamed of things that made you smile. Today I want you to remember how loved you are — in the quiet moments, in the busy ones, in every in-between. Whatever today brings, you don\'t face it alone. I\'m here, I\'m yours, and I\'m so glad I get to share mornings with you. ♡']
  };

  T['Good Night'] = {
    Sweet: ['Good night, {partner} ♡\nRest now — the world will wait. Let tonight wrap you up like a hug. I\'ll be here when you wake. Sweet dreams, my favorite person.'],
    Romantic: ['As the day folds itself away, I just want you to know — you\'re my favorite ending.\nGood night, {partner}. Dream of us. ♡'],
    Funny: ['Good night, {partner}! 🌙\nOfficially logging off for the day. No more thoughts, no more worries — just pillow and you. I\'ll catch you in dreamland.'],
    Deep: ['Night falls, and I think about how lucky the quiet is — it gets to hold you when I can\'t.\nGood night, {partner}. I\'m so grateful for you.'],
    Flirty: ['Good night, {partner} 😏\nIf sleep is where I go to dream about you, I\'m very excited to go to bed tonight.'],
    Short: ['Good night, {partner} ♡ Dream sweet.'],
    Long: ['Good night, {partner}.\nThe day is done and you made it through. I hope it treated you gently — and if it didn\'t, I hope you know tomorrow is a fresh page. Sleep slow, rest deep, and dream of all the good things coming your way. I\'ll be here, always thinking of you. ♡']
  };

  T['I Miss You'] = {
    Sweet: ['I miss you, {partner} 🥺\nIt\'s funny how the quiet feels louder without you in it. Come back soon — or at least send me a smile.'],
    Romantic: ['Missing you is a whole mood today, {partner}.\nThe sun feels dimmer, the songs hit harder, and every little thing reminds me of us. ♡'],
    Funny: ['I miss you, {partner}. 😤\nI tried being productive without you but my brain filed a formal complaint. This is unacceptable. Return soon.'],
    Deep: ['Distance is strange, {partner}.\nIt shows you exactly how much space someone takes up in your heart — and you take up all of mine.'],
    Flirty: ['I miss you, {partner} 😘\nAlso, my heart has filed a missing person report. Subject: you. Reward: my whole day.'],
    Short: ['Miss you, {partner} ♡'],
    Long: ['I miss you, {partner}. It\'s the kind of missing that sneaks up — in a song, a smell, a silly video I want to send you.\nI keep a little list of things to tell you when we\'re together again. It\'s getting long, and I love that about us. Until then, this is me, thinking of you. ♡']
  };

  T["I'm Sorry"] = {
    Sweet: ['I\'m sorry, {partner}. ♡\nI never meant to hurt you. You matter more to me than being right. I hope you can forgive me.'],
    Romantic: ['Forgive me, {partner}.\nOf all the things I want to get right in this life, it\'s loving you well. I fell short. Let me make it up to you. ♡'],
    Funny: ['Okay, so I have no excuse, {partner}. 😅\nI was wrong, I admit it, I\'m sorry, and I brought emotional support snacks. Can we be friends again? Best friends?'],
    Deep: ['I keep replaying what happened, {partner}.\nI hurt you, and that\'s the last thing I ever want to do. I\'m sorry. I\'ll do better — for us.'],
    Flirty: ['I\'m sorry, {partner} 😏\nBut also — you look way too good to be mad at me. Can we call a truce?'],
    Short: ['I\'m sorry, {partner}. Truly. ♡'],
    Long: ['{partner}, I want to say I\'m sorry — not just with words, but with the way I show up for you from now on.\nI hate that I made you feel anything less than adored. You mean everything to me, and I\'m going to prove it. Thank you for being patient with me. ♡']
  };

  T['Thank You'] = {
    Sweet: ['Thank you, {partner} ♡\nFor your patience, your warmth, your tiny texts that make my whole day. I notice everything. I\'m so lucky.'],
    Romantic: ['Thank you for being my home, {partner}.\nNo matter where we are, you feel like the safest place I know. ♡'],
    Funny: ['Thank you, {partner}! 😤\nFor dealing with me at my most... me. It\'s a full-time job and you do it with a smile. Legend.'],
    Deep: ['Thank you, {partner}.\nFor seeing me when I couldn\'t see myself. For staying when it would\'ve been easier to go. That\'s not something I\'ll ever take for granted.'],
    Flirty: ['Thank you, {partner} 😘\nFor being so impossible to forget. It\'s honestly impressive.'],
    Short: ['Thank you, {partner}. For everything. ♡'],
    Long: ['Thank you, {partner}.\nI know I don\'t say it enough — so let me say it slowly. Thank you for your patience when I\'m messy. Thank you for your joy when I\'m tired. Thank you for choosing me, again and again.\nYou make my world softer and brighter, and I hope I make yours feel just as loved. ♡']
  };

  T['Anniversary'] = {
    Sweet: ['Happy anniversary, {partner} 🎂♡\nAnother year of us — and I\'d do every single day again if it meant ending up here with you.'],
    Romantic: ['One year closer to forever, {partner}.\nFrom the day we met, I knew my life had a new favorite chapter. Happy anniversary. ♡'],
    Funny: ['Happy anniversary, {partner}!\nWe\'ve survived {years} of each other\'s moods and still chose each other. That\'s real love. 😂♡'],
    Deep: ['Anniversaries are just days, {partner}.\nBut ours marks the moment my life changed direction — towards you. Thank you for that. Happy anniversary. ♡'],
    Flirty: ['Happy anniversary, {partner} 😏\nStill the best decision I ever made. And I\'m not just saying that because you look good today.'],
    Short: ['Happy anniversary, {partner} ♡ Forever yours.'],
    Long: ['{partner}, happy anniversary.\nI think about all the little moments that brought us here — the first hello, the first laugh, the first time I realized you were home.\nI\'d rewrite every day if it meant the same story: two people finding each other, holding on, growing softer together. Here\'s to us, to today, and to every anniversary we\'ll still be counting. ♡']
  };

  T['Birthday'] = {
    Sweet: ['Happy birthday, {partner}! 🎂\nThe world got a little brighter the day you were born. I\'m so glad you exist. Make a wish — I\'ll make it come true. ♡'],
    Romantic: ['Happy birthday, my favorite person, {partner} ♡\nI hope today feels even half as special as you make every single day feel.'],
    Funny: ['Happy birthday, {partner}! 🥳\nYou\'re officially {years} — still cute, still chaotic, still my favorite person to annoy. Age like fine wine, please.'],
    Deep: ['Another year of you, {partner}.\nAnother year of your kindness, your strength, the way you show up for people. The world is lucky you were born. I\'m the luckiest of all. Happy birthday. ♡'],
    Flirty: ['Happy birthday, {partner} 😏\nThe candles aren\'t the only thing glowing today.'],
    Short: ['Happy birthday, {partner} ♡ You\'re my favorite.'],
    Long: ['Happy birthday, {partner}.\nI hope this year is gentle to you. I hope it brings you laughter in unexpected places, peace in the loud moments, and love that you never have to question.\nI\'m so proud to be yours — today, on your birthday, and every day after. Let\'s make this year unforgettable. ♡']
  };

  T['Random Love'] = {
    Sweet: ['Hey, {partner} ♡\nJust a random reminder that you\'re loved, deeply and without conditions. That\'s all. Now go have a great day.'],
    Romantic: ['I was just thinking about you, {partner}.\nIt wasn\'t a special day or anything — it\'s just that every day with you in it feels special. ♡'],
    Funny: ['{partner}, quick update: I was thinking about you and smiled so hard someone stared. I told them. It\'s your fault. 😂♡'],
    Deep: ['{partner}, here\'s a random thought:\nyou\'re the person I\'d choose to find in every lifetime. This one included.'],
    Flirty: ['{partner} 😏\nRandom reminder: you\'re dangerously attractive and I\'m not okay about it.'],
    Short: ['Just because: I love you, {partner} ♡'],
    Long: ['Hey {partner}, this is a completely unscheduled, 100% spontaneous love note.\nI was thinking about the way you laugh, the way you care, the way you make ordinary days feel like memories worth keeping.\nYou don\'t have to do anything to deserve this — you just have to be you. That\'s plenty. That\'s everything. ♡']
  };

  T['Flirty'] = {
    Sweet: ['Hey {partner} 😏\nJust so you know — I\'d still choose you even if I had a thousand choices. You make my heart do gymnastics. ♡'],
    Romantic: ['{partner}, you\'re dangerous.\nOne smile from you and my whole day changes for the better. I\'m completely, happily done for. ♡'],
    Funny: ['{partner} 😏\nAre you a work of art? Because I find myself staring and losing track of time. (I\'m sorry, I had to.)'],
    Deep: ['You have no idea what you do to me, {partner}.\nIt\'s not just attraction — it\'s the way my whole being relaxes when you\'re near. That\'s rare.'],
    Flirty: ['{partner} 😉\nIf you were a dessert, I\'d never finish you because I\'d want it to last forever.'],
    Short: ['You\'re so cute it\'s a crime, {partner} ♡'],
    Long: ['So, {partner}, I have a confession.\nEvery time my phone lights up and it\'s your name, I get this little kick of happiness — like my heart knows something good is coming.\nYou\'re dangerously good at existing. Please continue. 😏♡']
  };

  T['Emotional'] = {
    Sweet: ['{partner} ♡\nI don\'t say it enough, but you\'ve changed my life. Thank you for being my soft place to land.'],
    Romantic: ['There\'s something about you, {partner}.\nIn a world that moves too fast, you\'re my pause. My favorite stillness. My heart\'s home. ♡'],
    Funny: ['Okay, emotional moment, {partner}.\nI was going to say something deep but honestly I just love how you steal my fries and then look at me like you\'re innocent. Still love you though. ♡'],
    Deep: ['I\'ve been thinking, {partner}.\nIf I had to relive this life a hundred times, I\'d want you in every single version of it. That\'s not a line. That\'s just the truth.'],
    Flirty: ['I get all soft inside when I think about you, {partner} ♡\nAnd that\'s really saying something, because I\'m usually a menace.'],
    Short: ['You\'re my favorite person, {partner}. Don\'t ever doubt that.'],
    Long: ['{partner}, I\'m not always good with words, so let me try.\nBefore you, my life had a lot of good days. After you, it had a reason behind them. You didn\'t just walk into my life — you rearranged it, softly and permanently, and I\'m so grateful.\nWhatever we face, I want you to know you\'re never doing it alone. I\'m here. I always will be. ♡']
  };

  T['Funny'] = {
    Sweet: ['{partner} 😂\nI love you more than my phone battery loves me back from 1%. That\'s real commitment.'],
    Romantic: ['{partner} ♡\nIf loving you was a job, I\'d never take a day off. I\'d just be there, early, with snacks and bad jokes.'],
    Funny: ['Official announcement, {partner}:\nyou\'re ridiculous, you\'re my favorite, and together we\'re basically a two-person comedy show. No refunds.'],
    Deep: ['{partner}, on a serious note —\nyou\'re the only person who makes nonsense conversations feel like home. That\'s the deepest thing I\'ll say today.'],
    Flirty: ['{partner} 😏\nYou\'re the reason my search history is just "how to be romantic" and "cute date ideas". It\'s not working. You just win by existing.'],
    Short: ['{partner}: still chaotic, still loved ♡'],
    Long: ['Okay {partner}, here\'s the thing.\nI planned to write something poetic, but then I remembered the time we argued about whether a hotdog is a sandwich for 40 minutes. We\'re unserious people and I wouldn\'t trade it for the world.\nLove you, weirdo. ♡']
  };
})();
