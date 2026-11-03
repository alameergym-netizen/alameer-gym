// store.js — طبقة البيانات. نفس الواجهة لنسختين:
//  • firebase: البيانات على Firestore (كلاود + مزامنة + بتشتغل بدون نت وبتتزامن بعدين)
//  • demo: نسخة تجربة، البيانات على الجهاز بس (localStorage)
import { defaultSettings, addDays, addMonths, todayStr } from './util.js';

export async function createStore(CONFIG, opts = {}) {
  const useFirebase = !opts.forceDemo && CONFIG.firebase && CONFIG.firebase.apiKey;
  return useFirebase ? firebaseStore(CONFIG) : demoStore();
}

/* =========================================================
   Firebase
   ========================================================= */
async function firebaseStore(CONFIG) {
  const base = `https://www.gstatic.com/firebasejs/${CONFIG.firebaseSdk || '10.14.1'}/`;
  const [A, AU, F] = await Promise.all([
    import(base + 'firebase-app.js'),
    import(base + 'firebase-auth.js'),
    import(base + 'firebase-firestore.js')
  ]);
  const app = A.initializeApp(CONFIG.firebase);
  let db;
  try {
    db = F.initializeFirestore(app, { localCache: F.persistentLocalCache({ tabManager: F.persistentMultipleTabManager() }) });
  } catch (e) {
    db = F.getFirestore(app);
  }
  const auth = AU.getAuth(app);
  const errHandlers = [];
  const fail = (e) => { errHandlers.forEach(h => h(e)); };
  const fire = (p) => { p.catch(fail); return p; };
  const toEmail = (u) => {
    u = String(u || '').trim().toLowerCase();
    return u.includes('@') ? u : `${u}@${CONFIG.staffDomain}`;
  };
  const now = () => new Date().toISOString();

  let staffUnsub = null;
  const S = {
    mode: 'firebase',
    onError(h) { errHandlers.push(h); },

    onUser(cb) {
      return AU.onAuthStateChanged(auth, (u) => {
        if (staffUnsub) { staffUnsub(); staffUnsub = null; }
        if (!u) { cb(null); return; }
        staffUnsub = F.onSnapshot(F.doc(db, 'staff', u.uid), (snap) => {
          if (!snap.exists()) { cb({ uid: u.uid, email: u.email, pending: true }); return; }
          const d = snap.data();
          cb({ uid: u.uid, email: u.email, name: d.name || 'موظف', role: d.role || 'staff', username: d.username || u.email, active: d.active !== false });
        }, (e) => { cb({ uid: u.uid, email: u.email, pending: true, error: e.code || e.message }); });
      });
    },

    async isSetupNeeded() {
      try { const s = await F.getDoc(F.doc(db, 'meta', 'owner')); return !s.exists(); }
      catch (e) { return false; }
    },

    async setupOwner({ name, email, password, gymName }) {
      const cred = await AU.createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      await F.setDoc(F.doc(db, 'meta', 'owner'), { uid, createdAt: now() });
      await F.setDoc(F.doc(db, 'staff', uid), { name, username: email.trim(), role: 'owner', active: true, createdAt: now() });
      const s = defaultSettings();
      if (gymName) s.gymName = gymName;
      await F.setDoc(F.doc(db, 'settings', 'main'), s);
    },

    login(username, password) { return AU.signInWithEmailAndPassword(auth, toEmail(username), password); },
    resetPassword(email) { return AU.sendPasswordResetEmail(auth, email.trim()); },
    logout() { return AU.signOut(auth); },
    async changePassword(current, next) {
      const u = auth.currentUser;
      const cred = AU.EmailAuthProvider.credential(u.email, current);
      await AU.reauthenticateWithCredential(u, cred);
      await AU.updatePassword(u, next);
    },

    watchMembers(cb, err) {
      return F.onSnapshot(F.collection(db, 'members'), { includeMetadataChanges: true }, (snap) => {
        cb(snap.docs.map(d => Object.assign({}, d.data(), { id: d.id })), { fromCache: snap.metadata.fromCache, pending: snap.metadata.hasPendingWrites });
      }, err);
    },
    watchSettings(cb) { return F.onSnapshot(F.doc(db, 'settings', 'main'), s => cb(s.exists() ? s.data() : null), () => {}); },
    watchStaff(cb) { return F.onSnapshot(F.collection(db, 'staff'), s => cb(s.docs.map(d => Object.assign({}, d.data(), { uid: d.id }))), () => cb([])); },
    watchMeta(cb) {
      const out = {};
      const u1 = F.onSnapshot(F.doc(db, 'meta', 'notify'), s => { out.notify = s.exists() ? s.data() : null; cb(out); }, () => {});
      const u2 = F.onSnapshot(F.doc(db, 'meta', 'testRequest'), s => { out.testRequest = s.exists() ? s.data() : null; cb(out); }, () => {});
      return () => { u1(); u2(); };
    },
    watchPushSubs(cb) { return F.onSnapshot(F.collection(db, 'pushSubs'), s => cb(s.docs.map(d => Object.assign({}, d.data(), { id: d.id }))), () => cb(null)); },

    newId() { return F.doc(F.collection(db, 'members')).id; },
    addMember(data, id) { const ref = id ? F.doc(db, 'members', id) : F.doc(F.collection(db, 'members')); fire(F.setDoc(ref, data)); return ref.id; },
    updateMember(id, patch) { return fire(F.updateDoc(F.doc(db, 'members', id), patch)); },
    deleteMember(id) { return fire(F.deleteDoc(F.doc(db, 'members', id))); },
    checkIn(id, day, on) { return fire(F.updateDoc(F.doc(db, 'members', id), { visits: on ? F.arrayUnion(day) : F.arrayRemove(day) })); },
    saveSettings(s) { return fire(F.setDoc(F.doc(db, 'settings', 'main'), s)); },

    async createStaff({ name, username, password }) {
      // تطبيق ثانوي مؤقت عشان إنشاء حساب الموظف ما يطلّع المالك من حسابه
      const sec = A.initializeApp(CONFIG.firebase, 'staff-' + Date.now());
      try {
        const secAuth = AU.initializeAuth(sec, { persistence: AU.inMemoryPersistence });
        const c = await AU.createUserWithEmailAndPassword(secAuth, toEmail(username), password);
        await F.setDoc(F.doc(db, 'staff', c.user.uid), { name, username: String(username).trim().toLowerCase(), role: 'staff', active: true, createdAt: now() });
        await AU.signOut(secAuth);
      } finally {
        await A.deleteApp(sec).catch(() => {});
      }
    },
    updateStaff(uid, patch) { return fire(F.updateDoc(F.doc(db, 'staff', uid), patch)); },

    savePushSub(key, data) { return fire(F.setDoc(F.doc(db, 'pushSubs', key), data)); },
    deletePushSub(key) { return fire(F.deleteDoc(F.doc(db, 'pushSubs', key))); },
    requestServerTest(byName) { return fire(F.setDoc(F.doc(db, 'meta', 'testRequest'), { at: Date.now(), byName: byName || '' })); },

    async importMembers(list) {
      let n = 0;
      for (let i = 0; i < list.length; i += 400) {
        const b = F.writeBatch(db);
        list.slice(i, i + 400).forEach(m => {
          const id = m.id || F.doc(F.collection(db, 'members')).id;
          const d = Object.assign({}, m); delete d.id;
          b.set(F.doc(db, 'members', id), d);
          n++;
        });
        await b.commit();
      }
      return n;
    },
    async deleteMembers(ids) {
      for (let i = 0; i < ids.length; i += 400) {
        const b = F.writeBatch(db);
        ids.slice(i, i + 400).forEach(id => b.delete(F.doc(db, 'members', id)));
        await b.commit();
      }
    }
  };
  return S;
}

