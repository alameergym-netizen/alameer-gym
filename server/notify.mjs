// server/notify.mjs — بيشتغل على GitHub كل ساعة (مجاناً) وبيبعت إشعار الصبح لجوالات الموظفين.
// بيقرأ الإعدادات من Firestore: إذا وصلت الساعة المحددة ولسا ما انبعت إشعار اليوم، بيبعته.
// كمان بيبعت إشعار تجريبي إذا انطلب من أدوات المطوّر بالتطبيق.
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import webpush from 'web-push';
import { mergeSettings, buildDigest, dateInZone, hourInZone } from '../util.js';

const TZ = 'Asia/Amman';

function need(name) {
  const v = process.env[name];
  if (!v || !v.trim()) {
    console.error(`❌ السر ${name} مش موجود. أضفه من GitHub ← Settings ← Secrets and variables ← Actions`);
    process.exit(1);
  }
  return v.trim();
}

let account;
try { account = JSON.parse(need('FIREBASE_SERVICE_ACCOUNT')); }
catch (e) { console.error('❌ FIREBASE_SERVICE_ACCOUNT لازم يكون محتوى ملف JSON كامل من Firebase'); process.exit(1); }

initializeApp({ credential: cert(account) });
const db = getFirestore();
webpush.setVapidDetails('mailto:notifications@alameer.gym', need('VAPID_PUBLIC_KEY'), need('VAPID_PRIVATE_KEY'));

const mode = (process.env.RUN_MODE || 'auto').trim();   // auto | daily | test
const now = new Date();
const today = dateInZone(now, TZ);
const hour = hourInZone(now, TZ);
const clock = now.toLocaleTimeString('ar-JO-u-nu-latn', { timeZone: TZ, hour: 'numeric', minute: '2-digit' });

const [setSnap, metaSnap, testSnap] = await Promise.all([
  db.doc('settings/main').get(),
  db.doc('meta/notify').get(),
  db.doc('meta/testRequest').get()
]);
const settings = mergeSettings(setSnap.exists ? setSnap.data() : null);
const meta = metaSnap.exists ? metaSnap.data() : {};
const update = { heartbeatAt: now.toISOString() };
console.log(`⏰ ${today} الساعة ${hour}:00 بتوقيت عمّان · الوضع: ${mode} · موعد الإشعار: ${settings.notifyHour}:00 · آخر إرسال: ${meta.lastDate || 'ولا مرة'}`);

async function sendAll(payload) {
  const snap = await db.collection('pushSubs').get();
  const res = { devices: snap.size, ok: 0, gone: 0, fail: 0 };
  await Promise.all(snap.docs.map(async (d) => {
    const s = d.data();
    if (!s || !s.sub || !s.sub.endpoint) { res.fail++; return; }
    try {
      await webpush.sendNotification(s.sub, JSON.stringify(payload), { TTL: 12 * 3600, urgency: 'high' });
      res.ok++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { res.gone++; await d.ref.delete(); }
      else { res.fail++; console.error(`⚠️ ما وصل لـ ${s.name || ''} (${s.device || ''}):`, e.statusCode || '', e.body || e.message); }
    }
  }));
  return res;
}

// 1) إشعار تجريبي (من أدوات المطوّر، أو تشغيل يدوي test)
const test = testSnap.exists ? testSnap.data() : null;
if (mode === 'test' || (test && test.at && test.at > (meta.lastTestAt || 0))) {
  const r = await sendAll({ title: settings.gymName + ' · إشعار تجريبي', body: `وصل من السيرفر ✓ الساعة ${clock}`, url: './#/settings', tag: 'test' });
  update.lastTestAt = test && test.at ? Math.max(test.at, Date.now()) : Date.now();
  update.lastTestResult = r;
  console.log('🧪 إشعار تجريبي:', r);
}

// 2) ملخص التذكيرات اليومي
const due = mode === 'daily' || (mode === 'auto' && hour >= settings.notifyHour && meta.lastDate !== today);
if (due) {
  const ms = await db.collection('members').get();
  const members = ms.docs.map(d => Object.assign({}, d.data(), { id: d.id }));
  const dg = buildDigest(members, settings, today);
  let r = { devices: 0, ok: 0, gone: 0, fail: 0, skipped: true };
  if (dg.total > 0 || mode === 'daily') r = await sendAll({ title: dg.title, body: dg.body, url: './#/reminders', tag: 'daily-' + today });
  update.lastDate = today;
  update.lastRunAt = now.toISOString();
  update.lastDigest = { total: dg.total, today: dg.counts.today, soon: dg.counts.soon, expired: dg.counts.expired, body: dg.body };
  update.lastResult = r;
  console.log(`📬 ملخص اليوم (${members.length} مشترك): ${dg.body}`);
  console.log('   النتيجة:', r);
} else {
  console.log('… لسا مش وقت الإشعار اليومي أو انبعت اليوم.');
}

await db.doc('meta/notify').set(update, { merge: true });
console.log('✅ خلص');
