/* ============================================================
   ADMIN INSIGHTS — private owner dashboard.
   Never linked from the public site.

   Security model (no browser-side secret):
   - The owner signs in with their real Supabase account
     (email + password) using the publishable key.
   - The owner session is kept in an isolated storage key so it
     never collides with the public app's anonymous session.
   - Insights come from the SECURITY DEFINER RPC admin_get_insights(),
     which checks auth.uid() against the owner UID stored in the
     database (admin_settings.owner_uid). Anon visitors can't even
     invoke it.
   ============================================================ */
(function () {
  'use strict';

  var SESSION_KEY = 'hb-admin-auth-token';

  function $(id) { return document.getElementById(id); }

  function fmtDate(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function statusPill(u) {
    if (u.connected) return '<span class="pill on">connected</span>';
    if (u.code) return '<span class="pill wait">waiting</span>';
    return '<span class="pill off">no code</span>';
  }

  var client = null;

  function makeClient() {
    var cfg = window.APP_CONFIG || {};
    if (!cfg.configured) return Promise.reject('NOT_CONFIGURED');

    /* Preferred: the local vendored build (js/vendor/supabase.min.js).
       Fallback: jsDelivr's pre-bundled "+esm" build. The plain "@2"
       URL ships bare import specifiers browsers can't resolve. */
    if (window.supabase && window.supabase.createClient) {
      try {
        client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true,
            storageKey: SESSION_KEY,
            storage: window.localStorage
          }
        });
        return Promise.resolve(client);
      } catch (e) { /* fall through to CDN */ }
    }
    return import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(function (mod) {
      client = mod.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: SESSION_KEY,
          storage: window.localStorage
        }
      });
      return client;
    });
  }

  var gate = $('gate');
  var dash = $('dash');
  var bootMsg = $('boot-msg');

  $('btn-signin').addEventListener('click', signIn);
  $('password').addEventListener('keydown', function (e) { if (e.key === 'Enter') signIn(); });
  $('btn-refresh').addEventListener('click', load);
  $('btn-signout').addEventListener('click', signOut);

  function showLogin(msg) {
    gate.classList.remove('hidden');
    dash.classList.add('hidden');
    $('btn-csv').classList.add('hidden');
    $('btn-refresh').classList.add('hidden');
    $('btn-signout').classList.add('hidden');
    $('gate-err').textContent = msg || '';
  }

  function showDash() {
    gate.classList.add('hidden');
    dash.classList.remove('hidden');
    $('btn-csv').classList.remove('hidden');
    $('btn-refresh').classList.remove('hidden');
    $('btn-signout').classList.remove('hidden');
  }

  function signIn() {
    var email = ($('email').value || '').trim();
    var password = $('password').value || '';
    var err = $('gate-err');
    var btn = $('btn-signin');
    if (!email || !password) { err.textContent = 'Enter your owner email and password ♡'; return; }

    if (!client) {
      makeClient().then(signIn).catch(function () {
        err.textContent = 'Couldn\'t load the database client — check your internet connection.';
      });
      return;
    }

    btn.disabled = true;
    err.textContent = '';
    client.auth.signInWithPassword({ email: email, password: password }).then(function (res) {
      btn.disabled = false;
      if (res.error) {
        err.textContent = 'Sign in failed — check your credentials.';
        return;
      }
      showDash();
      load();
    }).catch(function (e) {
      btn.disabled = false;
      err.textContent = 'Something went wrong: ' + esc(String(e.message || e));
    });
  }

  function signOut() {
    if (!client) { showLogin(''); return; }
    client.auth.signOut().then(function () {
      try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
      showLogin('');
    }).catch(function () { showLogin(''); });
  }

  function renderStats(data) {
    $('stats').innerHTML =
      '<div class="stat"><div class="num">' + esc(data.total_users) + '</div><div class="lbl">People registered</div></div>' +
      '<div class="stat"><div class="num">' + esc(data.total_couples) + '</div><div class="lbl">Connected pairs</div></div>' +
      '<div class="stat"><div class="num">' + esc((data.users || []).filter(function (u) { return u.connected; }).length) + '</div><div class="lbl">Connected users</div></div>';
  }

  function renderUsers(users) {
    window.__ADMIN_USERS = users || [];
    var rows = (users || []).map(function (u) {
      return '<tr>' +
        '<td><b>' + esc(u.name || '—') + '</b></td>' +
        '<td>' + esc(u.age || '—') + '</td>' +
        '<td class="muted">' + esc(u.code || '—') + '</td>' +
        '<td>' + esc(u.partner || '—') + '</td>' +
        '<td>' + statusPill(u) + '</td>' +
        '<td class="muted">' + fmtDate(u.joined) + '</td>' +
        '<td class="muted">' + fmtDate(u.last_active) + '</td>' +
        '</tr>';
    }).join('');
    $('users-body').innerHTML = rows || '<tr><td colspan="7" class="muted" style="text-align:center">No one has joined yet — share your pairing code ♡</td></tr>';
  }

  function renderRelationships(rels) {
    window.__ADMIN_RELS = rels || [];
    var rows = (rels || []).map(function (r) {
      var ok = r.status === 'connected';
      return '<tr>' +
        '<td><b>' + esc(r.person1 || '—') + '</b></td>' +
        '<td><b>' + esc(r.person2 || '—') + '</b></td>' +
        '<td><span class="pill' + (ok ? ' on' : ' off') + '">' + esc(r.status) + '</span></td>' +
        '<td class="muted">' + fmtDate(r.created_at) + '</td>' +
        '</tr>';
    }).join('');
    $('rels-body').innerHTML = rows || '<tr><td colspan="4" class="muted" style="text-align:center">No pairs connected yet ♡</td></tr>';
  }

  function handleDataError(msg) {
    showLogin('You\'re not signed in as the owner, or the database isn\'t ready.');
    if (window.APP_CONFIG && window.APP_CONFIG.DEBUG) console.error('[HB-admin] ' + msg);
  }

  function load() {
    if (!client) {
      makeClient().then(load).catch(function (e) {
        bootMsg.textContent = e === 'NOT_CONFIGURED'
          ? 'Supabase isn\'t configured yet — open js/config.js and add your URL + publishable key.'
          : 'Couldn\'t load the database client. Check your internet connection.';
      });
      return;
    }

    client.auth.getSession().then(function (res) {
      if (!res.data || !res.data.session) { showLogin(''); return; }

      client.rpc('admin_get_insights').then(function (rpcRes) {
        if (rpcRes.error) {
          var msg = String(rpcRes.error.message || rpcRes.error);
          if (/permission denied/i.test(msg) || /PGRST/.test(msg)) { handleDataError(msg); return; }
          bootMsg.textContent = 'Database error: ' + esc(msg);
          return;
        }
        var data = rpcRes.data;
        if (data && data.error === 'SIGN_IN_REQUIRED') { showLogin(''); return; }
        if (data && data.error === 'FORBIDDEN') {
          client.auth.signOut().then(function () {
            showLogin('This account isn\'t the owner — access denied.');
          });
          return;
        }
        bootMsg.textContent = '';
        showDash();
        renderStats(data);
        renderUsers(data.users);
        renderRelationships(data.relationships);
      }).catch(function (e) {
        bootMsg.textContent = 'Couldn\'t reach the database: ' + esc(String(e.message || e));
      });
    });
  }

  $('btn-csv').addEventListener('click', function () {
    var rows = [['Name', 'Age', 'Pairing code', 'Partner', 'Status', 'Joined', 'Last active']];
    (window.__ADMIN_USERS || []).forEach(function (u) {
      rows.push([u.name, u.age, u.code, u.partner, u.connected ? 'connected' : (u.code ? 'waiting' : 'no code'), fmtDate(u.joined), fmtDate(u.last_active)]);
    });
    var csv = rows.map(function (r) {
      return r.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'little-world-insights-' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  /* live: refresh every 20s while unlocked */
  setInterval(function () {
    if (!dash.classList.contains('hidden') && client) load();
  }, 20000);

  if (window.APP_CONFIG && window.APP_CONFIG.configured) load();
})();