/* =========================================================
   نسخة التجربة (على الجهاز)
   ========================================================= */
function demoStore() {
  const KEY = 'ag-demo:v2';
  let data;
  try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { data = null; }
  if (!data) data = seedDemo();
  const L = { members: [], settings: [], staff: [], meta: [], user: [], subs: [] };
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {} };
  const emit = (k) => setTimeout(() => {
    if (k === 'members') L.members.forEach(cb => cb(Object.entries(data.members).map(([id, m]) => Object.assign({}, m, { id })), { fromCache: false, pending: false }));
    if (k === 'settings') L.settings.forEach(cb => cb(data.settings));
    if (k === 'staff') L.staff.forEach(cb => cb(data.staff));
    if (k === 'meta') L.meta.forEach(cb => cb(data.meta));
    if (k === 'subs') L.subs.forEach(cb => cb(Object.entries(data.subs || {}).map(([id, s]) => Object.assign({}, s, { id }))));
  }, 0);
  const sub = (k, cb) => { L[k].push(cb); emit(k); return () => { L[k] = L[k].filter(x => x !== cb); }; };
  const commit = (k) => { save(); emit(k); };
  const rid = () => 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const user = { uid: 'demo-owner', name: 'المالك', role: 'owner', username: 'demo', active: true, demo: true };

  return {
    mode: 'demo',
    onError() {},
    onUser(cb) { setTimeout(() => cb(user), 0); return () => {}; },
    async isSetupNeeded() { return false; },
    async setupOwner() {},
    async login() {},
    async resetPassword() {},
    async logout() {},
    async changePassword() { throw { code: 'demo' }; },
    watchMembers(cb) { return sub('members', cb); },
    watchSettings(cb) { return sub('settings', cb); },
    watchStaff(cb) { return sub('staff', cb); },
    watchMeta(cb) { return sub('meta', cb); },
    watchPushSubs(cb) { return sub('subs', cb); },
    newId: rid,
    addMember(d, id) { id = id || rid(); data.members[id] = d; commit('members'); return id; },
    updateMember(id, patch) { if (data.members[id]) { Object.assign(data.members[id], patch); commit('members'); } return Promise.resolve(); },
    deleteMember(id) { delete data.members[id]; commit('members'); return Promise.resolve(); },
    checkIn(id, day, on) {
      const m = data.members[id]; if (!m) return Promise.resolve();
      const v = new Set(m.visits || []); on ? v.add(day) : v.delete(day); m.visits = Array.from(v);
      commit('members'); return Promise.resolve();
    },
    saveSettings(s) { data.settings = s; commit('settings'); return Promise.resolve(); },
    async createStaff({ name, username }) { data.staff.push({ uid: rid(), name, username, role: 'staff', active: true, createdAt: new Date().toISOString() }); commit('staff'); },
    updateStaff(uid, patch) { const s = data.staff.find(x => x.uid === uid); if (s) Object.assign(s, patch); commit('staff'); return Promise.resolve(); },
    savePushSub(key, d) { data.subs = data.subs || {}; data.subs[key] = d; commit('subs'); return Promise.resolve(); },
    deletePushSub(key) { if (data.subs) delete data.subs[key]; commit('subs'); return Promise.resolve(); },
    requestServerTest() { data.meta.testRequest = { at: Date.now() }; commit('meta'); return Promise.resolve(); },
    async importMembers(list) { list.forEach(m => { const id = m.id || rid(); const d = Object.assign({}, m); delete d.id; data.members[id] = d; }); commit('members'); return list.length; },
    async deleteMembers(ids) { ids.forEach(id => delete data.members[id]); commit('members'); },
    resetDemo() { try { localStorage.removeItem(KEY); } catch (e) {} }
  };
}

