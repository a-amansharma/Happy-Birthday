// Smoke test — minimal DOM shims, load modules, exercise logic
const fs = require('fs');
const path = require('path');

const store = {};
global.localStorage = {
  getItem: (k) => store[k] || null,
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

const listeners = {};
const elements = [];
function makeEl() {
  return {
    innerHTML: '', style: {}, dataset: {}, classList: { add(){}, remove(){}, toggle(){} },
    addEventListener(){}, appendChild(){}, remove(){}, querySelector(){ return makeEl(); },
    querySelectorAll(){ return []; }, focus(){}, value: '', checked: false,
    scrollTop: 0, scrollHeight: 0, parentElement: null, textContent: ''
  };
}
global.window = global;
global.document = {
  readyState: 'complete',
  getElementById: () => makeEl(),
  querySelector: () => makeEl(),
  querySelectorAll: () => [],
  createElement: () => makeEl(),
  body: makeEl(),
  addEventListener(){},
  removeEventListener(){}
};
global.location = { hash: '', replace(){}, };
global.history = { replaceState(){} };
global.addEventListener = () => {};
global.removeEventListener = () => {};
global.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0);
global.cancelAnimationFrame = () => {};
global.navigator = { clipboard: { writeText: () => Promise.resolve() } };
global.AudioContext = function(){ return { state:'running', resume(){}, currentTime:0, createGain(){ return { gain:{ value:0, linearRampToValueAtTime(){}, exponentialRampToValueAtTime(){} }, connect(){} }; }, createOscillator(){ return { type:'', frequency:{ value:0 }, connect(){}, start(){}, stop(){} }; }, destination:{} }; };
global.HTMLElement = class {};
global.Element = class {};
global.Blob = class { constructor(p){ this.p = p; } };

const dir = path.join(__dirname, '..', 'js');
['core.js','bears.js','data.js','notes.js','chatdata.js'].forEach((f) => {
  eval(fs.readFileSync(path.join(dir, f), 'utf8'));
});

const HB = global.window.HB;
let pass = 0, fail = 0;
function t(name, cond) { if (cond) { pass++; console.log('  ✓ ' + name); } else { fail++; console.log('  ✗ ' + name); } }

// state defaults
t('default state exists', HB.state && HB.state.onboarded === false);
t('couple() fallback', HB.couple() === 'You two');

// onboarding data
t('themes count', HB.THEMES.length === 7);
t('vibes count', HB.VIBES.length === 8);
t('chat styles count', HB.CHAT_STYLES.length === 10);
t('note types count', HB.NOTE_TYPES.length === 11);
t('note tones count', HB.NOTE_TONES.length === 7);
t('daily questions exist', HB.DAILY_QUESTIONS.length >= 10);
t('daily question of today returns string', typeof HB.dailyQuestionOfToday() === 'string');
t('quiz categories', HB.QUIZ_CATEGORIES.length === 6);

// set profile then chat
HB.state.profile.name = 'Him';
HB.state.profile.partner = 'Her';
HB.state.profile.relationship = 'Long Distance';
HB.state.profile.vibes = [{ label: 'Romantic', emoji: '🌹' }];
HB.state.profile.chatStyle = [{ label: 'Funny', emoji: '😂' }];

t('couple() with names', HB.couple() === 'Him ♡ Her');
t('firstNames', HB.firstNames().partner === 'Her');

const intro = HB.chatIntro();
t('chatIntro uses names', intro.text.indexOf('Him') !== -1 && intro.text.indexOf('Her') !== -1);

const r1 = HB.chatReply('I miss Her.');
t('miss intent', r1.indexOf('Her') !== -1);

const r2 = HB.chatReply('Write a Love Note');
t('lovenote quick action', r2.indexOf('Her') !== -1);

const r3 = HB.chatReply('Cheer Me Up');
t('cheerup', typeof r3 === 'string' && r3.length > 10);

const r4 = HB.chatReply('Give Me A Date Idea');
t('date idea', typeof r4 === 'string' && r4.length > 20);

const r5 = HB.chatReply('Make Me Laugh');
t('laugh', typeof r5 === 'string' && r5.length > 10);

const r6 = HB.chatReply('Help Me Apologize');
t('apologize', r6.indexOf('Her') !== -1);

const r7 = HB.chatReply('hi');
t('hello intent', typeof r7 === 'string');

const r8 = HB.chatReply('something about nothing specific');
t('fallback', typeof r8 === 'string' && r8.length > 10);

// tone switch
const r9 = HB.chatReply('tone: flirty');
t('tone switch (no lovenote ctx)', typeof r9 === 'string');

// notes templates fill
const n = HB.firstNames();
const tpl = HB.noteTemplates['Good Morning'].Sweet[0];
t('note template has partner placeholder', tpl.indexOf('{partner}') !== -1);

// quiz score message
t('quiz score msg', HB.quizScoreMessage(92, { me: 'Him', partner: 'Her' }).indexOf('92%') !== -1);

// icons
t('icon svg', HB.icon('heart').indexOf('<svg') === 0);
t('bear svg', HB.bearSVG('mocha').indexOf('<svg') === 0);
t('bear pair svg', HB.bearPairSVG().indexOf('<svg') === 0);
t('bear avatar svg', HB.bearAvatarSVG('milk').indexOf('<svg') === 0);
t('bear mini svg', HB.bearMiniSVG().indexOf('<svg') === 0);
t('bear couple svg', HB.bearCoupleSVG().indexOf('<svg') === 0);

// date ideas filter data referenced in module uses own IDEAS (not exposed) — check module loads only
// esc
t('esc', HB.esc('<script>&"\'') === '&lt;script&gt;&amp;&quot;&#39;');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
