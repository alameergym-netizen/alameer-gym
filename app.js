// app.js — واجهة تطبيق الأمير جيم
import * as U from './util.js';
import { CONFIG } from './config.js';
import { createStore } from './store.js';
import { buildXlsx } from './xlsx.js';

const PREVIEW = !!window.__AG_PREVIEW__;
const USE_HISTORY = !PREVIEW; // داخل المعاينة ما منلمس سجل المتصفح
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = (k) => { try { return window[k]; } catch (e) { return null; } };
const mkStorage = (k) => ({
  get(key, d) { try { const v = store(k).getItem('ag:' + key); return v === null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(key, v) { try { store(k).setItem('ag:' + key, JSON.stringify(v)); } catch (e) {} },
  del(key) { try { store(k).removeItem('ag:' + key); } catch (e) {} }
});
const LS = mkStorage('localStorage');
const SS = mkStorage('sessionStorage');
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isAndroid = /Android/.test(navigator.userAgent);
const isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

/* ---------------- أيقونات ---------------- */
const ICONS = {
  home: '<path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5H15v-6h-6v6H5.5A1.5 1.5 0 0 1 4 19z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M18 9a6 6 0 1 0-12 0c0 6.5-2.5 8-2.5 8h17S18 15.5 18 9"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  back: '<path d="m9 5 7 7-7 7"/>',
  chev: '<path d="m15 6-6 6 6 6"/>',
  wa: '<path d="M20.5 11.6a8.4 8.4 0 0 1-12.4 7.4L3.5 20.5l1.5-4.5a8.4 8.4 0 1 1 15.5-4.4z"/><path fill="currentColor" stroke="none" d="M9.3 7.9c.3-.2.7-.1.9.2l.8 1.6c.1.3.1.6-.2.8l-.6.5c.4 1 1.4 2 2.5 2.5l.5-.6c.2-.3.5-.3.8-.2l1.6.8c.3.2.4.6.2.9-.4.9-1.3 1.4-2.3 1.2-2.4-.5-4.4-2.5-4.9-4.9-.2-1 .3-1.9 1.2-2.3z"/>',
  phone: '<path d="M5 3h3.5l1.8 4.5-2.3 1.4a11 11 0 0 0 5.1 5.1l1.4-2.3L19 13.5V17a2 2 0 0 1-2.2 2A16 16 0 0 1 3 5.2 2 2 0 0 1 5 3z"/>',
  cal: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/><path d="m9 15 2 2 4-4"/>',
  renew: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8.5"/><path d="M20 3.5v5h-5"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 20V9M7.5 13.5 12 9l4.5 4.5M5 4h14"/>',
  ticket: '<path d="M3.5 8.5V6A1.5 1.5 0 0 1 5 4.5h14A1.5 1.5 0 0 1 20.5 6v2.5a2.5 2.5 0 0 0 0 7V18a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 18v-2.5a2.5 2.5 0 0 0 0-7z"/><path d="M14 5v2M14 11v2M14 17v2"/>',
  crown: '<path d="m3 8 4.5 4L12 5l4.5 7L21 8l-2 10H5z"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  device: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="m10.8 12.2 8.7-8.7M16 6l2.5 2.5M14 8l2 2"/>',
  logout: '<path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3"/><path d="m15 17 5-5-5-5M20 12H9"/>',
  userPlus: '<circle cx="10" cy="8" r="4"/><path d="M3 20a7 7 0 0 1 14 0M19 8v6M16 11h6"/>',
  book: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 18.5A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.5-2.5L14 9V3"/><path d="M7 15h10"/>',
  tag: '<path d="M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
  msg: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9.5h8M8 12.5h5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  sheet: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M4 9h16M4 15h16M10 3v18"/>',
  db: '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v13c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-13M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
  send: '<path d="M21 3 10 14M21 3l-7 18-4-7-7-4z"/>',
  copy: '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  dots: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'
};
function ic(n, s = 24, w = 2) {
  return `<svg class="ic" viewBox="0 0 24 24" width="${s}" height="${s}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
}

/* ---------------- الحالة ---------------- */
const S = {
  store: null, user: null, ready: false, needsSetup: false, fatal: null,
  members: [], byId: {}, membersLoaded: false, sync: { fromCache: false, pending: false },
  settings: U.defaultSettings(), staff: [], meta: {}, subs: null,
  route: null, depth: 0, scroll: {}, stack: [],
  section: LS.get('section', 'all'), q: '', filter: 'all', sort: 'urgency', checkin: false, limit: 120,
  simToday: SS.get('today', null), online: navigator.onLine,
  sheetOpen: false, sheetPushed: false, awaitWA: null, unsubs: [], uid: null,
  installEvt: null, swReg: null, push: { perm: 'default', subscribed: false }, devTaps: [], showDone: true
};
const today = () => S.simToday || U.todayStr();
const isOwner = () => !!(S.user && S.user.role === 'owner');
const st = m => U.status(m, today(), S.settings.alertDays);
const dl = m => U.daysLeft(m, today());
const secOk = m => S.section === 'all' || m.section === S.section;
const visibleMembers = () => S.members.filter(m => secOk(m) && !m.archived);
const visitedToday = m => Array.isArray(m.visits) && m.visits.includes(today());
const unitWord = n => (n >= 3 && n <= 10) ? 'أيام' : 'يوم';
const nowIso = () => new Date().toISOString();

/* ---------------- سجل الأخطاء (لأدوات المطوّر) ---------------- */
const LOG = LS.get('log', []);
function logErr(e, where) {
  let msg = '';
  try { msg = e && (e.code ? e.code + ': ' : '') + (e.message || e.reason || ''); if (!msg) msg = String(e); } catch (x) { msg = 'unknown'; }
  LOG.unshift({ t: nowIso(), where: where || '', msg: String(msg).slice(0, 400), v: CONFIG.version });
  LOG.length = Math.min(LOG.length, 40);
  LS.set('log', LOG);
}
window.addEventListener('error', e => logErr(e.error || { message: e.message }, 'window'));
window.addEventListener('unhandledrejection', e => logErr(e.reason, 'promise'));
function errText(e) {
  const c = (e && e.code) || '';
  const map = {
    'auth/invalid-credential': 'اسم المستخدم أو كلمة السر غلط', 'auth/wrong-password': 'اسم المستخدم أو كلمة السر غلط',
    'auth/user-not-found': 'اسم المستخدم أو كلمة السر غلط', 'auth/invalid-email': 'اسم المستخدم مش صحيح',
    'auth/too-many-requests': 'محاولات كثير. استنى شوي وجرّب كمان مرة', 'auth/network-request-failed': 'ما في إنترنت. تأكد من الاتصال وجرّب',
    'auth/email-already-in-use': 'اسم المستخدم هذا مستعمل، اختار غيره', 'auth/weak-password': 'كلمة السر لازم تكون 6 أحرف أو أكثر',
    'auth/requires-recent-login': 'سجّل خروج ودخول وجرّب كمان مرة', 'auth/missing-password': 'اكتب كلمة السر',
    'permission-denied': 'حسابك ما عنده صلاحية لهالعملية', 'unavailable': 'ما في اتصال، رح نحاول لما يرجع النت',
    'resource-exhausted': 'وصلنا للحد اليومي المجاني من Firebase. رح يرجع يشتغل بكرا', demo: 'هالميزة بتشتغل بالنسخة الحقيقية بس'
  };
  return map[c] || 'صار خطأ. جرّب كمان مرة' + (c ? ' (' + c + ')' : '');
}

/* ---------------- تشغيل ---------------- */
function applyTheme() {
  const t = LS.get('theme', 'dark');
  const r = document.documentElement;
  if (t === 'auto') r.removeAttribute('data-theme'); else r.setAttribute('data-theme', t);
  const meta = $('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', getComputedStyle(r).getPropertyValue('--bg').trim() || '#09090A');
}

async function boot() {
  applyTheme();
  render();
  try {
    S.store = await createStore(CONFIG, { forceDemo: PREVIEW });
  } catch (e) {
    logErr(e, 'store');
    S.fatal = 'ما قدرنا نحمّل التطبيق. أول مرة لازم يكون في إنترنت، جرّب كمان مرة.';
    S.ready = true; render(); return;
  }
  S.store.onError(e => { logErr(e, 'write'); toast(errText(e)); });
  S.store.onUser(onUser);
  registerSW();
  window.addEventListener('popstate', onPop);
  window.addEventListener('online', () => { S.online = true; refresh(); });
  window.addEventListener('offline', () => { S.online = false; refresh(); });
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); S.installEvt = e; if (S.route && S.route.name === 'install') render(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (S.awaitWA) setTimeout(askWASent, 350);
    if (S.swReg) S.swReg.update().catch(() => {});
    const t = U.todayStr(); if (!S.simToday && S.lastDay && S.lastDay !== t) refresh(); S.lastDay = t;
  });
  S.lastDay = U.todayStr();
}

async function onUser(u) {
  const sameUser = u && S.uid === u.uid && !u.pending;
  S.user = u;
  if (!u) {
    stopWatchers(); S.uid = null;
    S.needsSetup = await S.store.isSetupNeeded();
    S.ready = true; render(); return;
  }
  if (u.pending || !u.active) { stopWatchers(); S.ready = true; render(); return; }
  if (sameUser && S.unsubs.length) { refresh(); return; }
  stopWatchers(); S.uid = u.uid;
  const st_ = S.store;
  S.unsubs.push(st_.watchMembers((list, meta) => {
    S.members = list.map(prep);
    S.byId = {}; S.members.forEach(m => { S.byId[m.id] = m; });
    S.membersLoaded = true; S.sync = meta || S.sync;
    refresh();
  }, e => { logErr(e, 'members'); toast(errText(e)); }));
  S.unsubs.push(st_.watchSettings(d => { S.settings = U.mergeSettings(d); refresh(); }));
  S.unsubs.push(st_.watchMeta(m => { S.meta = Object.assign({}, m); if (S.route && S.route.name === 'dev') refresh(); }));
  if (u.role === 'owner') {
    S.unsubs.push(st_.watchStaff(l => { S.staff = l || []; if (S.route && ['staff', 'settings'].includes(S.route.name)) refresh(); }));
    S.unsubs.push(st_.watchPushSubs(l => { S.subs = l; if (S.route && ['dev', 'settings'].includes(S.route.name)) refresh(); }));
  }
  S.ready = true;
  S.route = parseHash();
  render('tab');
  if (S.route.openNew) setTimeout(() => memberForm(null), 300);
  syncPush();
}
function stopWatchers() { S.unsubs.forEach(f => { try { f(); } catch (e) {} }); S.unsubs = []; }
function prep(m) { m._n = U.norm(m.name); m._p = U.intlPhone(m.phone).replace(/^962/, ''); return m; }

/* ---------------- التنقل ---------------- */
const TABS = ['home', 'members', 'reminders', 'settings'];
function parseHash() {
  const h = (location.hash || '').replace(/^#\/?/, '');
  const [a, b] = h.split('/');
  if (a === 'm' && b) return { name: 'member', id: decodeURIComponent(b) };
  if (a === 'new') return { name: 'home', openNew: true };
  if (VIEWS[a] && !VIEWS[a].hidden) return { name: a };
  if (a === 'dev' && LS.get('dev', false)) return { name: 'dev' };
  return { name: 'home' };
}
function hashOf(r) { return r.name === 'member' ? 'm/' + encodeURIComponent(r.id) : r.name; }
function setHash(r, mode) {
  if (!USE_HISTORY) return;
  try {
    if (mode === 'replace' || S.sheetPushed) { history.replaceState(null, '', '#/' + hashOf(r)); S.sheetPushed = false; }
    else history.pushState(null, '', '#/' + hashOf(r));
  } catch (e) {}
}
function go(name, params) {
  if (S.sheetOpen) doCloseSheet();
  S.scroll[routeKey(S.route)] = window.scrollY;
  if (S.route) S.stack.push(S.route);
  S.route = Object.assign({ name }, params || {});
  setHash(S.route, 'push'); S.depth++;
  render('fwd'); window.scrollTo(0, 0);
}
function tab(name) {
  if (S.sheetOpen) doCloseSheet();
  if (S.route && S.route.name === name && !S.route.id) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (name !== 'members') S.checkin = false;
  S.route = { name }; S.depth = 0; S.stack = [];
  setHash(S.route, 'replace');
  render('tab'); window.scrollTo(0, 0);
}
function back() {
  if (USE_HISTORY && S.depth > 0) { try { history.back(); return; } catch (e) {} }
  S.depth = Math.max(0, S.depth - 1);
  S.route = S.stack.pop() || { name: 'home' };
  render('back');
  window.scrollTo(0, S.scroll[routeKey(S.route)] || 0);
}
function onPop() {
  if (S.ignorePop) { S.ignorePop = false; return; }
  if (S.sheetOpen || S.popWait) { S.sheetPushed = false; doCloseSheet(); const f = S.popWait; S.popWait = null; if (f) f(); return; }
  S.route = parseHash(); S.depth = Math.max(0, S.depth - 1); S.stack.pop();
  render('back');
  const y = S.scroll[routeKey(S.route)];
  window.scrollTo(0, y || 0);
}
const routeKey = r => r ? hashOf(r) : '';

/* ---------------- الرسم ---------------- */
function render(anim) {
  const root = $('#screen'), bar = $('#tabbar'), app = $('#app');
  if (S.fatal) { bar.hidden = true; root.className = 'no-tabs'; root.innerHTML = `<div class="auth"><img class="crest" src="icons/logo.png" alt=""><h1>${esc(S.fatal)}</h1><button class="btn gold" onclick="location.reload()">جرّب كمان مرة</button></div>`; return; }
  if (!S.ready) { bar.hidden = true; root.className = 'no-tabs'; root.innerHTML = '<div class="splash"><img src="icons/logo.png" alt="الأمير جيم"></div>'; return; }
  if (!S.user) { bar.hidden = true; app.classList.remove('has-tabs'); root.className = 'no-tabs'; root.innerHTML = S.needsSetup ? setupHTML() : loginHTML(); bindAuth(); return; }
  if (S.user.pending || !S.user.active) {
    bar.hidden = true; root.className = 'no-tabs';
    root.innerHTML = `<div class="auth"><img class="crest" src="icons/logo.png" alt=""><h1>${S.user.pending ? 'جاري تجهيز الحساب…' : 'حسابك موقوف'}</h1><p class="lead">${S.user.pending ? 'إذا طوّلت هالشاشة، حسابك مش مربوط بالنادي. اطلب من المالك يضيفك من الإعدادات.' : 'اطلب من مالك النادي يرجّع تفعيل حسابك.'}</p><button class="btn" data-act="logout">${ic('logout')} تسجيل خروج</button></div>`;
    return;
  }
  const r = S.route || (S.route = { name: 'home' });
  const v = VIEWS[r.name] || VIEWS.home;
  root.className = v.tab ? '' : 'no-tabs';
  app.classList.toggle('has-tabs', !!v.tab);
  root.innerHTML = `<div class="view${anim && !reduceMotion() ? ' anim-' + anim : ''}">${topBars()}${v.html(r)}</div>`;
  bar.hidden = !v.tab;
  renderTabbar(v.tab);
  if (v.mount) v.mount(r, root, anim);
}
function refresh() {
  if (!S.ready || !S.user || S.user.pending || !S.user.active || !S.route) return;
  const v = VIEWS[S.route.name] || VIEWS.home;
  if (v.update) v.update(S.route);
  else if (!v.static) { const y = window.scrollY; render(); window.scrollTo(0, y); }
  renderTabbar(v.tab);
}
function topBars() {
  let h = '';
  if (S.simToday) h += `<div class="sim-bar">${ic('flask', 18)}<span>تجربة: التطبيق شايف إنه اليوم ${esc(U.fmtD(S.simToday))}</span><button data-act="simOff">رجّع</button></div>`;
  return h;
}
function renderTabbar(active) {
  const bar = $('#tabbar');
  const n = remindCount();
  const t = (name, label, icon) => `<button class="tab" data-tab="${name}" ${active === name ? 'aria-current="page"' : ''}>${ic(icon, 27, 2)}<span>${label}</span>${name === 'reminders' && n ? `<span class="badge">${n > 99 ? '99+' : n}</span>` : ''}</button>`;
  bar.innerHTML = t('home', 'الرئيسية', 'home') + t('members', 'المشتركين', 'users') +
    `<button class="tab-add" data-act="new" aria-label="اشتراك جديد">${ic('plus', 30, 2.6)}</button>` +
    t('reminders', 'التذكيرات', 'bell') + t('settings', 'الإعدادات', 'gear');
}
function remindCount() { return S.members.filter(m => secOk(m) && U.needsRemind(m, today(), S.settings)).length; }

/* ---------------- مكونات ---------------- */
function avHTML(m, extra) {
  const sx = S.section === 'all' && m.section ? `<span class="sx">${m.section === 'women' ? 'س' : 'ر'}</span>` : '';
  return `<span class="av ${extra || ''}">${esc(U.firstName(m.name).charAt(0) || '؟')}${sx}</span>`;
}
function daysHTML(m) {
  const d = dl(m);
  if (isNaN(d)) return '<div class="dl"><b>—</b></div>';
  if (U.isShort(m) && d >= 0) return `<div class="dl"><small>Day Pass</small><b class="w">${d === 0 ? 'اليوم' : d}</b></div>`;
  if (d < 0) return `<div class="dl"><small>منتهي من</small><b>${-d}</b><small>${unitWord(-d)}</small></div>`;
  if (d === 0) return '<div class="dl"><small>آخر يوم</small><b class="w">اليوم</b></div>';
  return `<div class="dl"><small>باقي</small><b>${d}</b><small>${unitWord(d)}</small></div>`;
}
function rowHTML(m, i, opts) {
  opts = opts || {};
  const sub = [`<span class="ltr">${esc(U.prettyPhone(m.phone))}</span>`, m.offer ? esc(m.offer) : ''].filter(Boolean).join(' · ');
  let end = daysHTML(m);
  if (opts.checkin) {
    const on = visitedToday(m);
    end = `<button class="ck${on ? ' on' : ''}" data-act="checkin" data-id="${esc(m.id)}" aria-pressed="${on}" aria-label="حضور ${esc(m.name)}">${ic('check', 26, 2.8)}</button>`;
  }
  return `<li class="row st-${st(m)}" style="--i:${i}" data-act="open" data-id="${esc(m.id)}" role="button" tabindex="0">${avHTML(m)}<div class="rm"><div class="nm">${esc(m.name)}</div><div class="sub">${sub}</div></div>${end}</li>`;
}
function emptyHTML(icon, title, text, btn) {
  return `<div class="empty"><span class="bub">${ic(icon, 30)}</span><h3>${esc(title)}</h3>${text ? `<p>${esc(text)}</p>` : ''}${btn || ''}</div>`;
}
function segHTML(act, val, opts, cls) {
  return `<div class="seg ${cls || ''}" role="group">${opts.map(([v, l]) => `<button type="button" data-act="${act}" data-v="${v}" aria-pressed="${val === v}">${l}</button>`).join('')}</div>`;
}
const sectionSeg = () => segHTML('section', S.section, [['all', 'الكل'], ['men', 'رجال'], ['women', 'سيدات']]);
function countUp(root) {
  if (reduceMotion()) return;
  $$('[data-count]', root).forEach(el => {
    const to = +el.dataset.count; if (!to) return;
    const t0 = performance.now();
    const step = t => { const p = Math.min(1, (t - t0) / 700); el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    el.textContent = '0'; requestAnimationFrame(step);
  });
}
function timesWord(n) { return n === 1 ? 'مرة وحدة' : n === 2 ? 'مرتين' : (n >= 3 && n <= 10) ? n + ' مرات' : n + ' مرة'; }
function greet() { const h = new Date().getHours(); return h < 12 ? 'صباح الخير' : 'مساء الخير'; }
function ago(iso) {
  const t = Date.parse(iso); if (!t) return '—';
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return 'هلأ'; if (m < 60) return 'قبل ' + m + ' دقيقة';
  const h = Math.round(m / 60); if (h < 24) return 'قبل ' + (h === 1 ? 'ساعة' : h === 2 ? 'ساعتين' : h + ' ساعات');
  const d = Math.round(h / 24); return 'قبل ' + U.daysWord(d);
}
function clock(iso) { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleTimeString('ar-JO-u-nu-latn', { hour: 'numeric', minute: '2-digit' }); }
function hourLabel(h) { const p = h < 12 ? 'الصبح' : h < 17 ? 'الظهر' : 'المسا'; const x = h % 12 || 12; return x + ':00 ' + p; }

/* =========================================================
   الشاشات
   ========================================================= */
const VIEWS = {};

/* ---------- الرئيسية ---------- */
VIEWS.home = {
  tab: 'home',
  html() {
    const demo = S.store.mode === 'demo';
    return `
      <header class="top">
        <img class="crest" src="icons/logo.png" alt="">
        <div class="tt"><h1>${esc(S.settings.gymName)}</h1><p>${greet()}، ${esc(U.firstName(S.user.name))} · ${esc(U.longD(today()))}</p></div>
        <span data-slot="net"></span>
      </header>
      ${demo ? `<div class="demo-bar">${ic('info', 20)}<span><b>نسخة تجربة</b> · البيانات على هالجهاز بس</span><button data-go="guide">طريقة التشغيل</button></div>` : ''}
      <div class="mt">${sectionSeg()}</div>
      <div class="search mt-s"><button class="fake" data-act="goSearch"><span class="s-ic">${ic('search', 22)}</span>ابحث عن مشترك بالاسم أو الرقم</button></div>
      <div class="stats mt" data-slot="stats"></div>
      <div class="quick mt-s">
        <button class="qa primary" data-act="new"><span class="bub">${ic('userPlus', 26)}</span>اشتراك جديد</button>
        <button class="qa" data-act="checkinMode"><span class="bub">${ic('cal', 26)}</span>تسجيل حضور</button>
        <button class="qa" data-act="dayPass"><span class="bub">${ic('ticket', 26)}</span>Day Pass</button>
      </div>
      <div data-slot="push"></div>
      <div class="mt" data-slot="remind"></div>
      <section class="sec"><div class="sec-h"><h2>بينتهوا قريباً</h2><a href="#" data-act="filterGo" data-f="soon">الكل</a></div><div data-slot="soon"></div></section>
      <section class="sec"><div class="sec-h"><h2>آخر التسجيلات</h2><a href="#" data-act="sortGo" data-s="recent">الكل</a></div><div data-slot="recent"></div></section>`;
  },
  mount(r, root, anim) { this.update(); if (anim) countUp(root); },
  update() {
    const root = $('#screen'); if (!root) return;
    const list = visibleMembers(), t = today();
    const c = { active: 0, soon: 0, expired: 0, here: 0 };
    list.forEach(m => { const s = st(m); if (c[s] !== undefined) c[s]++; if (visitedToday(m)) c.here++; });
    const stat = (k, label, color, cap, f) => `<button class="stat" style="--c:var(--${color})" data-act="filterGo" data-f="${f}"><span class="lb"><i></i>${label}</span><span class="n" data-count="${S.membersLoaded ? c[k] : 0}">${S.membersLoaded ? c[k] : '–'}</span><span class="cap">${cap}</span></button>`;
    slot(root, 'stats', stat('active', 'فعّال', 'ok', 'اشتراكهم شغّال', 'active') + stat('soon', 'قرب ينتهي', 'warn', 'خلال ' + U.daysWord(S.settings.alertDays), 'soon') +
      stat('expired', 'منتهي', 'bad', 'بحاجة تجديد', 'expired') + stat('here', 'حضور اليوم', 'gold', 'سجّلوا حضور', 'here'));
    slot(root, 'net', !S.online ? '<span class="net-dot">بدون نت</span>' : (S.sync.pending ? '<span class="net-dot" style="color:var(--muted)">عم يحفظ…</span>' : ''));
    const need = list.filter(m => U.needsRemind(m, t, S.settings));
    const nT = need.filter(m => dl(m) === 0).length, nS = need.filter(m => dl(m) > 0).length, nE = need.filter(m => dl(m) < 0).length;
    slot(root, 'remind', need.length
      ? `<button class="alert-card" data-tab="reminders"><span class="bub">${ic('bell', 26)}</span><span class="tx"><b>${esc(U.countPhrase(need.length))} بحاجة تذكير</b><small>${[nT ? nT + ' بينتهي اليوم' : '', nS ? nS + ' قرب ينتهي' : '', nE ? nE + ' انتهى' : ''].filter(Boolean).join(' · ')}</small></span>${ic('chev', 22)}</button>`
      : (S.membersLoaded && list.length ? `<div class="alert-card ok"><span class="bub">${ic('check', 26)}</span><span class="tx"><b>كل التذكيرات مبعوتة</b><small>ما في حدا بحاجة تذكير هلأ</small></span></div>` : ''));
    slot(root, 'push', pushNudgeHTML());
    const soon = list.filter(m => { const d = dl(m); return !U.isShort(m) && d >= 0 && d <= S.settings.alertDays; }).sort((a, b) => dl(a) - dl(b)).slice(0, 5);
    slot(root, 'soon', !S.membersLoaded ? skeleton(3) : soon.length ? `<ul class="list">${soon.map((m, i) => rowHTML(m, i)).join('')}</ul>` : `<div class="card">${emptyHTML('check', 'ما في حدا قرب ينتهي اشتراكه', '')}</div>`);
    const recent = list.slice().sort((a, b) => String(b.periodAt || b.createdAt || '').localeCompare(String(a.periodAt || a.createdAt || ''))).slice(0, 5);
    slot(root, 'recent', !S.membersLoaded ? skeleton(3) : recent.length ? `<ul class="list">${recent.map((m, i) => rowHTML(m, i)).join('')}</ul>`
      : `<div class="card">${emptyHTML('userPlus', 'لسا ما في مشتركين', 'ابدأ بنقل الدفتر الورقي: اضغط «اشتراك جديد» وسجّل أول مشترك.', `<button class="btn gold" data-act="new">${ic('plus')} أول مشترك</button>`)}</div>`);
  }
};
function slot(root, name, html) { const el = $(`[data-slot="${name}"]`, root); if (el && el.innerHTML !== html) el.innerHTML = html; }
function skeleton(n) { return `<ul class="list" aria-hidden="true">${Array.from({ length: n }, () => '<li class="row" style="opacity:.5"><span class="av" style="--c:var(--line)"></span><div class="rm"><div class="nm" style="width:50%;height:12px;border-radius:6px;background:var(--surface-3)"></div><div class="sub" style="width:30%;height:10px;border-radius:6px;background:var(--surface-3);margin-top:8px"></div></div><span></span></li>').join('')}</ul>`; }

/* ---------- المشتركين ---------- */
const FILTERS = [['all', 'الكل'], ['active', 'فعّال'], ['soon', 'قرب ينتهي'], ['expired', 'منتهي'], ['here', 'حضروا اليوم']];
VIEWS.members = {
  tab: 'members',
  html() {
    return `
      <div class="vh"><div><h1>المشتركين</h1><p data-slot="count"></p></div></div>
      ${sectionSeg()}
      <div class="search mt-s"><span class="s-ic">${ic('search', 22)}</span><input id="q" type="search" placeholder="ابحث بالاسم أو رقم الجوال" autocomplete="off" enterkeyhint="search" value="${esc(S.q)}" aria-label="بحث"><button class="s-x" data-act="clearQ" aria-label="مسح" ${S.q ? '' : 'hidden'}>${ic('x', 20)}</button></div>
      <div data-slot="mode"></div>
      <div class="chips mt" data-slot="chips"></div>
      <div class="toolbar"><span data-slot="res"></span><select id="sortSel" aria-label="الترتيب"><option value="urgency">الأقرب انتهاءً</option><option value="recent">الأحدث تسجيلاً</option><option value="name">حسب الاسم</option><option value="visits">الأكثر حضوراً</option></select></div>
      <div data-slot="list"></div>`;
  },
  mount(r, root, anim) {
    const q = $('#q', root);
    q.addEventListener('input', () => { S.q = q.value; S.limit = 120; $('[data-act="clearQ"]', root).hidden = !S.q; this.update(); });
    const so = $('#sortSel', root); so.value = S.sort; so.addEventListener('change', () => { S.sort = so.value; this.update(); });
    this.update(!!anim);
    if (r.focus || S.checkin) setTimeout(() => q.focus({ preventScroll: true }), anim ? 380 : 0);
  },
  update(stagger) {
    const root = $('#screen'); if (!root) return;
    const base = visibleMembers(), t = today();
    const cnt = { all: base.length, active: 0, soon: 0, expired: 0, here: 0 };
    base.forEach(m => { const s = st(m); if (cnt[s] !== undefined) cnt[s]++; if (visitedToday(m)) cnt.here++; });
    slot(root, 'count', S.membersLoaded ? esc(U.countPhrase(base.length)) + (S.section !== 'all' ? ' · ' + U.SECTIONS[S.section] : '') : 'جاري التحميل…');
    slot(root, 'chips', FILTERS.map(([k, l]) => `<button class="chip" data-act="filter" data-f="${k}" aria-pressed="${!S.q && S.filter === k}">${l} <b>${cnt[k]}</b></button>`).join(''));
    slot(root, 'mode', S.checkin ? `<div class="banner-mode">${ic('cal', 22)}<span>تسجيل الحضور: اضغط ✓ جنب اسم المشترك</span><button data-act="checkinOff">خلص</button></div>` : '');
    const qn = U.norm(S.q);
    let arr = base;
    if (qn) {
      const toks = qn.split(' ');
      arr = arr.filter(m => toks.every(tk => {
        if (/^\d+$/.test(tk)) { const tt = tk.replace(/^(00962|962|0)/, ''); if (tt && m._p.includes(tt)) return true; }
        return m._n.includes(tk);
      }));
      arr.sort((a, b) => (b._n.startsWith(qn) - a._n.startsWith(qn)) || a._n.localeCompare(b._n, 'ar'));
    } else {
      if (S.filter === 'here') arr = arr.filter(visitedToday);
      else if (S.filter !== 'all') arr = arr.filter(m => st(m) === S.filter);
      arr = arr.slice();
      if (S.sort === 'name') arr.sort((a, b) => a._n.localeCompare(b._n, 'ar'));
      else if (S.sort === 'recent') arr.sort((a, b) => String(b.periodAt || b.createdAt || '').localeCompare(String(a.periodAt || a.createdAt || '')));
      else if (S.sort === 'visits') arr.sort((a, b) => U.visitsOf(b).length - U.visitsOf(a).length);
      else arr.sort((a, b) => U.urgency(a, t, S.settings.alertDays) - U.urgency(b, t, S.settings.alertDays));
    }
    slot(root, 'res', S.membersLoaded ? (qn ? 'نتائج البحث: ' + arr.length : arr.length + ' بالقائمة') : '');
    let html;
    if (!S.membersLoaded) html = skeleton(5);
    else if (!base.length) html = `<div class="card">${emptyHTML('users', 'ما في مشتركين لسا', 'سجّل أول مشترك وبيطلع هون.', `<button class="btn gold" data-act="new">${ic('plus')} اشتراك جديد</button>`)}</div>`;
    else if (!arr.length) {
      const digits = /^[\d٠-٩+\s]+$/.test(S.q.trim());
      html = `<div class="card">${emptyHTML('search', qn ? 'ما لقينا حدا' : 'ما في حدا بهالقسم', qn ? 'جرّب جزء من الاسم أو آخر 4 أرقام من الجوال.' : '', qn ? `<button class="btn gold" data-act="newFromSearch" data-digits="${digits ? 1 : 0}">${ic('plus')} سجّله كمشترك جديد</button>` : '')}</div>`;
    } else {
      html = `<ul class="list${stagger ? ' stagger' : ''}">${arr.slice(0, S.limit).map((m, i) => rowHTML(m, i, { checkin: S.checkin })).join('')}</ul>` +
        (arr.length > S.limit ? `<button class="btn more" data-act="more">اعرض ${arr.length - S.limit} كمان</button>` : '');
    }
    const el = $('[data-slot="list"]', root); if (el) el.innerHTML = html;
  }
};

/* ---------- ملف المشترك ---------- */
VIEWS.member = {
  html(r) {
    const m = S.byId[r.id];
    const bar = (title, end) => `<div class="pagebar"><button class="iconbtn ghost" data-act="back" aria-label="رجوع">${ic('back', 26)}</button><h2>${esc(title)}</h2>${end || ''}</div>`;
    if (!m) return bar('المشترك') + (S.membersLoaded ? `<div class="card mt">${emptyHTML('search', 'المشترك مش موجود', 'يمكن انحذف.')}</div>` : skeleton(2));
    const s = st(m), d = dl(m), t = today();
    const total = U.periodDays(m), left = Math.max(0, d);
    const pct = total > 0 ? Math.min(1, left / total) : (d >= 0 ? 1 : 0);
    const C = 2 * Math.PI * 52;
    let big, small;
    if (isNaN(d)) { big = '—'; small = ''; }
    else if (d < 0) { big = -d; small = unitWord(-d) + ' من الانتهاء'; }
    else if (d === 0) { big = 'اليوم'; small = 'آخر يوم'; }
    else { big = d; small = unitWord(d) + ' باقية'; }
    const color = s === 'expired' ? 'var(--bad)' : s === 'soon' ? 'var(--warn)' : 'var(--ok)';
    const c = U.commitment(m, t);
    const hist = Array.isArray(m.history) ? m.history : [];
    const paid = [m.price].concat(hist.map(h => h.price)).filter(x => x !== null && x !== undefined && !isNaN(x)).reduce((a, b) => a + Number(b), 0);
    const here = visitedToday(m);
    const statusTxt = s === 'expired' ? 'منتهي' : s === 'soon' ? 'قرب ينتهي' : U.isShort(m) ? 'Day Pass' : 'فعّال';
    return bar(m.name, `<button class="iconbtn ghost" data-act="edit" data-id="${esc(m.id)}" aria-label="تعديل">${ic('edit', 24)}</button>`) + `
      <div class="pf-head">
        ${avHTML(m, 'st-' + s)}
        <h1>${esc(m.name)}</h1>
        <div class="ph ltr">${esc(U.prettyPhone(m.phone))}</div>
        <div class="tags"><span class="tag st-${s}">${statusTxt}</span>${m.section ? `<span class="tag">${U.SECTIONS[m.section] || ''}</span>` : ''}${m.captain ? `<span class="tag gold">${ic('crown', 14)}${esc(m.captain)}</span>` : ''}</div>
      </div>
      <div class="card ring-card">
        <div class="ring" style="--c:${color}"><svg viewBox="0 0 120 120"><circle class="trk" cx="60" cy="60" r="52"/><circle class="val" cx="60" cy="60" r="52" stroke-dasharray="${C.toFixed(2)}" stroke-dashoffset="${(C * (1 - pct)).toFixed(2)}"/></svg>
          <div class="ctr"><b class="${typeof big === 'string' ? 'w' : ''}">${big}</b><small>${small}</small></div></div>
        <dl class="kv">
          <div><dt>العرض</dt><dd>${esc(m.offer || '—')}</dd></div>
          <div><dt>البداية</dt><dd>${esc(U.fmtD(m.startDate))}</dd></div>
          <div><dt>الانتهاء</dt><dd>${esc(U.fmtD(m.endDate))}</dd></div>
          <div><dt>المدفوع</dt><dd>${esc(U.money(m.price))}</dd></div>
        </dl>
      </div>
      <div class="acts">
        <button class="act wa" data-act="waMenu" data-id="${esc(m.id)}">${ic('wa', 28)}واتساب</button>
        <a class="act" href="tel:+${esc(U.intlPhone(m.phone))}">${ic('phone', 26)}اتصال</a>
        <button class="act${here ? ' on' : ''}" data-act="checkin" data-id="${esc(m.id)}" aria-pressed="${here}">${ic('cal', 26)}${here ? 'حاضر اليوم' : 'حضور'}</button>
        <button class="act" data-act="renew" data-id="${esc(m.id)}">${ic('renew', 26)}تجديد</button>
      </div>
      <div class="metrics">
        <div class="card metric"><small>عدد الاشتراكات</small><b>${hist.length + 1}</b><span>${hist.length ? 'جدّد ' + timesWord(hist.length) : 'أول اشتراك'}</span></div>
        <div class="card metric"><small>مجموع اللي دفعه</small><b>${paid ? Math.round(paid) : '—'}</b><span>دينار</span></div>
        <div class="card metric"><small>حضور هالشهر</small><b>${c.month}</b><span>${c.last ? 'آخر مرة ' + esc(U.relDay(c.last, t)) : 'ما في حضور'}</span></div>
      </div>
      <div class="card commit">
        <div class="commit-top"><b>الالتزام: ${esc(c.label)}</b><span>${c.total ? c.perWeek + ' مرة بالأسبوع' : ''}</span></div>
        <div class="meter l${c.level}"><i></i><i></i><i></i><i></i></div>
        ${heatHTML(m, t)}
      </div>
      <section class="sec"><div class="sec-h"><h2>الاشتراكات والعروض</h2></div>
        <div class="card pad"><ol class="tl">${timelineHTML(m)}</ol></div></section>
      ${m.notes ? `<section class="sec"><div class="sec-h"><h2>ملاحظات</h2></div><div class="card note-box">${esc(m.notes)}</div></section>` : ''}
      <section class="sec"><div class="card pad"><dl class="kv">
        <div><dt>سجّله أول مرة</dt><dd>${esc(m.createdByName || '—')}</dd></div>
        <div><dt>تاريخ التسجيل</dt><dd>${esc(m.createdAt ? U.fmtD(m.createdAt.slice(0, 10)) : '—')}</dd></div>
        <div><dt>آخر تذكير</dt><dd>${m.remindedAt ? esc(U.fmtShort(m.remindedAt.slice(0, 10)) + ' · ' + (m.remindedByName || '')) : 'ما انبعتله'}</dd></div>
      </dl></div></section>
      ${isOwner() ? `<div class="danger-zone"><button class="btn red sm" data-act="del" data-id="${esc(m.id)}">${ic('trash', 20)} حذف المشترك</button></div>` : ''}`;
  }
};
function heatHTML(m, t) {
  const visits = new Set(U.visitsOf(m));
  const d = U.parseD(t); if (!d) return '';
  const dow = (d.getDay() + 1) % 7; // السبت = 0
  const lastStart = U.addDays(t, -dow), first = U.addDays(lastStart, -11 * 7);
  let cells = '', n = 0;
  for (let c = 0; c < 12; c++) for (let r = 0; r < 7; r++) {
    const day = U.addDays(first, c * 7 + r);
    const fut = day > t, v = visits.has(day);
    if (v && !fut) n++;
    cells += `<i class="${fut ? 'f' : v ? 'v' : ''}${day === t ? ' t' : ''}" title="${esc(U.fmtShort(day))}"></i>`;
  }
  return `<div class="heat"><div class="heat-grid">${cells}</div></div><div class="heat-cap"><span>آخر 12 أسبوع</span><span>${n} زيارة · المجموع ${visits.size}</span></div>`;
}
function timelineHTML(m) {
  const items = [{ offer: m.offer, startDate: m.startDate, endDate: m.endDate, price: m.price, captain: m.captain, byName: m.periodByName || m.createdByName, cur: true }]
    .concat((m.history || []).slice().reverse());
  return items.map(h => `<li class="${h.cur ? 'cur' : ''}"><div class="t1">${esc(h.offer || 'اشتراك')}${h.cur ? ' <small class="tag" style="height:22px">الحالي</small>' : ''}<span>${esc(U.money(h.price))}</span></div>
    <div class="t2">${esc(U.fmtD(h.startDate))} ← ${esc(U.fmtD(h.endDate))}</div>
    <div class="t2">${[h.captain, h.byName ? 'سجّله ' + h.byName : ''].filter(Boolean).map(esc).join(' · ')}</div></li>`).join('');
}

/* ---------- التذكيرات ---------- */
VIEWS.reminders = {
  tab: 'reminders',
  html() {
    return `<div class="vh"><div><h1>التذكيرات</h1><p>رسالة واتساب جاهزة لكل مشترك قرب ينتهي اشتراكه</p></div></div>
      ${sectionSeg()}
      <div class="mt" data-slot="prog"></div>
      <div data-slot="groups"></div>`;
  },
  mount(r, root, anim) { this.update(!!anim); },
  update(stagger) {
    const root = $('#screen'); if (!root) return;
    const t = today(), s = S.settings;
    const items = visibleMembers().filter(m => U.inRemindWindow(m, t, s));
    const done = items.filter(m => U.isReminded(m, t));
    const groups = [
      ['اشتراكهم بينتهي اليوم', items.filter(m => dl(m) === 0)],
      ['قرب ينتهي (خلال ' + U.daysWord(s.alertDays) + ')', items.filter(m => dl(m) > 0)],
      ['انتهى اشتراكهم (آخر 30 يوم)', items.filter(m => dl(m) < 0)]
    ];
    slot(root, 'prog', items.length ? `<div class="card prog"><div class="bar"><i style="width:${Math.round(done.length / items.length * 100)}%"></i></div><b>${done.length} من ${items.length}</b>
      <button class="chip" data-act="toggleDone" aria-pressed="${!S.showDone}">${S.showDone ? 'خبّي المبعوت' : 'اعرض المبعوت'}</button></div>` : '');
    let html = '';
    if (!S.membersLoaded) html = skeleton(4);
    else if (!items.length) html = `<div class="card mt">${emptyHTML('check', 'ما في تذكيرات هلأ', 'لما يقرب انتهاء اشتراك أي حدا بيطلع هون، وبيوصلك إشعار الصبح.')}</div>`;
    else groups.forEach(([title, list]) => {
      list.sort((a, b) => (U.isReminded(a, t) - U.isReminded(b, t)) || (dl(a) - dl(b)) * (dl(a) < 0 ? -1 : 1));
      const shown = S.showDone ? list : list.filter(m => !U.isReminded(m, t));
      if (!shown.length) return;
      html += `<section class="sec"><div class="sec-h"><h2>${esc(title)}</h2><span class="cnt">${list.length}</span></div><ul class="list${stagger ? ' stagger' : ''}">${shown.map((m, i) => remHTML(m, i)).join('')}</ul></section>`;
    });
    slot(root, 'groups', html);
  }
};
function remHTML(m, i) {
  const t = today(), d = dl(m), kind = U.remindKind(m, t), done = U.isReminded(m, t);
  const when = d < 0 ? 'انتهى ' + U.fmtShort(m.endDate) : d === 0 ? 'بينتهي اليوم' : U.remainPhrase(d) + ' · ' + U.fmtShort(m.endDate);
  const end = done
    ? `<span class="done-mark" title="انبعت">${ic('check', 24, 2.6)}</span>`
    : `<a class="wa-btn" href="${esc(U.waLink(m.phone, U.fillTemplate(kind, m, S.settings, t)))}" target="_blank" rel="noopener" data-act="wa" data-id="${esc(m.id)}" data-kind="${kind}">${ic('wa', 22)}واتساب</a>`;
  const ask = S.awaitWA && S.awaitWA.id === m.id && S.awaitWA.ask
    ? `<div class="confirm"><span>انبعتت الرسالة لـ${esc(U.firstName(m.name))}؟</span><button class="btn gold sm" data-act="waYes" data-id="${esc(m.id)}">${ic('check', 20)} أيوه</button><button class="btn sm" data-act="waNo">لا</button></div>` : '';
  return `<li class="rem st-${st(m)}${done ? ' done' : ''}" style="--i:${i}">${avHTML(m)}<div class="rm" data-act="open" data-id="${esc(m.id)}" role="button"><div class="nm">${esc(m.name)}</div><div class="sub">${esc(when)}${done && m.remindedByName ? ' · بعتها ' + esc(m.remindedByName) : ''}</div></div>${end}${ask}</li>`;
}

/* ---------- الإعدادات ---------- */
VIEWS.settings = {
  tab: 'settings',
  html() {
    const u = S.user, own = isOwner(), demo = S.store.mode === 'demo';
    const item = (attrs, icon, title, sub, end, cls) => `<${attrs.startsWith('href') ? 'a' : 'button'} class="item ${cls || ''}" ${attrs}><span class="bub">${ic(icon, 22)}</span><span class="tx"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span><span class="end">${end || ''}${ic('chev', 20)}</span></${attrs.startsWith('href') ? 'a' : 'button'}>`;
    const p = pushInfo();
    const themeL = { dark: 'داكن', light: 'فاتح', auto: 'حسب الجهاز' }[LS.get('theme', 'dark')];
    const n = S.meta && S.meta.notify;
    return `<div class="vh"><div><h1>الإعدادات</h1></div></div>
      <div class="card acct">${avHTML({ name: u.name }, '')}<div><b>${esc(u.name)}</b><small>${own ? 'مالك النادي' : 'موظف'} · <span class="ltr">${esc(u.username || '')}</span></small></div></div>
      <div class="group"><h3>الإشعارات</h3><div class="list">
        ${item('data-act="pushSetup"', 'bell', 'إشعارات هالجهاز', esc(p.text), p.ok ? '<span class="ok-t">مفعّلة</span>' : '<span class="warn-t">مش مفعّلة</span>')}
        ${item('data-act="testLocal"', 'send', 'جرّب إشعار هلأ', 'بيطلعلك إشعار على هالجهاز عشان تتأكد إنه شغّال')}
        ${own ? item('data-go="club"', 'clock', 'موعد الإشعار اليومي', 'كل يوم ' + hourLabel(S.settings.notifyHour) + ' · قبل الانتهاء بـ' + U.daysWord(S.settings.alertDays) + (n && n.lastRunAt ? ' · آخر إرسال ' + ago(n.lastRunAt) : '')) : ''}
      </div></div>
      ${own ? `<div class="group"><h3>النادي</h3><div class="list">
        ${item('data-go="club"', 'tag', 'الأسعار والكباتن', S.settings.offers.length + ' عروض · ' + S.settings.captains.length + ' كباتن')}
        ${item('data-go="templates"', 'msg', 'رسائل واتساب', 'التأكيد والتذكير وبعد الانتهاء')}
        ${item('data-go="staff"', 'users', 'حسابات الموظفين', (S.staff.filter(x => x.role !== 'owner' && x.active !== false).map(x => x.name).join('، ') || 'ما في موظفين لسا'))}
      </div></div>
      <div class="group"><h3>البيانات</h3><div class="list">
        ${item('data-act="exportXlsx"', 'sheet', 'تنزيل ملف Excel', 'كل المشتركين وسجل الاشتراكات والحضور')}
        ${item('data-act="backup"', 'db', 'نسخة احتياطية كاملة', 'ملف بتقدر ترجّع منه كل البيانات')}
        ${item('data-act="restore"', 'upload', 'استرجاع من نسخة احتياطية', '')}
      </div></div>` : ''}
      <div class="group"><h3>التطبيق</h3><div class="list">
        ${item('data-go="install"', 'device', 'ثبّت التطبيق على جهازك', isStandalone() ? 'مثبّت على هالجهاز ✓' : 'أندرويد، آيفون، ويندوز')}
        ${item('data-act="theme"', 'moon', 'المظهر', themeL)}
        ${item('data-go="guide"', 'book', 'دليل التشغيل والتحديث', 'الإعداد، التحديثات، وحل المشاكل')}
        ${LS.get('dev', false) ? item('data-go="dev"', 'flask', 'أدوات المطوّر', 'اختبارات وتجربة الإشعارات') : ''}
        ${!demo ? item('data-act="changePass"', 'key', 'تغيير كلمة السر', '') : ''}
        ${!demo ? item('data-act="logout"', 'logout', 'تسجيل خروج', '', '', 'red') : ''}
      </div></div>
      <div class="version" data-act="versionTap"><img src="icons/logo.png" alt="">${esc(S.settings.gymName)} · الإصدار ${esc(CONFIG.version)}${demo ? ' · نسخة تجربة' : ''}</div>`;
  }
};

/* ---------- إعدادات النادي (المالك) ---------- */
VIEWS.club = {
  static: true, hidden: false,
  html() {
    const s = S.settings;
    S.clubDraft = JSON.parse(JSON.stringify(s));
    return pagebar('الأسعار والكباتن', `<button class="btn gold sm" data-act="saveClub">${ic('check', 20)} حفظ</button>`) + `
      <div class="fm mt">
        <div class="field"><label for="c-name">اسم النادي</label><input class="in" id="c-name" value="${esc(s.gymName)}"></div>
        <div class="two">
          <div class="field"><label for="c-alert">التنبيه قبل الانتهاء بـ</label><select class="in" id="c-alert">${[2, 3, 4, 5, 6, 7, 10, 14].map(n => `<option value="${n}"${n === s.alertDays ? ' selected' : ''}>${U.daysWord(n)}</option>`).join('')}</select></div>
          <div class="field"><label for="c-hour">وقت الإشعار اليومي</label><select class="in" id="c-hour">${Array.from({ length: 17 }, (_, i) => i + 6).map(h => `<option value="${h}"${h === s.notifyHour ? ' selected' : ''}>${hourLabel(h)}</option>`).join('')}</select></div>
        </div>
        <section><div class="sec-h"><h2>العروض والأسعار</h2></div><div class="list" data-slot="offers"></div>
          <button class="btn ghost" data-act="offerAdd" style="margin-top:6px">${ic('plus', 20)} أضف عرض</button></section>
        <section><div class="sec-h"><h2>الكباتن</h2></div><div class="pills" data-slot="caps"></div>
          <div class="btn-row mt-s"><input class="in" id="c-cap" placeholder="اسم الكابتن، مثلاً: كابتن سامي"><button class="btn sm" data-act="capAdd" style="height:54px">${ic('plus', 20)} أضف</button></div></section>
        <p class="err" id="c-err" hidden></p>
      </div>`;
  },
  mount(r, root) { drawClubLists(root); const c = $('#c-cap', root); c.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); ACTIONS.capAdd(); } }); }
};
function pagebar(title, end) { return `<div class="pagebar"><button class="iconbtn ghost" data-act="back" aria-label="رجوع">${ic('back', 26)}</button><h2>${esc(title)}</h2>${end || ''}</div>`; }
function drawClubLists(root) {
  const d = S.clubDraft;
  slot(root, 'offers', d.offers.map((o, i) => `<div class="item" style="display:grid;grid-template-columns:minmax(0,1.3fr) 64px minmax(0,1fr) 78px 42px;gap:6px;align-items:center;cursor:default">
    <input class="in" style="height:46px;font-size:15px" data-o="name" data-i="${i}" value="${esc(o.name)}" aria-label="اسم العرض">
    <input class="in" style="height:46px;font-size:15px;text-align:center" data-o="amount" data-i="${i}" inputmode="numeric" value="${esc(o.amount)}" aria-label="المدة">
    <select class="in" style="height:46px;font-size:14px;padding-inline:6px" data-o="unit" data-i="${i}" aria-label="الوحدة"><option value="month"${o.unit === 'month' ? ' selected' : ''}>شهر</option><option value="week"${o.unit === 'week' ? ' selected' : ''}>أسبوع</option><option value="day"${o.unit === 'day' ? ' selected' : ''}>يوم</option></select>
    <input class="in" style="height:46px;font-size:15px;text-align:center" data-o="price" data-i="${i}" inputmode="decimal" value="${esc(o.price == null ? '' : o.price)}" placeholder="د.أ" aria-label="السعر">
    <button class="iconbtn ghost" data-act="offerDel" data-i="${i}" aria-label="احذف" style="color:var(--bad)">${ic('trash', 20)}</button></div>`).join(''));
  slot(root, 'caps', d.captains.map((c, i) => `<span class="pill" style="display:inline-flex;align-items:center;gap:6px;cursor:default">${ic('crown', 16)}${esc(c)}<button data-act="capDel" data-i="${i}" aria-label="احذف ${esc(c)}" style="color:var(--muted)">${ic('x', 16)}</button></span>`).join('') || '<span class="hint">ما في كباتن</span>');
  $$('[data-o]', root).forEach(el => el.addEventListener('input', () => { const o = S.clubDraft.offers[+el.dataset.i]; if (o) o[el.dataset.o] = U.toLatin(el.value); }));
}

/* ---------- رسائل واتساب ---------- */
VIEWS.templates = {
  static: true,
  html() {
    const t = S.settings.templates;
    const ex = { name: 'محمد العلي', offer: 'شهر', price: 20, startDate: today(), endDate: U.addMonths(today(), 1) };
    const box = (k, title, sub) => `<div class="field"><label for="t-${k}">${title}</label><small class="hint">${sub}</small><textarea class="in" id="t-${k}" rows="5">${esc(t[k])}</textarea><div class="summary" data-prev="${k}">${esc(U.fillTemplate(k, k === 'expired' ? Object.assign({}, ex, { endDate: U.addDays(today(), -2) }) : k === 'soon' ? Object.assign({}, ex, { endDate: U.addDays(today(), 3) }) : ex, S.settings, today())).replace(/\n/g, '<br>')}</div></div>`;
    return pagebar('رسائل واتساب', `<button class="btn gold sm" data-act="saveTpl">${ic('check', 20)} حفظ</button>`) + `
      <div class="md mt" style="font-size:13.5px;color:var(--ink-2)">الكلمات بين الأقواس بتتبدّل لحالها: <code>{الاسم}</code> <code>{النادي}</code> <code>{العرض}</code> <code>{البداية}</code> <code>{التاريخ}</code> (الانتهاء) <code>{المتبقي}</code> <code>{المبلغ}</code></div>
      <div class="fm mt">${box('confirm', 'تأكيد الاشتراك', 'بتنبعت (إذا بدك) لما تسجّل أو تجدّد')}${box('soon', 'تذكير قبل الانتهاء', 'من شاشة التذكيرات')}${box('expired', 'بعد الانتهاء', 'للي خلص اشتراكهم')}</div>`;
  },
  mount(r, root) {
    const ex = { name: 'محمد العلي', offer: 'شهر', price: 20, startDate: today(), endDate: U.addMonths(today(), 1) };
    ['confirm', 'soon', 'expired'].forEach(k => {
      const ta = $('#t-' + k, root);
      ta.addEventListener('input', () => {
        const s = Object.assign({}, S.settings, { templates: Object.assign({}, S.settings.templates, { [k]: ta.value }) });
        const m = k === 'expired' ? Object.assign({}, ex, { endDate: U.addDays(today(), -2) }) : k === 'soon' ? Object.assign({}, ex, { endDate: U.addDays(today(), 3) }) : ex;
        $(`[data-prev="${k}"]`, root).innerHTML = esc(U.fillTemplate(k, m, s, today())).replace(/\n/g, '<br>');
      });
    });
  }
};

/* ---------- الموظفين ---------- */
VIEWS.staff = {
  html() {
    const list = S.staff.slice().sort((a, b) => (a.role === 'owner' ? -1 : 1) - (b.role === 'owner' ? -1 : 1));
    const existing = new Set(list.map(x => x.name));
    const sugg = [['جهاد', 'jihad'], ['نور', 'noor'], ['محمود', 'mahmoud']].filter(([n]) => !existing.has(n));
    return pagebar('حسابات الموظفين', `<button class="btn gold sm" data-act="addStaff">${ic('userPlus', 20)} موظف</button>`) + `
      <p class="hint mt">كل موظف بيدخل باسم مستخدم وكلمة سر خاصين فيه، وكل اشتراك بينسجل باسم الموظف اللي سجّله.</p>
      ${sugg.length ? `<div class="pills mt-s">${sugg.map(([n, u]) => `<button class="pill" data-act="addStaff" data-n="${n}" data-u="${u}">${ic('plus', 16)} ${n}</button>`).join('')}</div>` : ''}
      <ul class="list mt">${list.map(x => `<li class="row" style="cursor:default">${avHTML({ name: x.name }, x.active === false ? 'st-expired' : '')}<div class="rm"><div class="nm">${esc(x.name)}</div><div class="sub"><span class="ltr">${esc(x.username || '')}</span> · ${x.role === 'owner' ? 'المالك' : x.active === false ? 'موقوف' : 'موظف'}</div></div>
        ${x.role === 'owner' ? '' : `<button class="btn sm ${x.active === false ? 'gold' : 'red'}" data-act="staffToggle" data-uid="${esc(x.uid)}">${x.active === false ? 'فعّل' : 'أوقف'}</button>`}</li>`).join('') || '<li class="row">…</li>'}</ul>
      <div class="preview-note mt"><b>نسي موظف كلمة السر؟</b>أوقف حسابه القديم واعمله حساب جديد باسم مستخدم ثاني (مثلاً jihad2).</div>`;
  }
};

/* ---------- تثبيت التطبيق ---------- */
VIEWS.install = {
  static: true,
  html() {
    const steps = isIOS
      ? ['افتح التطبيق من متصفح <b>Safari</b>.', 'اضغط زر المشاركة ' + `<span style="display:inline-flex;vertical-align:middle">${ic('share', 18)}</span>` + ' تحت.', 'اختار <b>إضافة إلى الشاشة الرئيسية</b> (Add to Home Screen).', 'افتح التطبيق من الأيقونة الجديدة، وفعّل الإشعارات من الإعدادات.']
      : isAndroid
        ? ['افتح التطبيق من <b>Chrome</b>.', 'اضغط القائمة ⋮ فوق.', 'اختار <b>تثبيت التطبيق</b> أو <b>إضافة إلى الشاشة الرئيسية</b>.', 'افتحه من الأيقونة وفعّل الإشعارات.']
        : ['افتح التطبيق من <b>Chrome</b> أو <b>Edge</b>.', 'اضغط أيقونة التثبيت بآخر شريط العنوان (شاشة صغيرة مع سهم).', 'اضغط <b>تثبيت</b>، وبيصير إله أيقونة على سطح المكتب وقائمة ابدأ.', 'فعّل الإشعارات من الإعدادات.'];
    return pagebar('ثبّت التطبيق') + `
      <div class="pf-head mt"><img src="icons/icon-192.png" alt="" style="width:92px;border-radius:24px;box-shadow:var(--shadow)"><h1>${esc(S.settings.gymName)}</h1><p class="hint" style="justify-content:center">${isStandalone() ? 'التطبيق مثبّت وشغّال كتطبيق ✓' : 'بيشتغل كتطبيق عادي: أيقونة على الشاشة، شاشة كاملة، وإشعارات.'}</p></div>
      ${S.installEvt ? `<button class="btn gold block mt" data-act="installNow">${ic('download')} ثبّت هلأ</button>` : ''}
      <ol class="install-steps mt">${steps.map(s => `<li class="card">${s}</li>`).join('')}</ol>
      ${isIOS ? '<div class="preview-note mt"><b>مهم للآيفون</b>الإشعارات بتشتغل بس إذا فتحت التطبيق من الأيقونة على الشاشة الرئيسية (iOS 16.4 أو أحدث).</div>' : ''}`;
  }
};

/* ---------- دليل التشغيل ---------- */
VIEWS.guide = {
  static: true,
  html() { return pagebar('دليل التشغيل والتحديث') + '<article class="md mt" id="guideBody"><p class="hint">جاري التحميل…</p></article>'; },
  async mount(r, root) {
    try {
      const res = await fetch('guide.txt', { cache: 'no-cache' });
      const txt = await res.text();
      const el = $('#guideBody', root); if (el) el.innerHTML = md(txt);
    } catch (e) { const el = $('#guideBody', root); if (el) el.innerHTML = '<p>ما قدرنا نفتح الدليل. افتح ملف README.md من مشروعك على GitHub.</p>'; }
  }
};
function md(src) {
  const inline = s => esc(s).replace(/`([^`]+)`/g, '<code>$1</code>').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = []; let list = null, code = null, para = [];
  const flushP = () => { if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); para = []; } };
  const flushL = () => { if (list) { out.push(`<${list.t}>${list.items.map(i => '<li>' + inline(i) + '</li>').join('')}</${list.t}>`); list = null; } };
  for (const line of src.replace(/\r/g, '').split('\n')) {
    if (code) { if (/^```/.test(line)) { out.push('<pre><code>' + esc(code.join('\n')) + '</code></pre>'); code = null; } else code.push(line); continue; }
    if (/^```/.test(line)) { flushP(); flushL(); code = []; continue; }
    let m;
    if ((m = /^(#{1,3})\s+(.*)/.exec(line))) { flushP(); flushL(); out.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`); continue; }
    if ((m = /^>\s?(.*)/.exec(line))) { flushP(); flushL(); out.push('<blockquote>' + inline(m[1]) + '</blockquote>'); continue; }
    if ((m = /^\s*\d+[.)]\s+(.*)/.exec(line))) { flushP(); if (!list || list.t !== 'ol') { flushL(); list = { t: 'ol', items: [] }; } list.items.push(m[1]); continue; }
    if ((m = /^\s*[-*]\s+(.*)/.exec(line))) { flushP(); if (!list || list.t !== 'ul') { flushL(); list = { t: 'ul', items: [] }; } list.items.push(m[1]); continue; }
    if (!line.trim()) { flushP(); flushL(); continue; }
    if (list) { list.items[list.items.length - 1] += ' ' + line.trim(); continue; }
    para.push(line.trim());
  }
  flushP(); flushL();
  return out.join('\n');
}

/* ---------- أدوات المطوّر (مخفية) ---------- */
VIEWS.dev = {
  hidden: true,
  html() {
    const n = (S.meta && S.meta.notify) || {}, p = pushInfo();
    const dg = U.buildDigest(S.members, S.settings, today());
    const tests = S.devTests;
    const row = (k, v) => `<li><span style="flex:1;color:var(--muted)">${k}</span><span class="ltr" style="font-weight:600">${v}</span></li>`;
    return pagebar('أدوات المطوّر') + `
      <div class="group"><h3>معلومات</h3><ul class="list dev-res">
        ${row('الإصدار', esc(CONFIG.version))}${row('نوع التخزين', S.store.mode === 'demo' ? 'demo (local)' : 'Firebase')}
        ${row('Service Worker', S.swReg ? 'active' : 'off')}${row('الإشعارات', esc(p.code))}
        ${row('الإنترنت', S.online ? 'online' : 'offline')}${row('المشتركين', S.members.length + (S.members.filter(m => m.isTest).length ? ' (تجريبي ' + S.members.filter(m => m.isTest).length + ')' : ''))}
        ${row('التاريخ بالتطبيق', esc(today()) + (S.simToday ? ' (محاكاة)' : ''))}${row('مثبّت كتطبيق', isStandalone() ? 'yes' : 'no')}
      </ul></div>
      <div class="group"><h3>الاختبارات</h3><div class="card pad"><button class="btn gold block" data-act="runTests">${ic('flask')} شغّل كل الاختبارات</button></div>
        ${tests ? `<ul class="list dev-res mt-s">${tests.map(x => `<li><span class="${x.ok ? 'ok-t' : 'bad-t'}">${x.ok ? '✓' : '✗'}</span><span style="flex:1">${esc(x.name)}${x.detail ? `<small>${esc(x.detail)}</small>` : ''}</span></li>`).join('')}</ul>
          <p class="hint mt-s">${tests.filter(x => x.ok).length} من ${tests.length} نجحوا</p>` : ''}</div>
      <div class="group"><h3>الإشعارات</h3><div class="card pad fm">
        <div class="summary"><b>إشعار الصبح لـ${esc(U.fmtShort(today()))}:</b><br>${esc(dg.title)}<br>${esc(dg.body)}</div>
        <div class="btn-row"><button class="btn sm" data-act="testDigest">${ic('bell', 20)} اعرضه كإشعار</button><button class="btn sm" data-act="testLocal">${ic('send', 20)} إشعار تجريبي</button></div>
        <button class="btn sm" data-act="testServer">${ic('send', 20)} اطلب إشعار تجريبي من السيرفر</button>
        <div class="hint">آخر تشغيل للسيرفر: ${n.heartbeatAt ? ago(n.heartbeatAt) : 'ولا مرة'} · آخر إرسال يومي: ${n.lastRunAt ? esc(U.fmtShort(n.lastDate || '')) + ' ' + clock(n.lastRunAt) : '—'}${n.lastResult ? ' · وصل لـ' + n.lastResult.ok + ' من ' + n.lastResult.devices + ' أجهزة' : ''}</div>
        ${n.lastTestResult ? `<div class="hint">آخر إشعار تجريبي من السيرفر: وصل لـ${n.lastTestResult.ok} من ${n.lastTestResult.devices}</div>` : ''}
        ${S.meta && S.meta.testRequest ? `<div class="hint">آخر طلب تجربة: ${ago(new Date(S.meta.testRequest.at).toISOString())}${n.lastTestAt && n.lastTestAt >= S.meta.testRequest.at ? ' · انبعت ✓' : ' · بيستنى السيرفر (لحد ساعة)'}</div>` : ''}
        ${S.subs ? `<div class="hint">الأجهزة المسجّلة للإشعارات: ${S.subs.length}${S.subs.length ? ' — ' + S.subs.map(x => esc((x.name || '') + ' · ' + (x.device || ''))).join('، ') : ''}</div>` : ''}
      </div></div>
      <div class="group"><h3>محاكاة التاريخ</h3><div class="card pad fm">
        <p class="hint">خلّي التطبيق يتصرف كأنه اليوم تاريخ ثاني، عشان تشوف مين بيطلع بالتذكيرات وشو بيكون إشعار الصبح. بتنطبق على هالجهاز بس لحد ما تسكّر التطبيق.</p>
        <div class="btn-row"><input class="in" type="date" id="simDate" value="${esc(today())}"><button class="btn sm" data-act="simSet" style="height:54px">طبّق</button></div>
        <div class="btn-row">${[1, 3, 7, 30].map(d => `<button class="btn sm" data-act="simAdd" data-d="${d}">+${d}</button>`).join('')}</div>
        ${S.simToday ? `<button class="btn sm red" data-act="simOff">رجّع لتاريخ اليوم</button>` : ''}
      </div></div>
      <div class="group"><h3>بيانات تجريبية</h3><div class="card pad btn-row">
        <button class="btn sm" data-act="testAdd">${ic('plus', 20)} أضف 15 تجريبي</button>
        <button class="btn sm red" data-act="testDel">${ic('trash', 20)} احذف التجريبي</button></div></div>
      <div class="group"><h3>أدوات</h3><div class="card pad fm">
        <div class="btn-row"><button class="btn sm" data-act="forceUpdate">${ic('renew', 20)} حدّث التطبيق</button><button class="btn sm" data-act="clearCache">${ic('trash', 20)} امسح الكاش</button></div>
        ${S.store.mode === 'demo' ? `<button class="btn sm" data-act="resetDemo">${ic('renew', 20)} رجّع بيانات التجربة من الأول</button>` : ''}
        <div class="sec-h" style="margin:6px 0 0"><h2 style="font-size:15px">سجل الأخطاء (${LOG.length})</h2><button class="lnk" data-act="copyLog" style="color:var(--gold-text);font-weight:600">نسخ</button></div>
        <div class="mono">${LOG.length ? LOG.slice(0, 15).map(l => esc(l.t.slice(5, 16).replace('T', ' ') + ' [' + l.where + '] ' + l.msg)).join('\n') : 'ما في أخطاء ✓'}</div>
        ${LOG.length ? `<button class="btn sm" data-act="clearLog">امسح السجل</button>` : ''}
        <button class="btn sm ghost" data-act="devLock">خبّي أدوات المطوّر</button>
      </div></div>`;
  }
};

/* ---------- الدخول ---------- */
function loginHTML() {
  return `<div class="auth"><img class="crest" src="icons/logo.png" alt="الأمير جيم"><h1>أهلاً فيك</h1><p class="lead">سجّل دخولك بحسابك</p>
    <form class="fm" id="loginForm" novalidate>
      <div class="field"><label for="lu">اسم المستخدم</label><input class="in ltr" id="lu" autocomplete="username" autocapitalize="none" spellcheck="false" placeholder="مثلاً: jihad"></div>
      <div class="field"><label for="lp">كلمة السر</label><input class="in ltr" id="lp" type="password" autocomplete="current-password"></div>
      <p class="err" id="le" hidden></p>
      <button class="btn gold block" id="lb" type="submit">دخول</button>
      <button type="button" class="btn ghost" data-act="forgot">نسيت كلمة السر؟</button>
    </form></div>`;
}
function setupHTML() {
  return `<div class="auth"><img class="crest" src="icons/logo.png" alt="الأمير جيم"><h1>تجهيز التطبيق</h1><p class="lead">أول مرة؟ اعمل حساب المالك. الموظفين بتضيفهم بعدين من الإعدادات.</p>
    <form class="fm" id="setupForm" novalidate>
      <div class="field"><label for="sn">اسمك</label><input class="in" id="sn" autocomplete="name"></div>
      <div class="field"><label for="sg">اسم النادي</label><input class="in" id="sg" value="الأمير جيم"></div>
      <div class="field"><label for="se">إيميلك (لاسترجاع كلمة السر)</label><input class="in ltr" id="se" type="email" autocomplete="email"></div>
      <div class="field"><label for="sp">كلمة السر (6 أحرف أو أكثر)</label><input class="in ltr" id="sp" type="password" autocomplete="new-password"></div>
      <p class="err" id="sErr" hidden></p>
      <button class="btn gold block" id="sb" type="submit">ابدأ</button>
    </form></div>`;
}
function bindAuth() {
  const lf = $('#loginForm');
  if (lf) lf.addEventListener('submit', async e => {
    e.preventDefault();
    const u = $('#lu').value.trim(), p = $('#lp').value, er = $('#le'), b = $('#lb');
    if (!u || !p) { er.textContent = 'اكتب اسم المستخدم وكلمة السر'; er.hidden = false; return; }
    b.disabled = true; er.hidden = true;
    try { await S.store.login(u, p); } catch (x) { er.textContent = errText(x); er.hidden = false; b.disabled = false; }
  });
  const sf = $('#setupForm');
  if (sf) sf.addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#sn').value.trim(), gym = $('#sg').value.trim(), email = $('#se').value.trim(), pass = $('#sp').value, er = $('#sErr'), b = $('#sb');
    if (!name || !email || pass.length < 6) { er.textContent = 'عبّي اسمك وإيميلك وكلمة سر 6 أحرف أو أكثر'; er.hidden = false; return; }
    b.disabled = true; er.hidden = true;
    try { await S.store.setupOwner({ name, email, password: pass, gymName: gym }); }
    catch (x) { logErr(x, 'setup'); er.textContent = errText(x); er.hidden = false; b.disabled = false; }
  });
}

/* =========================================================
   النوافذ (Sheets)
   ========================================================= */
function openSheet({ title, sub, body, foot, onMount }) {
  let w = $('#sheetWrap');
  if (w && w.classList.contains('closing')) { w.remove(); w = null; }
  if (!w) {
    w = document.createElement('div'); w.id = 'sheetWrap'; w.className = 'sheet-wrap'; w.dir = 'rtl';
    w.innerHTML = '<div class="scrim" data-close></div><section class="sheet" role="dialog" aria-modal="true" aria-labelledby="shTitle"></section>';
    document.body.appendChild(w);
    document.documentElement.classList.add('lock');
    S.sheetPushed = false;
    if (USE_HISTORY) { try { history.pushState({ sheet: 1 }, ''); S.sheetPushed = true; } catch (e) {} }
  }
  const sh = $('.sheet', w);
  sh.innerHTML = `<div class="grab"></div><div class="sh-h"><div style="flex:1;min-width:0"><h2 id="shTitle">${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div><button class="iconbtn ghost" data-close aria-label="إغلاق">${ic('x', 24)}</button></div><div class="sh-b">${body}</div>${foot ? `<div class="sh-f">${foot}</div>` : ''}`;
  S.sheetOpen = true;
  if (onMount) onMount(sh);
  return sh;
}
function doCloseSheet() {
  const w = $('#sheetWrap'); if (!w) return;
  S.sheetOpen = false;
  w.classList.add('closing');
  document.documentElement.classList.remove('lock');
  setTimeout(() => { if (w.classList.contains('closing')) w.remove(); }, reduceMotion() ? 0 : 290);
}
function closeSheet() {
  return new Promise(res => {
    if (!S.sheetPushed) { doCloseSheet(); res(); return; }
    S.sheetPushed = false; S.popWait = res;
    try { history.back(); } catch (e) { S.popWait = null; doCloseSheet(); res(); return; }
    setTimeout(() => {
      if (S.popWait === res) { S.popWait = null; S.ignorePop = true; setTimeout(() => { S.ignorePop = false; }, 1500); doCloseSheet(); res(); }
    }, 500);
  });
}

/* ---------- نموذج المشترك (جديد / تعديل) ---------- */
function offerCards(selId) {
  return S.settings.offers.map(o => `<button type="button" class="offer" data-oid="${esc(o.id)}" aria-pressed="${o.id === selId}"><span class="on">${esc(o.name)}</span><span class="op">${o.price == null ? '—' : esc(o.price)}<small>${o.price == null ? '' : 'د.أ'}</small></span></button>`).join('') +
    `<button type="button" class="offer" data-oid="custom" aria-pressed="${selId === 'custom'}"><span class="on">مدة مخصصة</span><span class="op" style="font-size:15px">${ic('edit', 18)}</span></button>`;
}
function capPills(sel) {
  return ['', ...S.settings.captains].map(c => `<button type="button" class="pill" data-cap="${esc(c)}" aria-pressed="${(sel || '') === c}">${c ? esc(c) : 'بدون'}</button>`).join('');
}
function offerById(id) { return S.settings.offers.find(o => o.id === id); }
function offerIdFor(m) { if (m.offerId && offerById(m.offerId)) return m.offerId; const o = S.settings.offers.find(x => x.name === m.offer); return o ? o.id : 'custom'; }
function durFields(p, F) {
  return `<div class="field"><span class="lbl">العرض</span><div class="offers" data-slot="${p}offers">${offerCards(F.offerId)}</div></div>
    <div class="two" id="${p}custom" ${F.offerId === 'custom' ? '' : 'hidden'}>
      <div class="field"><label for="${p}amt">المدة</label><input class="in" id="${p}amt" inputmode="numeric" value="${esc(F.amount)}"></div>
      <div class="field"><label for="${p}unit">الوحدة</label><select class="in" id="${p}unit"><option value="month">شهر</option><option value="week">أسبوع</option><option value="day">يوم</option></select></div>
    </div>
    <div class="two">
      <div class="field"><label for="${p}start">من تاريخ</label><input class="in" type="date" id="${p}start" value="${esc(F.start)}"></div>
      <div class="field"><label for="${p}end">لتاريخ</label><input class="in" type="date" id="${p}end" value="${esc(F.end)}"></div>
    </div>
    <div class="summary" id="${p}sum"></div>
    <div class="field"><label for="${p}price">المبلغ المدفوع (دينار)</label><input class="in" id="${p}price" inputmode="decimal" value="${esc(F.price == null ? '' : F.price)}" placeholder="اختياري"></div>
    <div class="field"><span class="lbl">الكابتن</span><div class="pills" data-slot="${p}caps">${capPills(F.captain)}</div></div>`;
}
function wireDur(sh, p, F) {
  const g = id => $('#' + p + id, sh);
  g('unit').value = F.unit || 'month';
  const sum = () => {
    const s = g('start').value, e = g('end').value, n = U.diffDays(s, e);
    g('sum').innerHTML = (U.parseD(s) && U.parseD(e) && n >= 0)
      ? `من <b>${esc(U.fmtD(s))}</b> لغاية <b>${esc(U.fmtD(e))}</b><br><span style="color:var(--muted)">${n === 0 ? 'يوم واحد' : U.daysWord(n)} · ${esc(F.offerId === 'custom' ? U.durLabel(g('amt').value, g('unit').value) : (offerById(F.offerId) || {}).name || '')}</span>`
      : 'اختار العرض وتاريخ البداية';
  };
  const recompute = () => {
    let amt, unit;
    if (F.offerId === 'custom') { amt = U.toLatin(g('amt').value); unit = g('unit').value; }
    else { const o = offerById(F.offerId); amt = o ? o.amount : 1; unit = o ? o.unit : 'month'; }
    const e = U.computeEnd(g('start').value, amt, unit); if (e) g('end').value = e;
    sum();
  };
  $(`[data-slot="${p}offers"]`, sh).addEventListener('click', e => {
    const b = e.target.closest('[data-oid]'); if (!b) return;
    F.offerId = b.dataset.oid;
    $$('[data-oid]', sh).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    g('custom').hidden = F.offerId !== 'custom';
    const o = offerById(F.offerId);
    if (o) g('price').value = o.price == null ? '' : o.price;
    recompute();
  });
  $(`[data-slot="${p}caps"]`, sh).addEventListener('click', e => {
    const b = e.target.closest('[data-cap]'); if (!b) return;
    F.captain = b.dataset.cap;
    $$('[data-cap]', sh).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
  });
  g('amt').addEventListener('input', recompute); g('unit').addEventListener('change', recompute);
  g('start').addEventListener('change', recompute); g('end').addEventListener('change', sum);
  sum();
  return () => {
    let amount, unit, offer;
    if (F.offerId === 'custom') { amount = Math.max(1, Math.round(Number(U.toLatin(g('amt').value)) || 1)); unit = g('unit').value; offer = U.durLabel(amount, unit); }
    else { const o = offerById(F.offerId) || {}; amount = o.amount; unit = o.unit; offer = o.name; }
    const pr = U.toLatin(g('price').value).trim().replace(',', '.');
    const price = pr === '' ? null : Number(pr);
    const startDate = g('start').value, endDate = g('end').value;
    let err = '';
    if (!U.parseD(startDate) || !U.parseD(endDate)) err = 'حدّد تاريخ البداية والانتهاء';
    else if (U.diffDays(startDate, endDate) < 0) err = 'تاريخ الانتهاء لازم يكون بعد البداية';
    else if (price !== null && !(price >= 0)) err = 'المبلغ لازم يكون رقم';
    return { err, data: { offer, offerId: F.offerId, amount, unit, price, startDate, endDate, captain: F.captain || '' } };
  };
}
function confirmSwitch(id, on) {
  return `<label class="switch-row" for="${id}">${ic('wa', 26)}<span class="tx"><b>ابعت تأكيد على واتساب</b><small>رسالة فيها تاريخ التسجيل وتاريخ الانتهاء. اطفيها وإنت عم تنقل من الدفتر.</small></span><span class="sw"><input type="checkbox" id="${id}" ${on ? 'checked' : ''}><span></span></span></label>`;
}
function memberForm(m, preset) {
  preset = preset || {};
  const editing = !!m;
  const first = S.settings.offers[0] || { id: 'custom', amount: 1, unit: 'month', price: null };
  const F = editing
    ? { offerId: offerIdFor(m), amount: m.amount || 1, unit: m.unit || 'month', start: m.startDate, end: m.endDate, price: m.price, captain: m.captain || '', section: m.section || 'men' }
    : { offerId: preset.offerId || first.id, amount: 1, unit: 'month', start: today(), end: '', price: null, captain: '', section: preset.section || (S.section !== 'all' ? S.section : 'men') };
  if (!editing) { const o = offerById(F.offerId) || first; F.amount = o.amount; F.unit = o.unit; F.price = o.price; F.end = U.computeEnd(F.start, o.amount, o.unit); }
  const body = `<form class="fm" id="mf" novalidate>
      <div class="field"><label for="f-name">الاسم</label><input class="in" id="f-name" autocomplete="off" value="${esc(editing ? m.name : (preset.name || ''))}" placeholder="الاسم الثلاثي"></div>
      <div class="field"><label for="f-phone">رقم الجوال</label><input class="in ltr" id="f-phone" type="tel" inputmode="tel" autocomplete="off" value="${esc(editing ? m.phone : (preset.phone || ''))}" placeholder="07X XXX XXXX"><div class="hint" id="f-ph"></div></div>
      <div class="field"><span class="lbl">القسم</span>${segHTML('fSec', F.section, [['men', 'رجال'], ['women', 'سيدات']])}</div>
      ${durFields('f-', F)}
      <div class="field"><label for="f-notes">ملاحظات</label><textarea class="in" id="f-notes" placeholder="مثلاً: إصابة، دفع نص المبلغ، رقم ثاني…">${esc(editing ? (m.notes || '') : '')}</textarea></div>
      ${editing ? '' : confirmSwitch('f-wa', LS.get('sendConfirm', true))}
      <p class="err" id="f-err" hidden></p>
    </form>`;
  openSheet({
    title: editing ? 'تعديل البيانات' : (preset.offerId === 'day' ? 'Day Pass' : 'اشتراك جديد'),
    sub: editing ? m.name : 'عبّي البيانات وسجّل',
    body,
    foot: `<button class="btn gold" type="submit" form="mf">${ic('check')} ${editing ? 'حفظ التعديلات' : 'تسجيل الاشتراك'}</button>`,
    onMount(sh) {
      const read = wireDur(sh, 'f-', F);
      sh.addEventListener('click', e => { const b = e.target.closest('[data-act="fSec"]'); if (!b) return; F.section = b.dataset.v; $$('[data-act="fSec"]', sh).forEach(x => x.setAttribute('aria-pressed', String(x === b))); });
      const ph = $('#f-phone', sh), hint = $('#f-ph', sh);
      const upd = () => {
        const v = ph.value.trim(); let cls = '', h = 'مثال: 0791234567';
        if (v) {
          const i = U.intlPhone(v);
          const dup = S.members.find(x => (!m || x.id !== m.id) && U.intlPhone(x.phone) === i);
          if (dup) { cls = 'warn'; h = `مسجّل باسم «${esc(dup.name)}» <button type="button" data-act="open" data-id="${esc(dup.id)}">افتح ملفه</button>`; }
          else if (U.isJoMobile(v)) { cls = 'ok'; h = 'رقم أردني ✓'; }
          else { cls = 'warn'; h = i.startsWith('962') ? 'الرقم الأردني 10 أرقام ويبلّش بـ 07' : 'إذا مش أردني اكتبه مع رمز الدولة'; }
        }
        hint.className = 'hint ' + cls; hint.innerHTML = h;
      };
      ph.addEventListener('input', upd); upd();
      $('#mf', sh).addEventListener('submit', e => {
        e.preventDefault();
        const err = $('#f-err', sh);
        const name = $('#f-name', sh).value.trim().replace(/\s+/g, ' ');
        const phone = ph.value.trim();
        if (!name) { err.textContent = 'اكتب اسم المشترك'; err.hidden = false; return; }
        const r = read(); if (r.err) { err.textContent = r.err; err.hidden = false; return; }
        const shortPass = U.diffDays(r.data.startDate, r.data.endDate) < 7;
        if (phone ? U.intlPhone(phone).length < 8 : !shortPass) { err.textContent = 'اكتب رقم جوال صحيح'; err.hidden = false; return; }
        const now = nowIso(), who = S.user.name;
        const data = Object.assign({ name, phone: U.localPhone(phone), section: F.section, notes: $('#f-notes', sh).value.trim(), updatedAt: now, updatedByName: who }, r.data);
        let id;
        if (editing) {
          if (m.endDate !== data.endDate) data.remindKey = null;
          S.store.updateMember(m.id, data); id = m.id;
        } else {
          Object.assign(data, { createdAt: now, createdBy: S.user.uid, createdByName: who, periodByName: who, periodAt: now, history: [], visits: [], remindKey: null });
          id = S.store.addMember(data);
          const send = $('#f-wa', sh).checked;
          LS.set('sendConfirm', send);
          if (send && data.phone) openExternal(U.waLink(data.phone, U.fillTemplate('confirm', data, S.settings, today())));
        }
        closeSheet();
        toast(editing ? 'انحفظت التعديلات ✓' : 'تم تسجيل ' + U.firstName(name) + ' ✓', editing ? null : { label: 'افتح ملفه', fn: () => go('member', { id }) });
      });
    }
  });
}

/* ---------- تجديد ---------- */
function renewForm(m) {
  const d = dl(m);
  const start = (!isNaN(d) && d >= 0 && !U.isShort(m)) ? m.endDate : today();
  const oid = offerIdFor(m) === 'custom' || offerIdFor(m) === 'day' ? (S.settings.offers[0] || {}).id : offerIdFor(m);
  const o = offerById(oid) || { amount: 1, unit: 'month', price: null };
  const F = { offerId: oid, amount: o.amount, unit: o.unit, start, end: U.computeEnd(start, o.amount, o.unit), price: o.price, captain: m.captain || '' };
  openSheet({
    title: 'تجديد الاشتراك', sub: m.name,
    body: `<form class="fm" id="rf" novalidate>
      <div class="summary">${d >= 0 ? `الاشتراك الحالي بينتهي <b>${esc(U.fmtD(m.endDate))}</b>، فالتجديد بيكمّل من نفس اليوم وما بيضيع عليه ولا يوم.` : `الاشتراك انتهى <b>${esc(U.fmtD(m.endDate))}</b>، فالتجديد بيبلّش من اليوم.`}</div>
      ${durFields('r-', F)}
      ${confirmSwitch('r-wa', LS.get('sendConfirm', true))}
      <p class="err" id="r-err" hidden></p></form>`,
    foot: `<button class="btn gold" type="submit" form="rf">${ic('renew')} تأكيد التجديد</button>`,
    onMount(sh) {
      const read = wireDur(sh, 'r-', F);
      $('#rf', sh).addEventListener('submit', e => {
        e.preventDefault();
        const r = read(); if (r.err) { const er = $('#r-err', sh); er.textContent = r.err; er.hidden = false; return; }
        const now = nowIso(), who = S.user.name;
        const hist = (Array.isArray(m.history) ? m.history.slice() : []);
        hist.push({ offer: m.offer || '', offerId: m.offerId || '', startDate: m.startDate || '', endDate: m.endDate || '', price: m.price == null ? null : m.price, captain: m.captain || '', byName: m.periodByName || m.createdByName || '', at: m.periodAt || m.createdAt || '' });
        const data = Object.assign({}, r.data, { history: hist.slice(-80), remindKey: null, periodByName: who, periodAt: now, updatedAt: now, updatedByName: who });
        S.store.updateMember(m.id, data);
        const send = $('#r-wa', sh).checked; LS.set('sendConfirm', send);
        if (send) openExternal(U.waLink(m.phone, U.fillTemplate('confirm', Object.assign({}, m, data), S.settings, today())));
        closeSheet();
        toast('تجدّد اشتراك ' + U.firstName(m.name) + ' لغاية ' + U.fmtShort(data.endDate) + ' ✓');
      });
    }
  });
}

/* ---------- قائمة رسائل واتساب لمشترك ---------- */
function waMenu(m) {
  const t = today();
  const opt = (kind, title) => {
    const txt = U.fillTemplate(kind, m, S.settings, t);
    return `<a class="item" href="${esc(U.waLink(m.phone, txt))}" target="_blank" rel="noopener" data-act="wa" data-id="${esc(m.id)}" data-kind="${kind}"><span class="bub" style="color:var(--wa)">${ic('wa', 22)}</span><span class="tx"><b>${title}</b><small>${esc(txt.split('\n').slice(0, 2).join(' '))}</small></span>${ic('chev', 20)}</a>`;
  };
  openSheet({
    title: 'رسالة واتساب', sub: m.name + ' · ' + U.prettyPhone(m.phone),
    body: `<div class="list group" style="margin-top:0">${opt(U.remindKind(m, t), dl(m) < 0 ? 'تذكير بالتجديد' : 'تذكير بالانتهاء')}${opt('confirm', 'تأكيد الاشتراك')}
      <a class="item" href="${esc(U.waLink(m.phone, ''))}" target="_blank" rel="noopener"><span class="bub" style="color:var(--wa)">${ic('msg', 22)}</span><span class="tx"><b>رسالة فاضية</b><small>بتكتب اللي بدك إياه</small></span>${ic('chev', 20)}</a></div>`
  });
}

/* ---------- تأكيد عام ---------- */
function confirmSheet({ title, text, okLabel, danger, onOk }) {
  openSheet({
    title, body: `<p style="margin:0;color:var(--ink-2)">${text}</p>`,
    foot: `<button class="btn" data-close>تراجع</button><button class="btn ${danger ? 'redsolid' : 'gold'}" id="cOk">${esc(okLabel)}</button>`,
    onMount(sh) { $('#cOk', sh).addEventListener('click', () => { closeSheet().then(onOk); }); }
  });
}

/* =========================================================
   الأفعال
   ========================================================= */
const ACTIONS = {
  back, logout: () => S.store.logout(),
  new: () => memberForm(null),
  dayPass: () => memberForm(null, { offerId: S.settings.offers.some(o => o.id === 'day') ? 'day' : undefined }),
  goSearch: () => { S.checkin = false; S.q = ''; go('members', { focus: true }); },
  checkinMode: () => { S.checkin = true; S.q = ''; S.filter = 'all'; go('members', { focus: true }); },
  checkinOff: () => { S.checkin = false; VIEWS.members.update(); },
  open: el => { const id = el.dataset.id; if (S.byId[id]) go('member', { id }); },
  edit: el => { const m = S.byId[el.dataset.id]; if (m) memberForm(m); },
  renew: el => { const m = S.byId[el.dataset.id]; if (m) renewForm(m); },
  waMenu: el => { const m = S.byId[el.dataset.id]; if (m) waMenu(m); },
  section: el => { S.section = el.dataset.v; LS.set('section', S.section); $$('[data-act="section"]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === S.section))); refresh(); },
  filter: el => { S.filter = el.dataset.f; S.q = ''; const q = $('#q'); if (q) q.value = ''; S.limit = 120; VIEWS.members.update(true); },
  filterGo: (el, e) => { e.preventDefault(); S.filter = el.dataset.f; S.q = ''; S.checkin = false; tab('members'); },
  sortGo: (el, e) => { e.preventDefault(); S.sort = el.dataset.s; S.filter = 'all'; S.q = ''; tab('members'); },
  clearQ: () => { S.q = ''; const q = $('#q'); if (q) { q.value = ''; q.focus(); } $('[data-act="clearQ"]').hidden = true; VIEWS.members.update(); },
  more: () => { S.limit += 300; VIEWS.members.update(); },
  newFromSearch: el => memberForm(null, el.dataset.digits === '1' ? { phone: S.q.trim() } : { name: S.q.trim() }),
  checkin: el => {
    const m = S.byId[el.dataset.id]; if (!m) return;
    const on = !visitedToday(m), t = today();
    S.store.checkIn(m.id, t, on);
    if (navigator.vibrate) try { navigator.vibrate(on ? 18 : 8); } catch (e) {}
    if (!on) { toast('انشال حضور ' + U.firstName(m.name)); return; }
    const d = dl(m);
    if (d < 0) toast('سجّلنا الحضور، بس اشتراك ' + U.firstName(m.name) + ' منتهي من ' + U.daysWord(-d), { label: 'جدّد', fn: () => renewForm(S.byId[m.id] || m) });
    else toast('حضور ' + U.firstName(m.name) + ' ✓' + (d <= S.settings.alertDays && !U.isShort(m) ? ' · ' + U.remainPhrase(d) : ''), { label: 'تراجع', fn: () => S.store.checkIn(m.id, t, false) });
  },
  wa: el => {
    const id = el.dataset.id, kind = el.dataset.kind;
    if (!id || !kind || kind === 'confirm') { if (S.sheetOpen) setTimeout(closeSheet, 150); return; }
    S.awaitWA = { id, kind, at: Date.now(), ask: false };
    if (S.sheetOpen) setTimeout(closeSheet, 150);
    setTimeout(() => { if (S.awaitWA && S.awaitWA.id === id && document.visibilityState === 'visible') askWASent(); }, 2500);
  },
  waYes: el => { const m = S.byId[el.dataset.id]; S.awaitWA = null; if (m) markReminded(m); },
  waNo: () => { S.awaitWA = null; refresh(); },
  toggleDone: () => { S.showDone = !S.showDone; VIEWS.reminders.update(); },
  del: el => {
    const m = S.byId[el.dataset.id]; if (!m) return;
    confirmSheet({ title: 'حذف ' + m.name + '؟', text: 'رح ينحذف مع كل سجل اشتراكاته وحضوره، وما في رجعة. إذا بدك تحتفظ فيه، نزّل نسخة احتياطية أول.', okLabel: 'احذف نهائياً', danger: true, onOk: () => { S.store.deleteMember(m.id); back(); toast('انحذف ' + U.firstName(m.name)); } });
  },
  pushSetup: () => enablePush(),
  testLocal: () => localNotify('إشعار تجريبي ✓', 'الإشعارات شغّالة على هالجهاز', 'test-local'),
  testDigest: () => { const dg = U.buildDigest(S.members, S.settings, today()); localNotify(dg.title, dg.body, 'daily-preview'); },
  testServer: () => {
    if (S.store.mode === 'demo') { toast('بتشتغل بعد ما تربط Firebase وGitHub'); return; }
    S.store.requestServerTest(S.user.name);
    toast('انطلب. السيرفر بيبعته بأول تشغيل (لحد ساعة)، أو شغّله يدوياً من GitHub');
  },
  theme: () => { const order = ['dark', 'light', 'auto']; const cur = LS.get('theme', 'dark'); LS.set('theme', order[(order.indexOf(cur) + 1) % 3]); applyTheme(); render(); },
  changePass: () => changePassForm(),
  forgot: () => {
    openSheet({ title: 'نسيت كلمة السر؟', body: `<div class="fm"><div class="preview-note"><b>إذا إنت موظف</b>اطلب من مالك النادي يعملك حساب جديد من الإعدادات.</div>
      <div class="field"><label for="fe">إذا إنت المالك: اكتب إيميلك وبيوصلك رابط</label><input class="in ltr" id="fe" type="email"></div></div>`,
      foot: `<button class="btn gold" id="feB">ابعت الرابط</button>`,
      onMount(sh) { $('#feB', sh).addEventListener('click', async () => { const v = $('#fe', sh).value.trim(); if (!v.includes('@')) return; try { await S.store.resetPassword(v); closeSheet(); toast('انبعت الرابط على إيميلك'); } catch (e) { toast(errText(e)); } }); } });
  },
  versionTap: () => {
    const n = Date.now(); S.devTaps = S.devTaps.filter(t => n - t < 1500); S.devTaps.push(n);
    if (S.devTaps.length >= 3) { S.devTaps = []; LS.set('dev', true); toast('انفتحت أدوات المطوّر'); go('dev'); }
  },
  devLock: () => { LS.set('dev', false); tab('settings'); },
  runTests: () => { S.devTests = runAllTests(); render(); },
  simSet: () => { const v = $('#simDate').value; if (U.parseD(v)) { S.simToday = v === U.todayStr() ? null : v; SS.set('today', S.simToday); render(); } },
  simAdd: el => { S.simToday = U.addDays(today(), +el.dataset.d); SS.set('today', S.simToday); render(); },
  simOff: () => { S.simToday = null; SS.del('today'); render(); },
  testAdd: () => { addTestMembers(); toast('انضاف 15 مشترك تجريبي'); },
  testDel: () => {
    const ids = S.members.filter(m => m.isTest).map(m => m.id);
    if (!ids.length) { toast('ما في بيانات تجريبية'); return; }
    S.store.deleteMembers(ids).then(() => toast('انحذفوا ' + ids.length)).catch(e => toast(errText(e)));
  },
  forceUpdate: async () => { try { if (S.swReg) { await S.swReg.update(); if (S.swReg.waiting) { S.swReg.waiting.postMessage('skipWaiting'); return; } } } catch (e) {} location.reload(); },
  clearCache: async () => { try { const ks = await caches.keys(); await Promise.all(ks.map(k => caches.delete(k))); } catch (e) {} toast('انمسح الكاش، رح يرجع يحمّل'); setTimeout(() => location.reload(), 800); },
  resetDemo: () => { if (S.store.resetDemo) { S.store.resetDemo(); location.reload(); } },
  copyLog: () => copyText(JSON.stringify({ v: CONFIG.version, ua: navigator.userAgent, mode: S.store.mode, log: LOG }, null, 1), 'انسخ السجل. ابعته لـ Claude وقله شو صار'),
  clearLog: () => { LOG.length = 0; LS.set('log', []); render(); },
  exportXlsx: () => exportXlsx(),
  backup: () => backupJson(),
  restore: () => restoreJson(),
  installNow: async () => { const e = S.installEvt; if (!e) return; e.prompt(); try { await e.userChoice; } catch (x) {} S.installEvt = null; render(); },
  addStaff: el => addStaffForm(el.dataset.n || '', el.dataset.u || ''),
  staffToggle: el => { const x = S.staff.find(s => s.uid === el.dataset.uid); if (x) S.store.updateStaff(x.uid, { active: x.active === false }); },
  saveClub: () => saveClub(),
  offerAdd: () => { syncClubInputs(); S.clubDraft.offers.push({ id: 'o' + Date.now().toString(36), name: '', amount: 1, unit: 'month', price: null }); drawClubLists($('#screen')); },
  offerDel: el => { syncClubInputs(); S.clubDraft.offers.splice(+el.dataset.i, 1); drawClubLists($('#screen')); },
  capAdd: () => { syncClubInputs(); const i = $('#c-cap'); const v = (i.value || '').trim(); if (v && !S.clubDraft.captains.includes(v)) S.clubDraft.captains.push(v); i.value = ''; drawClubLists($('#screen')); },
  capDel: el => { syncClubInputs(); S.clubDraft.captains.splice(+el.dataset.i, 1); drawClubLists($('#screen')); },
  saveTpl: () => {
    const t = {}; ['confirm', 'soon', 'expired'].forEach(k => { t[k] = $('#t-' + k).value; });
    S.store.saveSettings(Object.assign({}, S.settings, { templates: t })); toast('انحفظت الرسائل ✓'); back();
  }
};

document.addEventListener('click', e => {
  const close = e.target.closest('[data-close]');
  if (close) { e.preventDefault(); closeSheet(); return; }
  const t = e.target.closest('[data-tab]');
  if (t) { tab(t.dataset.tab); return; }
  const g = e.target.closest('[data-go]');
  if (g) { e.preventDefault(); go(g.dataset.go); return; }
  const a = e.target.closest('[data-act]');
  if (a && ACTIONS[a.dataset.act]) {
    if (a.tagName === 'BUTTON' && a.closest('form') && a.type !== 'submit') e.preventDefault();
    try { ACTIONS[a.dataset.act](a, e); } catch (x) { logErr(x, 'act:' + a.dataset.act); toast('صار خطأ: ' + (x.message || x)); }
  }
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && S.sheetOpen) { closeSheet(); return; }
  if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[role="button"][data-act]')) { e.preventDefault(); e.target.click(); }
});

/* ---------- مساعدات الأفعال ---------- */
function openExternal(url) {
  const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noopener';
  document.body.appendChild(a); a.click(); a.remove();
}
function askWASent() {
  const w = S.awaitWA; if (!w || w.ask) return;
  const m = S.byId[w.id]; if (!m) { S.awaitWA = null; return; }
  if (U.isReminded(m, today())) { S.awaitWA = null; return; }
  w.ask = true;
  if (S.route && S.route.name === 'reminders') VIEWS.reminders.update();
  else toast('انبعتت الرسالة لـ' + U.firstName(m.name) + '؟', { label: 'أيوه، سجّلها', fn: () => { S.awaitWA = null; markReminded(m); } });
}
function markReminded(m) {
  S.store.updateMember(m.id, { remindKey: U.remindKey(m, today()), remindedAt: nowIso(), remindedByName: S.user.name });
  if (navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
  toast('تسجّل إنه ' + U.firstName(m.name) + ' تذكّر ✓');
}
async function copyText(txt, msg) {
  try { await navigator.clipboard.writeText(txt); toast(msg || 'انسخ ✓'); }
  catch (e) { openSheet({ title: 'انسخ النص', body: `<textarea class="in" style="min-height:240px" readonly>${esc(txt)}</textarea>`, onMount(sh) { const ta = $('textarea', sh); ta.focus(); ta.select(); } }); }
}
function syncClubInputs() {
  const root = $('#screen'); if (!S.clubDraft) return;
  $$('[data-o]', root).forEach(el => { const o = S.clubDraft.offers[+el.dataset.i]; if (o) o[el.dataset.o] = U.toLatin(el.value); });
}
function saveClub() {
  syncClubInputs();
  const d = S.clubDraft, err = $('#c-err');
  const offers = d.offers.filter(o => String(o.name || '').trim()).map(o => ({ id: o.id, name: String(o.name).trim(), amount: Math.max(1, Math.round(Number(o.amount) || 1)), unit: o.unit, price: (o.price === '' || o.price == null || isNaN(Number(o.price))) ? null : Number(o.price) }));
  if (!offers.length) { err.textContent = 'خلّي عرض واحد على الأقل'; err.hidden = false; return; }
  const s = Object.assign({}, S.settings, {
    gymName: $('#c-name').value.trim() || 'الأمير جيم', alertDays: Number($('#c-alert').value), notifyHour: Number($('#c-hour').value),
    offers, captains: d.captains.slice()
  });
  S.store.saveSettings(s); S.settings = U.mergeSettings(s);
  toast('انحفظت الإعدادات ✓'); back();
}
function changePassForm() {
  openSheet({
    title: 'تغيير كلمة السر',
    body: `<form class="fm" id="cpf" novalidate><div class="field"><label for="cp1">كلمة السر الحالية</label><input class="in ltr" id="cp1" type="password" autocomplete="current-password"></div>
      <div class="field"><label for="cp2">كلمة السر الجديدة (6 أحرف أو أكثر)</label><input class="in ltr" id="cp2" type="password" autocomplete="new-password"></div><p class="err" id="cpE" hidden></p></form>`,
    foot: `<button class="btn gold" type="submit" form="cpf">حفظ</button>`,
    onMount(sh) {
      $('#cpf', sh).addEventListener('submit', async e => {
        e.preventDefault();
        const a = $('#cp1', sh).value, b = $('#cp2', sh).value, er = $('#cpE', sh);
        if (b.length < 6) { er.textContent = 'كلمة السر الجديدة قصيرة'; er.hidden = false; return; }
        try { await S.store.changePassword(a, b); closeSheet(); toast('تغيّرت كلمة السر ✓'); } catch (x) { er.textContent = errText(x); er.hidden = false; }
      });
    }
  });
}
function addStaffForm(name, user) {
  openSheet({
    title: 'إضافة موظف',
    sub: 'بيدخل باسم المستخدم وكلمة السر من أي جهاز',
    body: `<form class="fm" id="asf" novalidate>
      <div class="field"><label for="as1">الاسم</label><input class="in" id="as1" value="${esc(name)}"></div>
      <div class="field"><label for="as2">اسم المستخدم (إنجليزي بدون مسافات)</label><input class="in ltr" id="as2" value="${esc(user)}" autocapitalize="none" spellcheck="false" placeholder="jihad"></div>
      <div class="field"><label for="as3">كلمة السر (6 أحرف أو أكثر)</label><input class="in ltr" id="as3" type="text" autocomplete="off" value="${esc(Math.random().toString(36).slice(2, 8))}"></div>
      <p class="hint">احفظ اسم المستخدم وكلمة السر وابعتهم للموظف.</p><p class="err" id="asE" hidden></p></form>`,
    foot: `<button class="btn gold" type="submit" form="asf" id="asB">${ic('userPlus')} إنشاء الحساب</button>`,
    onMount(sh) {
      $('#asf', sh).addEventListener('submit', async e => {
        e.preventDefault();
        const n = $('#as1', sh).value.trim(), u = $('#as2', sh).value.trim().toLowerCase(), p = $('#as3', sh).value, er = $('#asE', sh), b = $('#asB', sh);
        if (!n || !/^[a-z0-9._-]{3,30}$/.test(u)) { er.textContent = 'اكتب الاسم واسم مستخدم بالإنجليزي (3 أحرف أو أكثر)'; er.hidden = false; return; }
        if (p.length < 6) { er.textContent = 'كلمة السر لازم تكون 6 أحرف أو أكثر'; er.hidden = false; return; }
        b.disabled = true;
        try {
          await S.store.createStaff({ name: n, username: u, password: p });
          closeSheet();
          openSheet({ title: 'تم إنشاء حساب ' + n, body: `<div class="card pad"><dl class="kv"><div><dt>اسم المستخدم</dt><dd class="ltr">${esc(u)}</dd></div><div><dt>كلمة السر</dt><dd class="ltr">${esc(p)}</dd></div></dl></div><p class="hint mt-s">ابعتهم للموظف، وبيقدر يغيّر كلمة السر من الإعدادات.</p>`,
            foot: `<button class="btn" data-act="copyCreds" data-t="${esc('الأمير جيم\nاسم المستخدم: ' + u + '\nكلمة السر: ' + p + '\n' + location.href.split('#')[0])}">${ic('copy')} نسخ</button><button class="btn gold" data-close>تمام</button>` });
        } catch (x) { logErr(x, 'staff'); er.textContent = errText(x); er.hidden = false; b.disabled = false; }
      });
    }
  });
}
ACTIONS.copyCreds = el => copyText(el.dataset.t, 'انسخت بيانات الدخول');

function addTestMembers() {
  const names = ['تجربة أحمد', 'تجربة لين', 'تجربة سامي', 'تجربة رهف', 'تجربة باسل', 'تجربة جود', 'تجربة كريم', 'تجربة تالا', 'تجربة فارس', 'تجربة ميس', 'تجربة زيد', 'تجربة غلا', 'تجربة مالك', 'تجربة ريم', 'تجربة عمرو'];
  const t = today();
  names.forEach((n, i) => {
    const o = S.settings.offers[i % Math.max(1, S.settings.offers.length - 1)] || S.settings.offers[0];
    const end = U.addDays(t, [-20, -5, -1, 0, 1, 2, 3, 4, 5, 8, 15, 25, 40, 60, 120][i]);
    const start = o.unit === 'month' ? U.addMonths(end, -o.amount) : U.addDays(end, -(o.amount - 1));
    const visits = []; for (let k = 0; k < 40; k++) if ((k * 7 + i) % 3 === 0) visits.push(U.addDays(t, -k));
    S.store.addMember({ name: n, phone: '07' + (90000000 + i * 1111111 % 9999999), section: i % 2 ? 'women' : 'men', offer: o.name, offerId: o.id, amount: o.amount, unit: o.unit, price: o.price,
      startDate: start, endDate: end, captain: S.settings.captains[i % (S.settings.captains.length || 1)] || '', notes: 'بيانات تجريبية', visits, history: [], isTest: true,
      createdAt: nowIso(), createdByName: S.user.name, periodByName: S.user.name, periodAt: nowIso(), remindKey: null });
  });
}
function runAllTests() {
  const T = U.selfTests();
  const add = (name, fn) => { try { const r = fn(); T.push({ name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { T.push({ name, ok: false, detail: e.message }); } };
  add('ملف Excel بينبني صح', () => { const b = buildXlsx([{ name: 'x', rows: [['أ', 1]] }]); return b[0] === 0x50 && b[1] === 0x4B ? true : 'توقيع الملف غلط'; });
  add('Service Worker شغّال', () => S.swReg ? true : (PREVIEW ? 'المعاينة ما بتدعم Service Worker' : 'مش مسجّل'));
  add('الإشعارات مدعومة على هالجهاز', () => { const p = pushInfo(); return p.code === 'unsupported' ? p.text : true; });
  add('مفتاح الإشعارات موجود', () => /^[A-Za-z0-9_-]{80,}$/.test(CONFIG.vapidPublicKey || '') ? true : 'vapidPublicKey ناقص بملف config.js');
  add('ربط Firebase', () => S.store.mode === 'firebase' ? true : 'نسخة تجربة: config.js ما فيه بيانات Firebase');
  add('الإعدادات محمّلة', () => S.settings.offers.length > 0 ? true : 'ما في عروض');
  add('السيرفر اشتغل خلال آخر ساعتين', () => { const n = S.meta && S.meta.notify; if (!n || !n.heartbeatAt) return 'ولا مرة'; return (Date.now() - Date.parse(n.heartbeatAt)) < 2.5 * 3600e3 ? true : 'آخر مرة ' + ago(n.heartbeatAt); });
  return T;
}

/* ---------- تصدير ونسخ احتياطي ---------- */
function saveBlob(blob, name) {
  try {
    const file = new File([blob], name, { type: blob.type });
    if (isIOS && navigator.canShare && navigator.canShare({ files: [file] })) { navigator.share({ files: [file], title: name }).catch(() => {}); return; }
  } catch (e) {}
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  if (PREVIEW) toast('التنزيل ما بيشتغل بالمعاينة، بيشتغل بالتطبيق الحقيقي');
}
function exportXlsx() {
  const t = today(), ms = S.members.filter(m => !m.isTest).slice().sort((a, b) => a._n.localeCompare(b._n, 'ar'));
  const lbl = { active: 'فعّال', soon: 'قرب ينتهي', expired: 'منتهي', none: '—' };
  const r1 = [['الاسم', 'الجوال', 'القسم', 'العرض', 'المبلغ', 'البداية', 'الانتهاء', 'الأيام الباقية', 'الحالة', 'الكابتن', 'عدد الاشتراكات', 'الحضور (المجموع)', 'الحضور هالشهر', 'آخر حضور', 'سجّله', 'تاريخ التسجيل', 'ملاحظات']];
  ms.forEach(m => { const c = U.commitment(m, t), d = dl(m); r1.push([m.name, U.localPhone(m.phone), U.SECTIONS[m.section] || '', m.offer || '', m.price == null ? '' : Number(m.price), m.startDate || '', m.endDate || '', isNaN(d) ? '' : d, lbl[st(m)], m.captain || '', (m.history || []).length + 1, c.total, c.month, c.last || '', m.createdByName || '', (m.createdAt || '').slice(0, 10), m.notes || '']); });
  const r2 = [['الاسم', 'الجوال', 'العرض', 'المبلغ', 'من', 'إلى', 'الكابتن', 'سجّله']];
  ms.forEach(m => { [{ offer: m.offer, price: m.price, startDate: m.startDate, endDate: m.endDate, captain: m.captain, byName: m.periodByName || m.createdByName }].concat((m.history || []).slice().reverse()).forEach(h => r2.push([m.name, U.localPhone(m.phone), h.offer || '', h.price == null ? '' : Number(h.price), h.startDate || '', h.endDate || '', h.captain || '', h.byName || ''])); });
  const r3 = [['التاريخ', 'الاسم', 'الجوال', 'القسم']];
  const vis = []; ms.forEach(m => U.visitsOf(m).forEach(v => vis.push([v, m.name, U.localPhone(m.phone), U.SECTIONS[m.section] || ''])));
  vis.sort((a, b) => b[0].localeCompare(a[0])); vis.forEach(v => r3.push(v));
  const bytes = buildXlsx([
    { name: 'المشتركين', rows: r1, widths: [24, 14, 8, 12, 9, 12, 12, 10, 11, 14, 10, 10, 10, 12, 10, 12, 30] },
    { name: 'سجل الاشتراكات', rows: r2, widths: [24, 14, 12, 9, 12, 12, 14, 10] },
    { name: 'الحضور', rows: r3, widths: [12, 24, 14, 8] }
  ]);
  saveBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `alameer-gym-${t}.xlsx`);
}
function backupJson() {
  const data = { app: 'alameer-gym', version: CONFIG.version, exportedAt: nowIso(), settings: S.settings, members: S.members.map(m => { const c = Object.assign({}, m); delete c._n; delete c._p; return c; }) };
  saveBlob(new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' }), `alameer-gym-backup-${today()}.json`);
}
function restoreJson() {
  const inp = document.createElement('input'); inp.type = 'file'; inp.accept = '.json,application/json';
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return;
    let data; try { data = JSON.parse(await f.text()); } catch (e) { toast('الملف مش نسخة احتياطية صحيحة'); return; }
    if (!data || data.app !== 'alameer-gym' || !Array.isArray(data.members)) { toast('الملف مش نسخة احتياطية من التطبيق'); return; }
    confirmSheet({ title: 'استرجاع ' + data.members.length + ' مشترك؟', text: `النسخة من ${esc(U.fmtD((data.exportedAt || '').slice(0, 10)))}. المشتركين الموجودين بنفس الرقم التعريفي رح ينكتب فوقهم، والباقي بيضل زي ما هو.`, okLabel: 'استرجع',
      onOk: async () => { try { const n = await S.store.importMembers(data.members); if (data.settings) S.store.saveSettings(U.mergeSettings(data.settings)); toast('رجع ' + n + ' مشترك ✓'); } catch (e) { logErr(e, 'restore'); toast(errText(e)); } } });
  };
  inp.click();
}

/* ---------- الإشعارات ---------- */
function pushInfo() {
  const sup = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  if (PREVIEW) return { ok: false, code: 'preview', text: 'المعاينة ما بتدعم الإشعارات' };
  if (!sup) return isIOS && !isStandalone()
    ? { ok: false, code: 'ios-install', text: 'على الآيفون: ثبّت التطبيق على الشاشة الرئيسية أول' }
    : { ok: false, code: 'unsupported', text: 'هالمتصفح ما بيدعم الإشعارات' };
  const perm = Notification.permission;
  if (perm === 'denied') return { ok: false, code: 'denied', text: 'مسكّرة من إعدادات الجهاز. افتحها من إعدادات المتصفح' };
  if (perm === 'granted' && S.push.subscribed) return { ok: true, code: 'on', text: 'بيوصلك ملخص التذكيرات كل يوم' };
  if (perm === 'granted') return { ok: false, code: 'granted-nosub', text: 'اضغط لتكمّل التفعيل' };
  return { ok: false, code: 'default', text: 'اضغط عشان يوصلك ملخص التذكيرات كل يوم' };
}
function pushNudgeHTML() {
  const p = pushInfo();
  if (p.ok || ['preview', 'unsupported', 'denied'].includes(p.code) || LS.get('pushNudgeOff', false)) return '';
  return `<button class="alert-card mt" data-act="pushSetup" style="background:var(--surface)"><span class="bub">${ic('bell', 24)}</span><span class="tx"><b>فعّل الإشعارات على هالجهاز</b><small>${esc(p.code === 'ios-install' ? p.text : 'عشان يوصلك كل يوم مين قرب ينتهي اشتراكه')}</small></span>${ic('chev', 22)}</button>`;
}
function b64u(s) { s = s.replace(/-/g, '+').replace(/_/g, '/'); s += '='.repeat((4 - s.length % 4) % 4); const b = atob(s); return Uint8Array.from(b, c => c.charCodeAt(0)); }
function hashKey(s) { let h1 = 0x811c9dc5, h2 = 7; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 16777619); h2 = (Math.imul(h2, 31) + c) | 0; } return 'p' + (h1 >>> 0).toString(36) + (h2 >>> 0).toString(36); }
function deviceName() {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad/.test(ua) || isIOS ? 'آيفون' : /Android/.test(ua) ? 'أندرويد' : /Windows/.test(ua) ? 'ويندوز' : /Mac/.test(ua) ? 'ماك' : 'جهاز';
  const br = /Edg\//.test(ua) ? 'Edge' : /SamsungBrowser/.test(ua) ? 'Samsung' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
  return os + (br ? ' · ' + br : '');
}
async function enablePush() {
  const p = pushInfo();
  if (p.code === 'ios-install') { go('install'); return; }
  if (['preview', 'unsupported', 'denied'].includes(p.code)) { toast(p.text); return; }
  if (!S.swReg) { toast('الإشعارات بتشتغل لما تفتح التطبيق من رابطه الأساسي (https)'); return; }
  try {
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast('ما انفتحت الإشعارات. بتقدر تفتحها بعدين من الإعدادات'); refresh(); return; }
    const reg = S.swReg;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64u(CONFIG.vapidPublicKey) });
    await savePushSub(sub);
    S.push.subscribed = true;
    localNotify('تمام ✓', 'رح يوصلك ملخص التذكيرات كل يوم ' + hourLabel(S.settings.notifyHour), 'enabled');
    refresh();
  } catch (e) { logErr(e, 'push'); toast('ما زبط تفعيل الإشعارات: ' + (e.message || e)); }
}
function savePushSub(sub) {
  const key = hashKey(sub.endpoint);
  LS.set('pushKey', key);
  return S.store.savePushSub(key, { sub: JSON.parse(JSON.stringify(sub)), uid: S.user.uid, name: S.user.name, device: deviceName(), updatedAt: nowIso() });
}
async function syncPush() {
  if (PREVIEW || !S.swReg || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
  try {
    const sub = await S.swReg.pushManager.getSubscription();
    S.push.subscribed = !!sub;
    if (sub && Notification.permission === 'granted' && S.store.mode === 'firebase') {
      const last = LS.get('pushSync', 0);
      if (Date.now() - last > 6 * 3600e3 || LS.get('pushUid', '') !== S.user.uid) { await savePushSub(sub); LS.set('pushSync', Date.now()); LS.set('pushUid', S.user.uid); }
    }
    refresh();
  } catch (e) { logErr(e, 'syncPush'); }
}
async function localNotify(title, body, tag) {
  if (PREVIEW || !('Notification' in window)) { toast('🔔 ' + title + ' — ' + body); return; }
  if (Notification.permission !== 'granted') {
    const r = await Notification.requestPermission().catch(() => 'denied');
    if (r !== 'granted') { toast('لازم تسمح بالإشعارات أول'); return; }
  }
  try {
    const reg = S.swReg;
    const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', dir: 'rtl', lang: 'ar', tag: tag || 'local', data: { url: './#/reminders' } };
    if (reg) await reg.showNotification(title, opts); else new Notification(title, opts);
  } catch (e) { logErr(e, 'notify'); toast('ما قدرنا نعرض الإشعار: ' + (e.message || e)); }
}

/* ---------- Service Worker والتحديثات ---------- */
function registerSW() {
  if (PREVIEW || !('serviceWorker' in navigator) || !(location.protocol === 'https:' || location.hostname === 'localhost')) return;
  navigator.serviceWorker.register('sw.js?v=' + encodeURIComponent(CONFIG.version)).then(reg => {
    S.swReg = reg;
    const watch = w => w && w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) showUpdate(w); });
    if (reg.waiting && navigator.serviceWorker.controller) showUpdate(reg.waiting);
    reg.addEventListener('updatefound', () => watch(reg.installing));
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
  }).catch(e => logErr(e, 'sw'));
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloading) { reloading = true; location.reload(); } });
  navigator.serviceWorker.addEventListener('message', e => {
    if (!e.data || e.data.type !== 'navigate' || !e.data.url) return;
    const h = (e.data.url.split('#')[1] || '').replace(/^\//, '');
    if (S.user && TABS.includes(h)) tab(h);
  });
}
function showUpdate(worker) {
  if ($('.update-bar')) return;
  const b = document.createElement('div'); b.className = 'update-bar'; b.dir = 'rtl';
  b.innerHTML = `${ic('renew', 22)}<span>في تحديث جديد للتطبيق</span><button>حدّث</button>`;
  b.querySelector('button').onclick = () => { worker.postMessage('skipWaiting'); b.remove(); };
  document.body.appendChild(b);
}

/* ---------- Toast ---------- */
let toastT = null;
function toast(msg, action) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.dir = 'rtl'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  clearTimeout(toastT);
  t.hidden = false;
  t.style.animation = 'none'; void t.offsetWidth; t.style.animation = '';
  t.innerHTML = `<p>${esc(msg)}</p>${action ? `<button class="t-act">${esc(action.label)}</button>` : ''}`;
  if (action) t.querySelector('.t-act').onclick = () => { t.hidden = true; action.fn(); };
  toastT = setTimeout(() => { t.hidden = true; }, action ? 7000 : 3200);
}

boot();