// بيانات تجريبية واقعية لنسخة التجربة فقط
function seedDemo() {
  const t = todayStr();
  let r = 7;
  const rnd = () => { r = (r * 16807) % 2147483647; return (r - 1) / 2147483646; };
  const S = defaultSettings();
  const people = [
    ['محمد العلي', '0791112233', 'men', 'm1', -27, 'كابتن يوسف', 5],
    ['ليث أبو زيد', '0785556677', 'men', 'm3', -60, 'كابتن نهاد', 4.2],
    ['سارة الخطيب', '0776543210', 'women', 'm1', -29, 'كوتش حنين', 3.5],
    ['عمر حداد', '0779998877', 'men', 'm1', -34, 'كابتن يوسف', 1],
    ['رنا المصري', '0795554433', 'women', 'm6', -40, 'كوتش حنين', 2.8],
    ['يزن الخطيب', '0791234000', 'men', 'y1', -200, 'كابتن نهاد', 3.2],
    ['هبة الزعبي', '0788877766', 'women', 'm2', -58, 'كوتش حنين', 1.6],
    ['أحمد الشريف', '0796665544', 'men', 'm1', -10, 'كابتن يوسف', 4.6],
    ['دانا عبيدات', '0772221100', 'women', 'm3', -88, 'كوتش حنين', 3.9],
    ['قيس النعيمي', '0793332211', 'men', 'm2', -61, 'كابتن نهاد', 0.8],
    ['نور الهدى', '0784443322', 'women', 'm1', -26, 'كوتش حنين', 2.2],
    ['خالد بني هاني', '0797778899', 'men', 'm6', -100, 'كابتن يوسف', 3]
  ];
  const staffNames = ['جهاد', 'نور', 'محمود'];
  const members = {};
  people.forEach((p, i) => {
    const off = S.offers.find(o => o.id === p[3]);
    const start = addDays(t, p[4]);
    const end = off.unit === 'month' ? addMonths(start, off.amount) : addDays(start, off.amount - 1);
    const visits = [];
    for (let k = 0; k < 84; k++) { const day = addDays(t, -k); if (day >= start && rnd() < p[6] / 7) visits.push(day); }
    const history = [];
    let cur = start;
    if (i % 3 === 0) {
      const ps = addMonths(cur, -1);
      history.unshift({ offer: 'شهر', startDate: ps, endDate: cur, price: 20, captain: p[5], byName: staffNames[(i + 1) % 3], at: ps + 'T10:00:00.000Z' });
      cur = ps;
    }
    if (i % 4 === 1) {
      const ps = addMonths(cur, -3);
      history.unshift({ offer: '3 شهور', startDate: ps, endDate: cur, price: 50, captain: p[5], byName: staffNames[i % 3], at: ps + 'T10:00:00.000Z' });
      cur = ps;
    }
    members['demo' + i] = {
      name: p[0], phone: p[1], section: p[2], offer: off.name, offerId: off.id, amount: off.amount, unit: off.unit, price: off.price,
      startDate: start, endDate: end, captain: p[5], notes: i === 3 ? 'إصابة خفيفة بالركبة، بلاش سكوات ثقيل' : '',
      visits, history, createdAt: (history[0] ? history[0].startDate : start) + 'T10:00:00.000Z', createdByName: staffNames[i % 3], remindKey: null
    };
  });
  return {
    members,
    settings: S,
    staff: [
      { uid: 'demo-owner', name: 'المالك', username: 'demo', role: 'owner', active: true },
      { uid: 'demo-1', name: 'جهاد', username: 'jihad', role: 'staff', active: true },
      { uid: 'demo-2', name: 'نور', username: 'noor', role: 'staff', active: true },
      { uid: 'demo-3', name: 'محمود', username: 'mahmoud', role: 'staff', active: true }
    ],
    meta: {},
    subs: {}
  };
}
