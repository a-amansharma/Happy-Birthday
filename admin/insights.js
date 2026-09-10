/* ============================================================
   SECRET LITTLE WORLD ♡ — ADMIN CONTROL CENTER
   Private owner desk. Loads everything via admin_get_full_dump()
   and renders: global KPIs, quick-insight panels, a rich couple
   grid, and a full-page per-couple detail view with tabs
   (Overview / Chats / Photos / Memories / Notes /
    Profiles & Changes / Activity & Insights).
   Non-destructive: it only reads the existing database.
   ============================================================ */
(() => {
  'use strict';

  const SESSION_KEY = 'hb-admin-auth-token';
  const OWNER_UID = 'e65fabbb-cc49-48c6-adc0-ef1d59f41896';

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root = document) => root.querySelectorAll(sel);

  /* ===== Formatting helpers ===== */
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  }

  function fmtDateOnly(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function timeAgo(iso) {
    if (!iso) return '—';
    const t = new Date(iso);
    if (isNaN(t.getTime())) return '—';
    const s = Math.max(0, Math.floor((Date.now() - t.getTime()) / 1000));
    if (s < 5) return 'just now';
    if (s < 60) return s + 's ago';
    const m = Math.floor(s / 60);
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    const d = Math.floor(h / 24);
    if (d < 31) return d + 'd ago';
    return fmtDateOnly(iso);
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function initials(name) {
    return (name || '?').trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function avatarColor(name) {
    const colors = ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#00bcd4', '#009688', '#4caf50', '#ff9800', '#ff5722', '#7b1fa2', '#d81b60'];
    let hash = 0;
    for (let i = 0; i < (name || '').length; i++) hash = ((hash << 5) - hash) + name.charCodeAt(i);
    return colors[Math.abs(hash) % colors.length];
  }

  /* ===== Supabase client ===== */
  let client = null;

  function makeClient() {
    const cfg = window.APP_CONFIG || {};
    if (!cfg.configured) return Promise.reject('NOT_CONFIGURED');

    if (window.supabase && window.supabase.createClient) {
      try {
        client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: SESSION_KEY, storage: window.localStorage }
        });
        return Promise.resolve(client);
      } catch (e) { /* fall through */ }
    }
    return import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(mod => {
      client = mod.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: SESSION_KEY, storage: window.localStorage }
      });
      return client;
    });
  }

  /* ===== State ===== */
  let allData = null;
  let derived = null;            // computed aggregates used by stats + detail
  let filteredCouples = [];
  let searchQuery = '';
  let statusFilter = '';
  let sortBy = 'newest';
  let currentDetail = null;      // { relId, tab, photoFilter, chatQuery }
  let lastFeed = 'idle';
  let resetEmail = '';         // owner email captured during OTP reset

  /* ===== DOM refs ===== */
  const gate = $('gate');
  const dash = $('dash');
  const recovery = $('recovery');
  const bootMsg = $('boot-msg');
  const toast = $('toast');
  const detail = $('detail');
  const detailTabs = $('detail-tabs');
  const detailBody = $('detail-body');
  const lightbox = $('lightbox');
  const lightboxClose = $('lightbox-close');
  const lightboxImg = $('lightbox-img');
  const lightboxCaption = $('lightbox-caption');
  const searchInput = $('search-input');
  const searchClear = $('search-clear');
  const filterStatus = $('filter-status');
  const sortBySel = $('sort-by');
  const couplesGrid = $('couples-grid');
  const couplesCount = $('couples-count');
  const emptyState = $('empty-state');
  const statsEl = $('stats');

  /* ===== Toast ===== */
  let toastTimer = null;
  function showToast(msg, kind) {
    toast.textContent = msg;
    toast.className = 'toast show' + (kind ? ' ' + kind : '');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.className = 'toast'; }, 2600);
  }

  /* ===== Clipboard ===== */
  async function copyText(text, label) {
    try {
      await navigator.clipboard.writeText(text);
      showToast((label || 'Copied') + ' — ' + text, 'ok');
    } catch (_) {
      showToast('Couldn\'t copy automatically — selected for you. Ctrl/Cmd+C', 'warn');
    }
  }

  /* ===== Auth gate ===== */
  function isRecoveryUrl() {
    return /type=recovery/.test((window.location.search || '') + (window.location.hash || ''));
  }

  function showLogin(msg) {
    gate.hidden = false;
    dash.hidden = true;
    detail.hidden = true;
    if (recovery) recovery.hidden = true;
    $('btn-csv').hidden = true;
    $('btn-refresh').hidden = true;
    $('btn-signout').hidden = true;
    setFeed('off', 'Signed out');
    $('gate-err').textContent = msg || '';
  }

  function showDash() {
    gate.hidden = true;
    dash.hidden = false;
    detail.hidden = true;
    if (recovery) recovery.hidden = true;
    $('btn-csv').hidden = false;
    $('btn-refresh').hidden = false;
    $('btn-signout').hidden = false;
  }

  function showRecovery(mode) {
    const isOtp = mode === 'otp';
    const t = $('reset-title');
    const s = $('reset-sub');
    const otpForm = $('otp-form');
    const codeForm = $('code-form');
    const newpassForm = $('newpass-form');
    gate.hidden = true;
    dash.hidden = true;
    detail.hidden = true;
    if (recovery) recovery.hidden = false;
    $('btn-csv').hidden = true;
    $('btn-refresh').hidden = true;
    $('btn-signout').hidden = true;
    setFeed('busy', 'Reset password');
    $('recovery-err').textContent = '';
    if (isOtp) {
      t.textContent = 'Reset your password';
      s.textContent = "We'll email a one-time 6-digit code to the owner account. Enter it below to set a new password.";
      otpForm.hidden = false;
      codeForm.hidden = true;
      newpassForm.hidden = true;
      const pref = ($('email').value || '').trim() || 'amanxrishi@gmail.com';
      $('otp-email').value = pref;
      setTimeout(() => { const em = $('otp-email'); em && em.focus(); }, 120);
    } else {
      t.textContent = 'Set a new password';
      s.textContent = 'You opened a password recovery link. Choose a new Admin Desk password, then sign in with it.';
      otpForm.hidden = true;
      codeForm.hidden = true;
      newpassForm.hidden = false;
      setTimeout(() => { const f = $('np1'); f && f.focus(); }, 120);
    }
  }

  function setFeed(state, text) {
    const dot = $('feed-dot');
    dot.className = 'dot ' + state;
    $('feed-text').textContent = text;
    lastFeed = text;
  }

  async function signIn() {
    const email = ($('email').value || '').trim();
    const password = $('password').value || '';
    const err = $('gate-err');
    const btn = $('btn-signin');
    if (!email || !password) { err.textContent = 'Enter your owner email and password ♡'; return; }

    if (!client) {
      try { await makeClient(); } catch { err.textContent = 'Couldn\'t load the database client — check your internet connection.'; return; }
    }

    btn.disabled = true;
    err.textContent = '';
    try {
      const { error } = await client.auth.signInWithPassword({ email, password });
      if (error) { err.textContent = 'Sign in failed — check your credentials.'; btn.disabled = false; return; }
      await load();
    } catch (e) {
      err.textContent = 'Something went wrong: ' + esc(String(e.message || e));
      btn.disabled = false;
    } finally {
      btn.disabled = false;
    }
  }

  async function signOut() {
    if (!client) { showLogin(''); return; }
    try { await client.auth.signOut(); } catch (_) {}
    try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
    showLogin('');
  }

  /* ===== Data loading ===== */
  async function load() {
    if (!client) {
      try { await makeClient(); }
      catch (e) {
        bootMsg.textContent = e === 'NOT_CONFIGURED'
          ? 'Supabase isn\'t configured yet — open js/config.js and add your URL + publishable key.'
          : 'Couldn\'t load the database client. Check your internet connection.';
        return;
      }
    }

    const { data: { session } } = await client.auth.getSession();
    if (!session) { showLogin(''); return; }

    /* Password-recovery link? Don't load the dashboard — let them set a
       new password with the recovery session first. */
    if (isRecoveryUrl()) {
      if (session && session.user) {
        showRecovery('url');
      } else {
        showLogin('Recovery link detected but no session was found — request a new one, or sign in below.');
      }
      return;
    }

    setFeed('busy', 'Syncing…');
    try {
      const { data, error } = await client.rpc('admin_get_full_dump');
      if (error) {
        const msg = String(error.message || error);
        if (/permission denied|Unauthorized|PGRST/i.test(msg)) {
          await client.auth.signOut();
          showLogin('This account isn\'t the owner — access denied.');
          return;
        }
        bootMsg.textContent = 'Database error: ' + esc(msg);
        setFeed('error', 'Sync failed');
        return;
      }
      bootMsg.textContent = '';
      allData = data;
      processData();
      renderAll();
      showDash();
      setFeed('idle', 'Live · auto-refresh 60s');
      if (currentDetail) {
        const rel = (allData.relationships || []).find(r => r.id === currentDetail.relId);
        if (rel) { openDetail(rel.id, currentDetail.tab); }
        else { currentDetail = null; }
      }
    } catch (e) {
      bootMsg.textContent = 'Couldn\'t reach the database: ' + esc(String(e.message || e));
      setFeed('error', 'Sync failed');
    }
  }

  /* ===== Processing ===== */
  function processData() {
    const rels = (allData.relationships || []).map(r => {
      const p1 = r.person1 || { id: r.creator_user_id, name: '(deleted profile)', age: null, avatar_url: '', created_at: null, last_active: null };
      const p2 = r.person2 || null;
      return { ...r, person1: p1, person2: p2 };
    });

    // Photo count for each couple = chat images + memory photos + activity
    // photos + profile avatars + couple DP.
    rels.forEach(r => {
      const chatImgs = (allData.messages || []).filter(m => m.relationship_id === r.id && m.type === 'image').length;
      const memImgs = (allData.memories || []).filter(m => m.relationship_id === r.id && m.img).length;
      const actImgs = (allData.activity || []).filter(a => a.relationship_id === r.id && a.img).length;
      const profImgs = [r.person1 && r.person1.avatar_url, r.person2 && r.person2.avatar_url, r.couple_dp_url].filter(Boolean).length;
      r.photo_count = chatImgs + memImgs + actImgs + profImgs;
    });

    allData.relationships = rels;
    filteredCouples = rels.map(r => ({ ...r }));
    applyFilters();

    // Derived aggregates
    const s = allData.stats || {};
    const images = s.images ?? 0;
    const memImgs = (allData.memories || []).filter(m => m.img).length;
    const actImgs = (allData.activity || []).filter(a => a.img).length;
    const profImgs = (allData.profiles || []).filter(p => p.avatar_url).length;
    const coupleDps = rels.filter(r => r.couple_dp_url).length;
    const totalMedia = images + memImgs + actImgs + profImgs + coupleDps;

    derived = {
      totalUsers: s.total_users ?? 0,
      totalCouples: rels.length,
      connected: (s.connected ?? rels.filter(r => r.status === 'connected').length),
      waiting: (s.waiting ?? rels.filter(r => r.status === 'waiting').length),
      messages: s.messages ?? 0,
      images,
      totalMedia,
      memImgs,
      actImgs,
      profImgs,
      coupleDps,
      memories: s.memories ?? 0,
      notes: s.notes ?? 0,
      activity: s.activity ?? 0,
      quizDays: s.quiz_days ?? 0,
      quizzesCompleted: s.quizzes_completed ?? 0
    };

    allData.derived = derived;
  }

  function applyFilters() {
    let list = [...allData.relationships || []];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(r => {
        const p1 = r.person1?.name || '';
        const p2 = r.person2?.name || '';
        const code = r.pairing_code || '';
        return p1.toLowerCase().includes(q) || p2.toLowerCase().includes(q) ||
          code.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q);
      });
    }

    if (statusFilter) list = list.filter(r => r.status === statusFilter);

    const num = (r, v) => {
      const n = Number(v);
      return isNaN(n) ? 0 : n;
    };
    switch (sortBy) {
      case 'oldest': list.sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)); break;
      case 'name': list.sort((a, b) => (a.person1?.name || '').localeCompare(b.person1?.name || '')); break;
      case 'last-active': list.sort((a, b) => new Date(b.last_active || 0) - new Date(a.last_active || 0)); break;
      case 'msgs': list.sort((a, b) => num(b, a.msg_count) - num(a, a.msg_count)); break;
      case 'photos': list.sort((a, b) => num(b, a.photo_count) - num(a, a.photo_count)); break;
      default: list.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    }

    filteredCouples = list;
  }

  /* ===== Avatar helpers ===== */
  function avatarHtml(person, size, name) {
    const nm = (person && person.name) || name || '?';
    if (person && person.avatar_url) {
      return `<img class="av" style="width:${size}px;height:${size}px" src="${esc(person.avatar_url)}" alt="${esc(nm)}" />`;
    }
    return `<span class="av av-fallback" style="width:${size}px;height:${size}px;background:${avatarColor(nm)};font-size:${Math.round(size * 0.38)}px">${esc(initials(nm))}</span>`;
  }

  /* ===== Rendering: top-level ===== */
  function renderAll() {
    renderStats();
    renderPanels();
    renderCouplesGrid();
    renderSearchClear();
    $('generated-at').textContent = allData && allData.generated_at ? fmtDate(allData.generated_at) : '—';
    $('snapshot-scale').textContent = (allData.relationships || []).length + ' couples';
  }

  function statCard(icon, num, label, accent) {
    return `
      <div class="stat">
        <div class="stat-icon">${icon}</div>
        <div class="stat-main">
          <div class="num ${accent || ''}">${num}</div>
          <div class="lbl">${label}</div>
        </div>
      </div>
    `;
  }

  function renderStats() {
    const d = derived || {};
    const rels = allData.relationships || [];
    statsEl.innerHTML =
      statCard('💑', d.totalCouples ?? rels.length, 'Total couples', 'accent') +
      statCard('💚', d.connected ?? 0, 'Connected') +
      statCard('⏳', d.waiting ?? 0, 'Waiting', 'warn') +
      statCard('👤', d.totalUsers ?? 0, 'Registered people') +
      statCard('💬', d.messages ?? 0, 'Messages') +
      statCard('🖼️', d.totalMedia ?? 0, 'Photos & media', 'accent') +
      statCard('📸', d.memories ?? 0, 'Saved memories') +
      statCard('💌', d.notes ?? 0, 'Love notes') +
      statCard('📜', d.activity ?? 0, 'Activity events') +
      statCard('📝', d.quizDays ?? 0, 'Quiz days') +
      statCard('🏆', d.quizzesCompleted ?? 0, 'Quizzes completed') ;
  }

  function renderPanels() {
    const rels = (allData.relationships || []).filter(r => r.person1 && r.person1.name);
    const nameOf = (r) => (r.person1?.name || '—') + (r.person2 ? ' & ' + r.person2.name : '');

    const newest = rels.length ? rels.reduce((a, b) => new Date(a.created_at || 0) >= new Date(b.created_at || 0) ? a : b) : null;
    const busiest = rels.length ? rels.reduce((a, b) => (b.msg_count || 0) > (a.msg_count || 0) ? b : a) : null;
    const mostPhotos = rels.length ? rels.reduce((a, b) => (b.photo_count || 0) > (a.photo_count || 0) ? b : a) : null;
    const mostMems = rels.length ? rels.reduce((a, b) => (b.mem_count || 0) > (a.mem_count || 0) ? b : a) : null;

    const panel = (elId, rel, sub) => {
      const body = $('panel-' + elId + '-body');
      if (!rel) { body.innerHTML = '<span class="muted">No couples yet ♡</span>'; return; }
      body.innerHTML = `
        <div class="panel-row">
          <div class="panel-avs">${avatarHtml(rel.person1, 34, '')}${rel.person2 ? avatarHtml(rel.person2, 34, '') : ''}</div>
          <div class="panel-col">
            <strong>${esc(nameOf(rel))}</strong>
            <span class="muted">${sub}</span>
          </div>
          <button class="btn ghost sm" data-panel-open="${esc(rel.id)}">View →</button>
        </div>`;
      body.querySelector('[data-panel-open]').addEventListener('click', (e) => {
        e.stopPropagation();
        openDetail(rel.id);
      });
    };

    panel('newest', newest, 'Registered ' + timeAgo(newest && newest.created_at));
    panel('busiest', busiest, (busiest && busiest.msg_count) + ' messages · ' + (busiest && busiest.img_count) + ' images');
    panel('mostphotos', mostPhotos, (mostPhotos && mostPhotos.photo_count) + ' photos & media');
    panel('mostmems', mostMems, (mostMems && mostMems.mem_count) + ' memories');
  }

  function renderCouplesGrid() {
    couplesCount.textContent = filteredCouples.length;
    if (filteredCouples.length === 0) {
      couplesGrid.innerHTML = '';
      emptyState.hidden = false;
      return;
    }
    emptyState.hidden = true;
    couplesGrid.innerHTML = filteredCouples.map(r => coupleCardHtml(r)).join('');
  }

  function coupleCardHtml(r) {
    const p1 = r.person1 || {};
    const p2 = r.person2;
    const connected = r.status === 'connected';
    const ages = [p1.age, p2 && p2.age].filter(a => a != null && a !== '');
    const ageStr = ages.length
      ? '· ' + ages.map(a => esc(a) + ' yrs').join(' & ')
      : '';
    const p2Name = p2 ? (p2.name || '—') : 'Waiting for partner…';
    const p2Err = !p2;
    const codeChip = r.pairing_code
      ? `<button class="mono-chip cc-code" data-code="${esc(r.pairing_code)}" title="Copy pairing code">🔑 ${esc(r.pairing_code)}</button>`
      : `<span class="mono-chip muted-chip">paired & locked</span>`;

    return `
      <article class="couple-card" tabindex="0" data-rel-id="${esc(r.id)}" role="button" aria-label="View ${esc(p1.name || 'Person 1')}${p2 ? ' & ' + esc(p2.name) : ''}">
        ${r.couple_dp_url ? `<div class="cc-cover" style="background-image:url(${esc(r.couple_dp_url)})"></div>` : ''}
        <div class="cc-top">
          <div class="cc-avs">
            ${avatarHtml(p1, 52, '')}
            ${p2 ? avatarHtml(p2, 52, '') : `<span class="av av-waiting" style="width:52px;height:52px;font-size:20px">💞</span>`}
          </div>
          <span class="pill ${connected ? 'connected' : 'waiting'}">${connected ? '💚 Connected' : '⏳ Waiting'}</span>
        </div>
        <h3 class="cc-names">
          <span class="p1">${esc(p1.name || '—')}</span>
          <span class="sep">♡</span>
          <span class="p2 ${p2Err ? 'err' : ''}">${esc(p2Name)}</span>
        </h3>
        <div class="cc-sub">${esc(p1.name || '—')} ${ageStr}${p2 ? ' & ' + esc(p2.name || '—') : ''}</div>
        <div class="cc-chips">
          ${codeChip}
          <span class="mono-chip">${esc(r.relationship_type || '🔗 relationship')}</span>
        </div>
        <div class="cc-meta">
          <span title="Messages">💬 ${r.msg_count ?? 0}</span>
          <span title="Photos & media">🖼️ ${r.photo_count ?? 0}</span>
          <span title="Memories">📸 ${r.mem_count ?? 0}</span>
          <span title="Love notes">💌 ${r.note_count ?? 0}</span>
        </div>
        <div class="cc-dates">
          <span title="Registered">📅 ${fmtDateOnly(r.created_at)}</span>
          ${r.connected_at ? `<span title="Connected">💚 ${fmtDateOnly(r.connected_at)}</span>` : ''}
          <span title="Last active">⚡ ${timeAgo(r.last_active)}</span>
        </div>
      </article>
    `;
  }

  function renderSearchClear() {
    searchClear.classList.toggle('visible', searchInput.value.length > 0);
  }

  /* ===== Detail view ===== */
  const TABS = [
    { id: 'overview', label: 'Overview', icon: '📋' },
    { id: 'chats', label: 'Chats', icon: '💬' },
    { id: 'photos', label: 'Photos', icon: '🖼️' },
    { id: 'memories', label: 'Memories', icon: '📸' },
    { id: 'notes', label: 'Love Notes', icon: '💌' },
    { id: 'profiles', label: 'Profiles & Changes', icon: '👥' },
    { id: 'activity', label: 'Activity & Insights', icon: '📈' }
  ];

  function openDetail(relId, tab) {
    const rel = (allData.relationships || []).find(r => r.id === relId);
    if (!rel) return;

    if (!currentDetail || currentDetail.relId !== relId) {
      currentDetail = { relId, tab: tab || 'overview', photoFilter: 'all', chatQuery: '' };
    } else if (tab) {
      currentDetail.tab = tab;
    }

    renderDetailHead(rel);
    renderDetailTabs();
    renderDetailTab(currentDetail.tab);
    detail.hidden = false;
    document.body.classList.add('no-scroll');
    setTimeout(() => detailBody.scrollTop = 0, 10);
    $('detail-back').focus();
  }

  function closeDetail() {
    detail.hidden = true;
    document.body.classList.remove('no-scroll');
    currentDetail = null;
  }

  function renderDetailHead(rel) {
    const p1 = rel.person1 || {};
    const p2 = rel.person2;
    const name = p2 ? `${p1.name || '—'} & ${p2.name || '—'}` : (p1.name || 'Unknown couple');

    $('detail-name').textContent = name;

    const statusBadge = $('detail-status');
    statusBadge.textContent = rel.status === 'connected' ? '💚 Connected' : '⏳ Waiting';
    statusBadge.className = 'badge ' + (rel.status === 'connected' ? 'connected' : 'waiting');

    $('detail-code').textContent = rel.pairing_code ? ('🔑 ' + rel.pairing_code) : 'paired';
    $('detail-code').classList.toggle('muted-chip', !rel.pairing_code);
    $('detail-id').textContent = 'ID ' + rel.id.slice(0, 8);

    $('detail-avatars').innerHTML = avatarHtml(p1, 56, '') + (p2 ? avatarHtml(p2, 56, '') : `<span class="av av-waiting" style="width:56px;height:56px;font-size:20px">💞</span>`);

    $('detail-meta').innerHTML = `
      <span>📅 Registered ${fmtDate(rel.created_at)}</span>
      ${rel.connected_at ? `<span>💚 Connected ${fmtDate(rel.connected_at)}</span>` : ''}
      <span>⚡ Last active ${timeAgo(rel.last_active)}</span>
    `;

    const copyBtn = $('btn-copy-code');
    copyBtn.disabled = !rel.pairing_code;
    copyBtn.textContent = rel.pairing_code ? 'Copy code' : 'Pairing done';
  }

  function renderDetailTabs() {
    detailTabs.innerHTML = TABS.map(t => `
      <button class="detail-tab" role="tab" aria-selected="${t.id === currentDetail.tab}" data-tab="${t.id}" aria-controls="panel-${t.id}">
        <span>${t.icon}</span> ${t.label}
      </button>
    `).join('');
    $$('.detail-tab', detailTabs).forEach(btn => {
      btn.addEventListener('click', () => switchDetailTab(btn.dataset.tab));
    });
  }

  function switchDetailTab(tab) {
    if (!currentDetail) return;
    currentDetail.tab = tab;
    $$('.detail-tab', detailTabs).forEach(b => b.setAttribute('aria-selected', b.dataset.tab === tab));
    renderDetailTab(tab);
    detailBody.scrollTop = 0;
  }

  function renderDetailTab(tab) {
    const rel = (allData.relationships || []).find(r => r.id === currentDetail.relId);
    if (!rel) return;

    switch (tab) {
      case 'overview': detailBody.innerHTML = renderOverviewTab(rel); break;
      case 'chats': detailBody.innerHTML = renderChatsTab(rel); bindChatSearch(); break;
      case 'photos': detailBody.innerHTML = renderPhotosTab(rel); bindPhotoFilters(); break;
      case 'memories': detailBody.innerHTML = renderMemoriesTab(rel); break;
      case 'notes': detailBody.innerHTML = renderNotesTab(rel); break;
      case 'profiles': detailBody.innerHTML = renderProfilesTab(rel); break;
      case 'activity': detailBody.innerHTML = renderActivityTab(rel); break;
    }

    $$('.img-thumb, .activity-img, .cc-cover-lightbox', detailBody).forEach(img => {
      img.addEventListener('click', e => {
        e.stopPropagation();
        openLightbox(img.currentSrc || img.src, img.alt || '');
      });
    });
    $$('.photo-item', detailBody).forEach(fig => {
      fig.addEventListener('click', () => {
        const img = fig.querySelector('img');
        if (img) openLightbox(img.currentSrc || img.src, img.alt || '');
      });
    });

    bindCopyCodeButtons();
  }

  function bindCopyCodeButtons() {
    $$('[data-copy-code]', detailBody).forEach(el => {
      el.addEventListener('click', () => copyText(el.dataset.copyCode, 'Pairing code copied'));
    });
  }

  /* ---- Overview ---- */
  function renderOverviewTab(rel) {
    const p1 = rel.person1 || {};
    const p2 = rel.person2;
    const chips = (arr) => Array.isArray(arr) ? arr.map(v => `<span class="tag">${esc(v)}</span>`).join('') : '';

    const fields = [
      { label: 'Status', value: rel.status === 'connected' ? '💚 Connected' : '⏳ Waiting for partner' },
      { label: 'Pairing code', value: rel.pairing_code || 'Claimed — pairing complete' },
      { label: 'Relationship type', value: rel.relationship_type || '—' },
      { label: 'Together since', value: rel.together_since ? fmtDateOnly(rel.together_since) : '—' },
      { label: 'Theme', value: rel.theme || 'milk' },
      { label: 'Created (registered)', value: fmtDate(rel.created_at) },
      { label: 'Connected', value: rel.connected_at ? fmtDate(rel.connected_at) : '—' },
      { label: 'Completed', value: rel.completed_at ? fmtDate(rel.completed_at) : '—' },
      { label: 'Last active (couple)', value: rel.last_active ? fmtDate(rel.last_active) + ' (' + timeAgo(rel.last_active) + ')' : '—' },
      { label: 'Messages', value: rel.msg_count ?? 0 },
      { label: 'Chat photos', value: rel.img_count ?? 0 },
      { label: 'All photos & media', value: rel.photo_count ?? 0 },
      { label: 'Memories', value: rel.mem_count ?? 0 },
      { label: 'Love notes', value: rel.note_count ?? 0 },
      { label: 'Quizzes done', value: rel.quiz_done ?? 0 }
    ];

    return `
      <div class="ov-grid">
        <div class="ov-col">
          <div class="card">
            <h3 class="card-title">👥 Participants</h3>
            <div class="person-cards">
              ${personCard('Creator · Person 1', p1)}
              ${p2 ? personCard('Partner · Person 2', p2) : waitingCard()}
            </div>
          </div>
          <div class="card">
            <h3 class="card-title">💞 Pairing information</h3>
            <div class="kv-list">
              ${fields.slice(0, 7).map(f => `<div class="kv"><span class="k">${esc(f.label)}</span><span class="v">${esc(f.value)}</span></div>`).join('')}
              ${rel.pairing_code ? `<div class="kv"><span class="k">Copy code</span><span class="v"><button class="btn ghost sm" data-copy-code="${esc(rel.pairing_code)}">📋 Copy</button></span></div>` : ''}
            </div>
          </div>
        </div>

        <div class="ov-col">
          <div class="card">
            <h3 class="card-title">📊 Couple stats</h3>
            <div class="kv-list">
              ${fields.slice(7).map(f => `<div class="kv"><span class="k">${esc(f.label)}</span><span class="v">${esc(f.value)}</span></div>`).join('')}
            </div>
          </div>
          <div class="card">
            <h3 class="card-title">🎨 Their little world</h3>
            <div class="kv-list">
              <div class="kv"><span class="k">Theme</span><span class="v">${esc(rel.theme || 'milk')}</span></div>
              <div class="kv"><span class="k">Vibes</span><span class="v">${chips(rel.vibes) || '<span class="muted">—</span>'}</span></div>
              <div class="kv"><span class="k">Chat style</span><span class="v">${chips(rel.chat_style) || '<span class="muted">—</span>'}</span></div>
              <div class="kv"><span class="k">Story</span><span class="v">${esc(rel.story) || '<span class="muted">—</span>'}</span></div>
            </div>
          </div>
          ${rel.couple_dp_url ? `
          <div class="card">
            <h3 class="card-title">🖼️ Couple photo</h3>
            <img src="${esc(rel.couple_dp_url)}" alt="Couple photo" class="img-thumb big" />
          </div>` : ''}
        </div>
      </div>
    `;
  }

  function personCard(role, person) {
    return `
      <div class="person-card">
        <div class="person-av">${avatarHtml(person, 64, '')}</div>
        <div class="person-info">
          <div class="person-role">${esc(role)}</div>
          <div class="person-name">${esc(person.name || '—')}</div>
          ${person.age != null ? `<div class="person-age">🎂 ${esc(person.age)} years</div>` : ''}
          ${person.avatar_url ? '<div class="person-hasdp">📷 Has a profile photo</div>' : '<div class="person-hasdp muted">📷 No profile photo</div>'}
          <div class="person-meta">Joined ${fmtDate(person.created_at)}</div>
          <div class="person-meta">Last active ${timeAgo(person.last_active)}</div>
        </div>
      </div>
    `;
  }

  function waitingCard() {
    return `
      <div class="person-card waiting">
        <div class="person-av"><span class="av av-waiting" style="width:64px;height:64px;font-size:24px">💞</span></div>
        <div class="person-info">
          <div class="person-role">Partner · Person 2</div>
          <div class="person-name">Waiting for a partner</div>
          <div class="person-age">Creator's hint: ${esc(currentRelHint() || '—')}</div>
          <div class="person-meta">The code is still open — no one has joined yet</div>
        </div>
      </div>
    `;
  }

  function currentRelHint() {
    const rel = (allData.relationships || []).find(r => r.id === currentDetail.relId);
    return rel ? (rel.partner_hint_name || '') : '';
  }

  /* ---- Chats ---- */
  function renderChatsTab(rel) {
    const msgs = (allData.messages || [])
      .filter(m => m.relationship_id === rel.id)
      .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));

    const q = (currentDetail.chatQuery || '').toLowerCase();
    const shown = q ? msgs.filter(m =>
      (m.message || '').toLowerCase().includes(q) ||
      (m.sender_name || '').toLowerCase().includes(q) ||
      fmtDate(m.created_at).toLowerCase().includes(q)
    ) : msgs;

    if (msgs.length === 0) {
      return `<div class="section-head"><h3>💬 Chats</h3><span class="section-count">0 messages</span></div><p class="muted center-pad">No conversations yet ♡</p>`;
    }

    const p1Id = rel.person1 && rel.person1.id;
    const p2Id = rel.person2 && rel.person2.id;

    const bubbles = shown.map(m => {
      const side = m.sender_user_id === p1Id ? 'left' : 'right';
      const receipt = m.seen_at ? '✓✓ seen' : (m.delivered_at ? '✓ delivered' : '· sent');
      return `
        <div class="bubble-row ${side}">
          <div class="bubble-meta">${esc(m.sender_name || 'Unknown')} · ${fmtDate(m.created_at)}</div>
          <div class="bubble ${m.type === 'image' ? 'bubble-img' : 'bubble-text'}">
            ${m.type === 'image'
              ? `<img src="${esc(m.media_path)}" alt="Chat image" class="img-thumb chat-img" />`
              : `<span class="bubble-message">${esc(m.message)}</span>`}
            <span class="bubble-receipt">${receipt}</span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="section-head"><h3>💬 Chats</h3>
        <span class="section-count">${msgs.length} messages · ${shown.length} shown</span>
      </div>
      <div class="card chat-card">
        <div class="chat-toolbar">
          <input type="search" id="chat-search" class="input search-flat" placeholder="Search in this chat (text, name, date)…" value="${esc(currentDetail.chatQuery || '')}" autocomplete="off" />
          <span class="muted">Sorted oldest → newest</span>
        </div>
        <div class="chat-stream">
          ${bubbles || '<p class="muted center-pad">No messages match your search ♡</p>'}
        </div>
      </div>
    `;
  }

  function bindChatSearch() {
    const el = $('chat-search');
    if (!el) return;
    el.addEventListener('input', () => {
      currentDetail.chatQuery = el.value;
      renderDetailTab('chats');
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    });
  }

  /* ---- Photos ---- */
  function buildCoupleMedia(rel) {
    const items = [];
    const p1 = rel.person1 || {};
    const p2 = rel.person2;

    if (rel.couple_dp_url) items.push({ kind: 'profiles', src: rel.couple_dp_url, label: 'Couple photo', by: 'Shared DP', at: rel.updated_at || null });
    if (p1 && p1.avatar_url) items.push({ kind: 'profiles', src: p1.avatar_url, label: p1.name + ' profile photo', by: p1.name, at: null });
    if (p2 && p2.avatar_url) items.push({ kind: 'profiles', src: p2.avatar_url, label: p2.name + ' profile photo', by: p2.name, at: null });

    (allData.messages || [])
      .filter(m => m.relationship_id === rel.id && m.type === 'image')
      .forEach(m => items.push({ kind: 'chats', src: m.media_path, label: 'Chat image', by: m.sender_name || 'Unknown', at: m.created_at }));

    (allData.memories || [])
      .filter(mem => mem.relationship_id === rel.id && mem.img)
      .forEach(mem => items.push({ kind: 'memories', src: mem.img, label: 'Memory: ' + (mem.title || 'untitled'), by: mem.owner_name || 'Unknown', at: mem.created_at }));

    (allData.activity || [])
      .filter(a => a.relationship_id === rel.id && a.img)
      .forEach(a => items.push({ kind: 'activity', src: a.img, label: 'Activity photo', by: a.actor || 'Unknown', at: a.created_at }));

    return items;
  }

  function renderPhotosTab(rel) {
    const all = buildCoupleMedia(rel);
    const filter = currentDetail.photoFilter || 'all';
    const shown = filter === 'all' ? all : all.filter(i => i.kind === filter);

    const filters = [
      { id: 'all', label: 'All' },
      { id: 'chats', label: 'Chats' },
      { id: 'memories', label: 'Memories' },
      { id: 'activity', label: 'Activity' },
      { id: 'profiles', label: 'Profiles' }
    ];

    if (all.length === 0) {
      return `<div class="section-head"><h3>🖼️ All photos & media</h3><span class="section-count">0 items</span></div><p class="muted center-pad">This couple hasn't uploaded any photos yet ♡</p>`;
    }

    return `
      <div class="section-head"><h3>🖼️ All photos & media</h3>
        <span class="section-count">${all.length} items · ${shown.length} shown</span>
      </div>
      <div class="chip-row">
        ${filters.map(f => `<button class="chip ${f.id === filter ? 'on' : ''}" data-photo-filter="${f.id}">${esc(f.label)}</button>`).join('')}
      </div>
      <div class="photo-grid">
        ${shown.map(i => `
          <figure class="photo-item" data-kind="${esc(i.kind)}">
            <img src="${esc(i.src)}" alt="${esc(i.label)}" loading="lazy" />
            <figcaption>
              <span class="photo-kind">${photoKindLabel(i.kind)}</span>
              <span class="photo-label">${esc(i.label)}</span>
              <span class="photo-by">${esc(i.by)}${i.at ? ' · ' + fmtDate(i.at) : ''}</span>
            </figcaption>
          </figure>
        `).join('') || '<p class="muted center-pad">No photos in this category ♡</p>'}
      </div>
    `;
  }

  function photoKindLabel(kind) {
    return { chats: '💬 Chat', memories: '📸 Memory', activity: '📜 Activity', profiles: '👤 Profile' }[kind] || kind;
  }

  function bindPhotoFilters() {
    $$('[data-photo-filter]', detailBody).forEach(btn => {
      btn.addEventListener('click', () => {
        currentDetail.photoFilter = btn.dataset.photoFilter;
        renderDetailTab('photos');
      });
    });
  }

  /* ---- Memories ---- */
  function renderMemoriesTab(rel) {
    const mems = (allData.memories || [])
      .filter(m => m.relationship_id === rel.id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (mems.length === 0) {
      return `<div class="section-head"><h3>📸 Memories</h3><span class="section-count">0 memories</span></div><p class="muted center-pad">No saved memories yet ♡</p>`;
    }

    return `
      <div class="section-head"><h3>📸 Saved memories</h3><span class="section-count">${mems.length} memories</span></div>
      <div class="mems-grid">
        ${mems.map(m => `
          <div class="card mem-card">
            ${m.img ? `<img src="${esc(m.img)}" alt="Memory photo" class="img-thumb mem-img" />` : ''}
            <div class="mem-info">
              <div class="mem-title">${m.favorite ? '⭐ ' : ''}${esc(m.title || 'Untitled memory')}</div>
              ${m.date ? `<div class="mem-meta">🗓 ${esc(m.date)}</div>` : ''}
              ${m.location ? `<div class="mem-meta">📍 ${esc(m.location)}</div>` : ''}
              ${m.description ? `<div class="mem-desc">${esc(m.description)}</div>` : ''}
              <div class="mem-meta muted">By ${esc(m.owner_name || '—')} · added ${fmtDate(m.created_at)}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  /* ---- Notes ---- */
  function renderNotesTab(rel) {
    const notes = (allData.notes || [])
      .filter(n => n.relationship_id === rel.id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    if (notes.length === 0) {
      return `<div class="section-head"><h3>💌 Love notes</h3><span class="section-count">0 notes</span></div><p class="muted center-pad">No love notes yet ♡</p>`;
    }

    return `
      <div class="section-head"><h3>💌 Love notes</h3><span class="section-count">${notes.length} notes</span></div>
      <div class="table-wrap">
        <table class="data-table">
          <thead><tr><th>Time</th><th>By</th><th>Type</th><th>Tone</th><th>Title</th><th>Text</th></tr></thead>
          <tbody>
            ${notes.map(n => `
              <tr>
                <td class="muted">${fmtDate(n.created_at)}</td>
                <td class="name-cell">${esc(n.creator_name || '—')}</td>
                <td><span class="tag">${esc(n.type)}</span></td>
                <td><span class="tag">${esc(n.tone)}</span></td>
                <td>${esc(n.title)}</td>
                <td class="wrap-cell">${esc(n.text)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---- Profiles & Changes ---- */
  function renderProfilesTab(rel) {
    const p1 = rel.person1 || {};
    const p2 = rel.person2;
    const changes = (allData.activity || [])
      .filter(a => a.relationship_id === rel.id && ['name', 'age', 'photo', 'photo_off', 'theme', 'relationship', 'connect'].includes(a.kind))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const kindIcons = { name: '✏️', age: '🎂', photo: '📷', photo_off: '🚫', theme: '🎨', relationship: '📝', connect: '💚' };

    return `
      <div class="section-head"><h3>👥 Profiles</h3><span class="section-count">${p2 ? 2 : 1} participants</span></div>
      <div class="ov-grid">
        <div class="card">
          <h3 class="card-title">Current profile information</h3>
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>Role</th><th>Name</th><th>Age</th><th>Profile photo</th><th>Joined</th><th>Last active</th></tr></thead>
              <tbody>
                ${personRow('Creator · Person 1', p1)}
                ${p2 ? personRow('Partner · Person 2', p2) : '<tr class="empty-row"><td colspan="6">No partner yet — waiting for someone to join with the code</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:16px;">
        <h3 class="card-title">🕓 Profile & relationship history <span class="section-count">${changes.length} events</span></h3>
        ${changes.length === 0
          ? '<p class="muted center-pad">No recorded changes yet ♡</p>'
          : `
            <div class="activity-list">
              ${changes.map(a => `
                <div class="activity-item">
                  <div class="activity-avatar" style="background:${avatarColor(a.actor)}">${esc(initials(a.actor))}</div>
                  <div class="activity-content">
                    <div class="activity-actor">${esc(a.actor)} ${esc(kindIcons[a.kind] || '')}</div>
                    <div class="activity-msg">${esc(a.msg)}</div>
                    <div class="activity-time">${fmtDate(a.created_at)}</div>
                  </div>
                  ${a.img ? `<img src="${esc(a.img)}" alt="Change photo" class="activity-img" />` : ''}
                </div>
              `).join('')}
            </div>`
        }
      </div>
    `;
  }

  function personRow(role, person) {
    return `
      <tr>
        <td>${esc(role)}</td>
        <td class="name-cell">${esc(person.name || '—')}</td>
        <td>${esc(person.age ?? '—')}</td>
        <td>${person.avatar_url ? `<img src="${esc(person.avatar_url)}" alt="" class="img-thumb" />` : '<span class="muted">—</span>'}</td>
        <td class="muted">${fmtDate(person.created_at)}</td>
        <td class="muted">${timeAgo(person.last_active)}</td>
      </tr>`;
  }

  /* ---- Activity & Insights ---- */
  function renderActivityTab(rel) {
    const acts = (allData.activity || [])
      .filter(a => a.relationship_id === rel.id)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const kindIcons = { theme: '🎨', name: '✏️', age: '🎂', photo: '📷', photo_off: '🚫', connect: '💚', relationship: '📝' };

    const insights = [
      { k: 'Days since created', v: daysBetween(rel.created_at) },
      { k: 'Days since connected', v: rel.connected_at ? daysBetween(rel.connected_at) : '—' },
      { k: 'Chat activity (msgs/day)', v: avg(rel.msg_count, rel.created_at) },
      { k: 'Photos & media', v: rel.photo_count ?? 0 },
      { k: 'Memory count', v: rel.mem_count ?? 0 },
      { k: 'Love note count', v: rel.note_count ?? 0 },
      { k: 'Quizzes completed', v: rel.quiz_done ?? 0 }
    ];

    const quizDays = (allData.quizzes || [])
      .filter(q => q.relationship_id === rel.id)
      .sort((a, b) => new Date(b.quiz_date || 0) - new Date(a.quiz_date || 0));

    return `
      <div class="ov-grid">
        <div class="ov-col">
          <div class="card">
            <h3 class="card-title">📈 Couple insights</h3>
            <div class="kv-list">
              ${insights.map(i => `<div class="kv"><span class="k">${esc(i.k)}</span><span class="v">${esc(i.v)}</span></div>`).join('')}
            </div>
          </div>
          <div class="card" style="margin-top:16px;">
            <h3 class="card-title">📝 Quiz history <span class="section-count">${quizDays.length} days</span></h3>
            ${quizDays.map(q => `
              <div class="quiz-item">
                <div class="quiz-head">
                  <span class="quiz-date">${fmtDateOnly(q.quiz_date)}</span>
                  <span class="quiz-result ${q.completed ? 'completed' : 'pending'}">
                    ${q.completed ? `${q.result_pct}% match (${q.result_matches}/${q.result_total})` : 'Waiting for both answers'}
                  </span>
                </div>
                <div class="quiz-answers">
                  ${(q.answers || []).map(a => `
                    <div class="quiz-answer">
                      <strong>${esc(a.name || '—')}</strong>
                      <div class="ans">${Object.entries(a.answers || {}).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join('\n') || '—'}</div>
                    </div>
                  `).join('') || '<div class="quiz-answer"><strong>—</strong><div class="ans">No answers yet</div></div>'}
                </div>
              </div>
            `).join('') || '<p class="muted center-pad">No quiz days yet ♡</p>'}
          </div>
        </div>

        <div class="ov-col">
          <div class="card">
            <h3 class="card-title">📜 Full activity journal <span class="section-count">${acts.length} events</span></h3>
            ${acts.length === 0
              ? '<p class="muted center-pad">No activity recorded yet ♡</p>'
              : `
                <div class="activity-list tall">
                  ${acts.map(a => `
                    <div class="activity-item">
                      <div class="activity-avatar" style="background:${avatarColor(a.actor)}">${esc(initials(a.actor))}</div>
                      <div class="activity-content">
                        <div class="activity-actor">${esc(a.actor)} ${esc(kindIcons[a.kind] || '')}</div>
                        <div class="activity-msg">${esc(a.msg)}</div>
                        <div class="activity-time">${fmtDate(a.created_at)}</div>
                      </div>
                      ${a.img ? `<img src="${esc(a.img)}" alt="Activity photo" class="activity-img" />` : ''}
                    </div>
                  `).join('')}
                </div>`
            }
          </div>
        </div>
      </div>
    `;
  }

  function daysBetween(iso) {
    if (!iso) return '—';
    const d = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    return d < 1 ? 'today' : d + ' days';
  }

  function avg(count, iso) {
    if (!iso || !count) return count || 0;
    const d = Math.max(1, (Date.now() - new Date(iso).getTime()) / 86400000);
    return (count / d).toFixed(1);
  }

  /* ===== Lightbox ===== */
  function openLightbox(src, caption) {
    lightboxImg.src = src;
    lightboxCaption.textContent = caption || '';
    lightbox.hidden = false;
    document.body.classList.add('no-scroll');
    lightboxClose.focus();
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImg.src = '';
    document.body.classList.remove('no-scroll');
  }

  /* ===== CSV exports ===== */
  function csvEscape(v) {
    return '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  }

  function triggerDownload(filename, rows) {
    const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }));
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function exportAllCSV() {
    if (!allData) return;
    const d = derived || {};
    const rows = [
      ['SECTION', 'FIELD', 'VALUE']
    ];
    rows.push(['GLOBAL SUMMARY', 'Generated at', allData.generated_at]);
    rows.push(['GLOBAL SUMMARY', 'Total couples', d.totalCouples]);
    rows.push(['GLOBAL SUMMARY', 'Connected', d.connected]);
    rows.push(['GLOBAL SUMMARY', 'Waiting', d.waiting]);
    rows.push(['GLOBAL SUMMARY', 'Registered people', d.totalUsers]);
    rows.push(['GLOBAL SUMMARY', 'Messages', d.messages]);
    rows.push(['GLOBAL SUMMARY', 'Photos & media', d.totalMedia]);
    rows.push(['GLOBAL SUMMARY', 'Memories', d.memories]);
    rows.push(['GLOBAL SUMMARY', 'Love notes', d.notes]);
    rows.push(['GLOBAL SUMMARY', 'Activity events', d.activity]);
    rows.push(['GLOBAL SUMMARY', 'Quiz days', d.quizDays]);
    rows.push(['GLOBAL SUMMARY', 'Quizzes completed', d.quizzesCompleted]);
    rows.push(['', '', '']);

    filteredCouples.forEach(r => {
      const p1 = r.person1 || {};
      const p2 = r.person2 || {};
      rows.push(['COUPLE', 'id', r.id]);
      rows.push(['COUPLE', 'status', r.status]);
      rows.push(['COUPLE', 'pairing_code', r.pairing_code || '']);
      rows.push(['COUPLE', 'person1', p1.name || '']);
      rows.push(['COUPLE', 'person1_age', p1.age ?? '']);
      rows.push(['COUPLE', 'person2', p2.name || '']);
      rows.push(['COUPLE', 'person2_age', p2.age ?? '']);
      rows.push(['COUPLE', 'relationship_type', r.relationship_type || '']);
      rows.push(['COUPLE', 'together_since', r.together_since || '']);
      rows.push(['COUPLE', 'theme', r.theme || '']);
      rows.push(['COUPLE', 'created_at', r.created_at || '']);
      rows.push(['COUPLE', 'connected_at', r.connected_at || '']);
      rows.push(['COUPLE', 'last_active', r.last_active || '']);
      rows.push(['COUPLE', 'messages', r.msg_count ?? 0]);
      rows.push(['COUPLE', 'photos_media', r.photo_count ?? 0]);
      rows.push(['COUPLE', 'memories', r.mem_count ?? 0]);
      rows.push(['COUPLE', 'love_notes', r.note_count ?? 0]);
      rows.push(['COUPLE', 'quizzes_done', r.quiz_done ?? 0]);
      rows.push(['', '', '']);
    });
    triggerDownload('little-world-admin-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
  }

  function exportCoupleCSV() {
    if (!currentDetail || !allData) return;
    const rel = (allData.relationships || []).find(r => r.id === currentDetail.relId);
    if (!rel) return;
    const p1 = rel.person1 || {};
    const p2 = rel.person2 || {};

    const rows = [['SECTION', 'FIELD', 'VALUE']];
    const couple = [
      ['COUPLE', 'id', rel.id],
      ['COUPLE', 'status', rel.status],
      ['COUPLE', 'pairing_code', rel.pairing_code || ''],
      ['COUPLE', 'creator_user_id', rel.creator_user_id],
      ['COUPLE', 'person1', p1.name || ''],
      ['COUPLE', 'person1_age', p1.age ?? ''],
      ['COUPLE', 'person1_joined', p1.created_at || ''],
      ['COUPLE', 'person1_last_active', p1.last_active || ''],
      ['COUPLE', 'person2', p2.name || ''],
      ['COUPLE', 'person2_age', p2.age ?? ''],
      ['COUPLE', 'person2_joined', p2.created_at || ''],
      ['COUPLE', 'person2_last_active', p2.last_active || ''],
      ['COUPLE', 'relationship_type', rel.relationship_type || ''],
      ['COUPLE', 'together_since', rel.together_since || ''],
      ['COUPLE', 'theme', rel.theme || ''],
      ['COUPLE', 'story', rel.story || ''],
      ['COUPLE', 'vibes', JSON.stringify(rel.vibes || [])],
      ['COUPLE', 'chat_style', JSON.stringify(rel.chat_style || [])],
      ['COUPLE', 'created_at', rel.created_at || ''],
      ['COUPLE', 'connected_at', rel.connected_at || ''],
      ['COUPLE', 'completed_at', rel.completed_at || ''],
      ['COUPLE', 'last_active', rel.last_active || '']
    ];
    couple.forEach(r => rows.push(r));
    rows.push(['', '', '']);

    (allData.messages || []).filter(m => m.relationship_id === rel.id)
      .forEach(m => rows.push(['MESSAGE', m.created_at || '', (m.type === 'image' ? '[IMAGE] ' : '[TEXT] ') + (m.message || m.media_path || '') + ' by ' + (m.sender_name || '?')]));
    rows.push(['', '', '']);
    (allData.memories || []).filter(m => m.relationship_id === rel.id)
      .forEach(m => rows.push(['MEMORY', m.title || '', (m.date || '') + ' | ' + (m.location || '') + ' | ' + (m.description || '')]));
    rows.push(['', '', '']);
    (allData.notes || []).filter(n => n.relationship_id === rel.id)
      .forEach(n => rows.push(['NOTE', n.title || '', (n.type || '') + ' / ' + (n.tone || '') + ' — ' + (n.text || '')]));
    rows.push(['', '', '']);
    (allData.activity || []).filter(a => a.relationship_id === rel.id)
      .forEach(a => rows.push(['ACTIVITY', a.kind, a.actor + ': ' + a.msg]));
    rows.push(['', '', '']);
    (allData.quizzes || []).filter(q => q.relationship_id === rel.id)
      .forEach(q => rows.push(['QUIZ', q.quiz_date, q.completed ? q.result_pct + '% match' : 'pending']));

    triggerDownload('couple-' + (p1.name || 'unknown') + (p2.name ? '-' + p2.name : '') + '-admin-' + new Date().toISOString().slice(0, 10) + '.csv', rows);
  }

  /* ===== Events ===== */
  const gateForm = $('gate-form');
  if (gateForm) {
    gateForm.addEventListener('submit', e => {
      e.preventDefault();
      signIn();
    });
  }

  const recoveryForm = $('newpass-form');
  if (recoveryForm) {
    recoveryForm.addEventListener('submit', async e => {
      e.preventDefault();
      const btn = $('btn-save-new-pass');
      const err = $('recovery-err');
      const p1 = $('np1').value || '';
      const p2 = $('np2').value || '';
      if (p1.length < 8) { err.textContent = 'Use at least 8 characters.'; return; }
      if (p1 !== p2) { err.textContent = 'Passwords don\'t match — check both fields.'; return; }
      btn.disabled = true;
      err.textContent = '';
      try {
        if (!client) await makeClient();
        const { error } = await client.auth.updateUser({ password: p1 });
        if (error) {
          err.textContent = 'Couldn\'t update: ' + esc(String(error.message || error));
          btn.disabled = false;
          return;
        }
        try { await client.auth.signOut(); } catch (_) {}
        try { localStorage.removeItem(SESSION_KEY); } catch (_) {}
        resetEmail = '';
        showLogin('Password updated ✓ — sign in below with your new password.');
        btn.disabled = false;
      } catch (e2) {
        err.textContent = 'Something went wrong: ' + esc(String(e2.message || e2));
        btn.disabled = false;
      }
    });
  }

  /* OTP-based reset — works entirely from this page, no redirect URLs. */
  const otpForm = $('otp-form');
  if (otpForm) {
    otpForm.addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('recovery-err');
      const btn = $('btn-send-otp');
      const email = ($('otp-email').value || '').trim();
      err.textContent = '';
      if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = 'Enter the owner email address.'; return; }
      if (!client) {
        try { await makeClient(); }
        catch { err.textContent = 'Couldn\'t load the database client — check your internet connection.'; return; }
      }
      btn.disabled = true;
      try {
        const { error } = await client.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
        if (error) {
          err.textContent = 'Couldn\'t send the code: ' + esc(String(error.message || error));
          btn.disabled = false;
          return;
        }
        resetEmail = email;
        $('otp-form').hidden = true;
        $('code-form').hidden = false;
        $('newpass-form').hidden = true;
        $('reset-sub').textContent = 'Code sent to ' + email + ' ✓ (one per minute — give it a few seconds, check spam too).';
        const code = $('otp-code');
        setTimeout(() => code && code.focus(), 120);
      } catch (e2) {
        err.textContent = 'Something went wrong: ' + esc(String(e2.message || e2));
        btn.disabled = false;
      }
    });
  }

  const codeForm = $('code-form');
  if (codeForm) {
    codeForm.addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('recovery-err');
      const btn = $('btn-verify-otp');
      const email = resetEmail || ($('otp-email').value || '').trim();
      const code = ($('otp-code').value || '').trim();
      err.textContent = '';
      if (!/^\d{6}$/.test(code)) { err.textContent = 'Enter the 6-digit code from the email.'; return; }
      if (!client) {
        try { await makeClient(); }
        catch { err.textContent = 'Couldn\'t load the database client — check your internet connection.'; return; }
      }
      btn.disabled = true;
      try {
        const { error } = await client.auth.verifyOtp({ email, token: code, type: 'email' });
        if (error) {
          err.textContent = 'That code didn\'t work: ' + esc(String(error.message || error));
          btn.disabled = false;
          return;
        }
        $('code-form').hidden = true;
        $('newpass-form').hidden = false;
        $('reset-sub').textContent = 'Code verified ✓ — now choose your new Admin Desk password.';
        setTimeout(() => { const f = $('np1'); f && f.focus(); }, 120);
      } catch (e2) {
        err.textContent = 'Something went wrong: ' + esc(String(e2.message || e2));
        btn.disabled = false;
      }
    });
  }

  const forgotLink = $('forgot-link');
  if (forgotLink) {
    forgotLink.addEventListener('click', e => { e.preventDefault(); showRecovery('otp'); });
  }
  const backToLogin = $('btn-back-to-login');
  if (backToLogin) {
    backToLogin.addEventListener('click', () => { resetEmail = ''; showLogin(''); });
  }
  $('btn-signout').addEventListener('click', signOut);
  $('btn-refresh').addEventListener('click', load);
  $('btn-csv').addEventListener('click', exportAllCSV);

  searchInput.addEventListener('input', e => {
    searchQuery = e.target.value.trim();
    renderSearchClear();
    applyFilters();
    renderCouplesGrid();
  });
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    renderSearchClear();
    applyFilters();
    renderCouplesGrid();
    searchInput.focus();
  });
  filterStatus.addEventListener('change', e => {
    statusFilter = e.target.value;
    applyFilters();
    renderCouplesGrid();
  });
  sortBySel.addEventListener('change', e => {
    sortBy = e.target.value;
    applyFilters();
    renderCouplesGrid();
  });

  couplesGrid.addEventListener('click', e => {
    const codeBtn = e.target.closest('[data-code]');
    if (codeBtn) {
      e.stopPropagation();
      copyText(codeBtn.dataset.code, 'Pairing code copied');
      return;
    }
    const card = e.target.closest('.couple-card');
    if (card && !e.target.closest('button')) openDetail(card.dataset.relId);
  });
  couplesGrid.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.couple-card');
      if (card) { e.preventDefault(); openDetail(card.dataset.relId); }
    }
  });

  $('detail-back').addEventListener('click', closeDetail);
  $('btn-copy-code').addEventListener('click', () => {
    const rel = (allData.relationships || []).find(r => r.id === currentDetail.relId);
    if (rel && rel.pairing_code) copyText(rel.pairing_code, 'Pairing code copied');
  });
  $('btn-couple-csv').addEventListener('click', exportCoupleCSV);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      if (!lightbox.hidden) closeLightbox();
      else if (!detail.hidden) closeDetail();
    }
  });

  lightboxClose.addEventListener('click', closeLightbox);
  $('lightbox-backdrop').addEventListener('click', closeLightbox);

  /* Auto-refresh while unlocked (keeps future couples appearing automatically) */
  setInterval(() => {
    if (!dash.hidden && client) load();
  }, 60000);

  /* Boot */
  if (window.APP_CONFIG && window.APP_CONFIG.configured) load();
})();