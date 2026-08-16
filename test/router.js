// Router regression test — clean URLs via the History API.
// Run: node test/router.js
// Verifies base detection, currentPath(), pushState navigation,
// popstate rendering, and the unknown-path → landing fallback.
const fs = require('fs');
const path = require('path');

const CORE = fs.readFileSync(path.join(__dirname, '..', 'js', 'core.js'), 'utf8');

let pass = 0, fail = 0;
function t(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.log('  ✗ ' + name); }
}

/* Load core.js with a shimmed location so the router self-configures. */
function boot(pathname) {
  const store = {};
  const pushes = [];
  const popstate = [];
  let currentPathname = pathname;

  const location = {
    get pathname() { return currentPathname; },
    get hash() { return ''; }
  };
  const history = {
    pushState: (s, t, url) => { pushes.push(url); currentPathname = url; },
    replaceState: (s, t, url) => { currentPathname = url; }
  };

  global.localStorage = {
    getItem: (k) => store[k] || null,
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; }
  };
  global.window = global;
  global.location = location;
  global.history = history;
  global.scrollTo = () => {};
  global.document = {
    getElementById: () => mainEl(),
    querySelectorAll: () => [],
    addEventListener(){}, removeEventListener(){},
    body: { appendChild(){}, className: '' }
  };
  global.addEventListener = (t, fn) => { if (t === 'popstate') popstate.push(fn); };
  global.removeEventListener = () => {};
  global.matchMedia = () => ({ matches: false });

  // re-eval core fresh so detectBase/currentPath see this scenario's pathname
  eval(CORE);
  const HB = global.HB;
  HB.state = { onboarded: true, profile: { theme: 'milk' } };
  HB.updateNav = () => {};
  return { HB, pushes, popstate, setPath: (p) => { currentPathname = p; } };
}

function mainEl() {
  return {
    innerHTML: '', className: '', childElementCount: 0, classList: { add(){}, remove(){}, toggle(){} },
    querySelector(){ return { addEventListener(){}, click(){}, classList: { add(){}, toggle(){} } }; },
    querySelectorAll(){ return []; }
  };
}

console.log('— base detection —');
t('root "/" → base ""', boot('/').HB.base === '');
t('route at root "/settings" → base ""', boot('/settings').HB.base === '');
t('GH Pages root "/Happy-Birthday" → base "/Happy-Birthday"', boot('/Happy-Birthday').HB.base === '/Happy-Birthday');
t('GH Pages root "/Happy-Birthday/" → base "/Happy-Birthday"', boot('/Happy-Birthday/').HB.base === '/Happy-Birthday');
t('GH Pages route "/Happy-Birthday/settings" → base "/Happy-Birthday"', boot('/Happy-Birthday/settings').HB.base === '/Happy-Birthday');

console.log('— currentPath —');
t('"/" → "/"', boot('/').HB.currentPath() === '/');
t('"/settings" → "/settings"', boot('/settings').HB.currentPath() === '/settings');
t('"/Happy-Birthday" → "/"', boot('/Happy-Birthday').HB.currentPath() === '/');
t('"/Happy-Birthday/settings" → "/settings"', boot('/Happy-Birthday/settings').HB.currentPath() === '/settings');

console.log('— navigate pushes clean URLs —');
{
  const { HB, pushes, setPath } = boot('/Happy-Birthday');
  HB.route('/', function (main) { main.innerHTML = 'landing'; });
  HB.route('/settings', function (main) { main.innerHTML = 'settings page'; });
  HB.navigate('/settings');
  t('pushState used with base + path', pushes.length === 1 && pushes[0] === '/Happy-Birthday/settings');
  t('pushState uses "/" for the landing route', (HB.navigate('/'), pushes[1] === '/Happy-Birthday/'));
}
{
  const { HB, pushes } = boot('/');
  HB.route('/chat', function (main) { main.innerHTML = 'chat'; });
  HB.navigate('/chat');
  t('root base navigates to "/chat"', pushes[0] === '/chat');
}

console.log('— popstate re-renders from pathname —');
{
  const { HB, popstate, setPath } = boot('/Happy-Birthday/');
  let painted = '';
  HB.route('/notes', function (main) { painted = 'notes'; });
  setPath('/Happy-Birthday/notes');   // browser back/forward moved us here
  popstate.forEach(function (fn) { fn(); });
  t('popstate paints the new route', painted === 'notes');
}

console.log('— unknown path falls back to landing "/" —');
{
  const { HB, setPath } = boot('/Happy-Birthday');
  let painted = '';
  HB.route('/', function (main) { painted = 'landing'; });
  setPath('/Happy-Birthday/nope');
  HB.navigate('/nope');
  t('unknown path renders "/"', painted === 'landing');
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
