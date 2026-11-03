// util.js — دوال مشتركة بين التطبيق والاختبارات وسكربت الإشعارات اليومي (server/notify.mjs).
// ما فيها أي إشي خاص بالمتصفح، فبتشتغل بالمتصفح وبـ Node.

export const MONTHS = ['كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران', 'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول'];
export const WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const SECTIONS = { men: 'رجال', women: 'سيدات' };

/* ---------------- الإعدادات الافتراضية ---------------- */
export function defaultSettings() {
  return {
    gymName: 'الأمير جيم',
    alertDays: 5,
    notifyHour: 10,
    offers: [
      { id: 'm1', name: 'شهر', amount: 1, unit: 'month', price: 20 },
      { id: 'm2', name: 'شهرين', amount: 2, unit: 'month', price: 35 },
      { id: 'm3', name: '3 شهور', amount: 3, unit: 'month', price: 50 },
      { id: 'm6', name: '6 شهور', amount: 6, unit: 'month', price: 80 },
      { id: 'y1', name: 'سنة', amount: 12, unit: 'month', price: 130 },
      { id: 'day', name: 'Day Pass', amount: 1, unit: 'day', price: 2 }
    ],
    captains: ['كابتن يوسف', 'كابتن نهاد', 'كوتش حنين'],
    templates: {
      confirm: 'أهلاً {الاسم} في {النادي} 👑\nتم تسجيل اشتراكك ({العرض}) بتاريخ {البداية}.\nاشتراكك بينتهي بتاريخ {التاريخ}.\nبالتوفيق بتمرينك 💪',
      soon: 'مرحبا {الاسم} 👋\nبنذكّرك إنه اشتراكك في {النادي} بينتهي بتاريخ {التاريخ} ({المتبقي}).\nجدّد قبل ما يخلص وكمّل تمرينك معنا 💪',
      expired: 'مرحبا {الاسم}\nاشتراكك في {النادي} انتهى بتاريخ {التاريخ}. اشتقنالك 👑\nمرّ علينا لتجدّد وترجع عالتمرين 💪'
    }
  };
}

export function mergeSettings(d) {
  const s = defaultSettings();
  if (!d || typeof d !== 'object') return s;
  if (typeof d.gymName === 'string' && d.gymName.trim()) s.gymName = d.gymName.trim();
  const ad = Number(d.alertDays); if (isFinite(ad) && ad >= 1) s.alertDays = Math.min(30, Math.round(ad));
  const nh = Number(d.notifyHour); if (isFinite(nh) && nh >= 0 && nh <= 23) s.notifyHour = Math.round(nh);
  if (Array.isArray(d.offers) && d.offers.length) {
    s.offers = d.offers.filter(o => o && String(o.name || '').trim()).map((o, i) => ({
      id: String(o.id || ('o' + i)),
      name: String(o.name).trim(),
      amount: Math.max(1, Math.round(Number(o.amount) || 1)),
      unit: ['month', 'week', 'day'].includes(o.unit) ? o.unit : 'month',
      price: (o.price === null || o.price === undefined || o.price === '' || isNaN(Number(o.price))) ? null : Number(o.price)
    }));
  }
  if (Array.isArray(d.captains)) s.captains = d.captains.map(x => String(x || '').trim()).filter(Boolean);
  if (d.templates && typeof d.templates === 'object') {
    for (const k of ['confirm', 'soon', 'expired']) {
      if (typeof d.templates[k] === 'string' && d.templates[k].trim()) s.templates[k] = d.templates[k];
    }
  }
  return s;
}

/* ---------------- نصوص وأرقام ---------------- */
export function toLatin(s) {
  return String(s == null ? '' : s)
    .replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c)))
    .replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
}
// توحيد الكتابة العربية للبحث: أ/إ/آ → ا، ة → ه، ى → ي، وحذف التشكيل
export function norm(s) {
  return toLatin(s).toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').replace(/ؤ/g, 'و').replace(/ئ/g, 'ي')
    .replace(/\s+/g, ' ').trim();
}
export function firstName(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
export function countPhrase(n, one = 'مشترك', many = 'مشتركين') {
  if (n === 1) return one + ' واحد';
  if (n === 2) return 'اثنين ' + many;
  if (n >= 3 && n <= 10) return n + ' ' + many;
  return n + ' ' + one;
}
export function daysWord(n) { n = Math.abs(n); return n === 1 ? 'يوم' : n === 2 ? 'يومين' : (n >= 3 && n <= 10) ? n + ' أيام' : n + ' يوم'; }
export function money(p) {
  if (p === null || p === undefined || p === '' || isNaN(Number(p))) return '—';
  return (Math.round(Number(p) * 100) / 100) + ' د.أ';
}

/* ---------------- تواريخ (YYYY-MM-DD بالتوقيت المحلي) ---------------- */
const pad = n => (n < 10 ? '0' : '') + n;
export function dStr(dt) { return dt.getFullYear() + '-' + pad(dt.getMonth() + 1) + '-' + pad(dt.getDate()); }
export function todayStr() { return dStr(new Date()); }
export function parseD(s) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || '');
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3]);
  return (d.getMonth() === +m[2] - 1) ? d : null;
}
export function diffDays(a, b) {
  const x = parseD(a), y = parseD(b);
  if (!x || !y) return NaN;
  return Math.round((y - x) / 86400000);
}
export function addDays(s, n) { const d = parseD(s); if (!d) return ''; d.setDate(d.getDate() + n); return dStr(d); }
export function addMonths(s, n) {
  const d = parseD(s); if (!d) return '';
  const day = d.getDate();
  const t = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(day, last));
  return dStr(t);
}
// نهاية الاشتراك: الشهور بنفس اليوم من الشهر اللي بعده (3/11 → 3/12)،
// والأيام بتنحسب مع يوم البداية (Day Pass بيخلص بنفس اليوم).
export function computeEnd(start, amount, unit) {
  const n = Math.max(0, Math.round(Number(amount) || 0));
  if (!parseD(start) || !n) return '';
  if (unit === 'month') return addMonths(start, n);
  if (unit === 'week') return addDays(start, n * 7);
  return addDays(start, n - 1);
}
export function fmtD(s) { const d = parseD(s); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : '—'; }
export function fmtShort(s) { const d = parseD(s); return d ? d.getDate() + ' ' + MONTHS[d.getMonth()] : '—'; }
export function longD(s) { const d = parseD(s); return d ? WEEKDAYS[d.getDay()] + '، ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear() : ''; }
export function relDay(s, today) {
  const n = diffDays(s, today);
  if (isNaN(n)) return '—';
  if (n === 0) return 'اليوم';
  if (n === 1) return 'مبارح';
  if (n > 1 && n < 7) return 'قبل ' + daysWord(n);
  return fmtShort(s);
}
export function durLabel(amount, unit) {
  const n = Number(amount) || 0;
  if (unit === 'month') return n === 1 ? 'شهر' : n === 2 ? 'شهرين' : n === 12 ? 'سنة' : n <= 10 ? n + ' شهور' : n + ' شهر';
  if (unit === 'week') return n === 1 ? 'أسبوع' : n === 2 ? 'أسبوعين' : n <= 10 ? n + ' أسابيع' : n + ' أسبوع';
  return n === 1 ? 'يوم' : daysWord(n);
}
export function remainPhrase(d) {
  if (isNaN(d)) return '';
  if (d < 0) return 'انتهى من ' + daysWord(-d);
  if (d === 0) return 'اليوم آخر يوم';
  if (d === 1) return 'باقي يوم واحد';
  return 'باقي ' + daysWord(d);
}
export function dateInZone(date, tz) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function hourInZone(date, tz) {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', hour12: false }).format(date)) % 24;
}

/* ---------------- أرقام الجوال (أردني أولاً) ---------------- */
export function intlPhone(raw) {
  let d = toLatin(raw).replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('962')) return d;
  if (d.startsWith('0')) return '962' + d.slice(1);
  if (d.length === 9 && d.startsWith('7')) return '962' + d;
  return d;
}
export function localPhone(raw) { const i = intlPhone(raw); return i.startsWith('962') ? '0' + i.slice(3) : i; }
export function prettyPhone(raw) {
  const l = localPhone(raw);
  return /^07\d{8}$/.test(l) ? l.slice(0, 3) + ' ' + l.slice(3, 6) + ' ' + l.slice(6) : l;
}
export function isJoMobile(raw) { return /^9627[789]\d{7}$/.test(intlPhone(raw)); }
export function waLink(phone, text) { return 'https://wa.me/' + intlPhone(phone) + (text ? '?text=' + encodeURIComponent(text) : ''); }

/* ---------------- حالة الاشتراك ---------------- */
export function daysLeft(m, today) { return diffDays(today, m.endDate); }
export function periodDays(m) { return diffDays(m.startDate, m.endDate); }
export function isShort(m) { const p = periodDays(m); return !isNaN(p) && p < 7; }
export function status(m, today, alertDays) {
  const d = daysLeft(m, today);
  if (isNaN(d)) return 'none';
  if (d < 0) return 'expired';
  if (isShort(m)) return 'active';
  return d <= alertDays ? 'soon' : 'active';
}
export function remindKind(m, today) { return daysLeft(m, today) < 0 ? 'expired' : 'soon'; }
export function remindKey(m, today) { return m.endDate + ':' + remindKind(m, today); }
export function isReminded(m, today) { return m.remindKey === remindKey(m, today); }
// بحاجة تذكير: قرب ينتهي، أو انتهى خلال آخر 30 يوم، ولسا ما انبعتله تذكير لهالفترة
export function needsRemind(m, today, s) {
  if (m.archived || isShort(m)) return false;
  const d = daysLeft(m, today);
  if (isNaN(d) || d > s.alertDays || d < -30) return false;
  return !isReminded(m, today);
}
export function inRemindWindow(m, today, s) {
  if (m.archived || isShort(m)) return false;
  const d = daysLeft(m, today);
  return !isNaN(d) && d <= s.alertDays && d >= -30;
}
export function urgency(m, today, alertDays) {
  const d = daysLeft(m, today);
  if (isNaN(d)) return 1e7;
  if (d >= 0 && d <= alertDays) return d;
  if (d < 0 && d >= -30) return alertDays + 0.5 + (-d) / 100;
  if (d > alertDays) return d;
  return 1e6 - d;
}

/* ---------------- ملخص الإشعار اليومي (نفس الدالة بالسيرفر والتطبيق) ---------------- */
export function buildDigest(members, s, today) {
  const g = { today: [], soon: [], expired: [] };
  for (const m of members) {
    if (m.isTest || !needsRemind(m, today, s)) continue;
    const d = daysLeft(m, today);
    if (d === 0) g.today.push(m);
    else if (d > 0) g.soon.push(m);
    else if (d >= -3) g.expired.push(m);
  }
  g.soon.sort((a, b) => daysLeft(a, today) - daysLeft(b, today));
  const total = g.today.length + g.soon.length + g.expired.length;
  const who = list => list.length === 1 ? list[0].name : countPhrase(list.length);
  const parts = [];
  if (g.today.length) parts.push(who(g.today) + (g.today.length === 1 ? ' اشتراكه بينتهي اليوم' : ' اشتراكهم بينتهي اليوم'));
  if (g.soon.length) parts.push(who(g.soon) + (g.soon.length === 1 ? ' اشتراكه بينتهي خلال ' : ' اشتراكهم بينتهي خلال ') + daysWord(s.alertDays));
  if (g.expired.length) parts.push(who(g.expired) + (g.expired.length === 1 ? ' انتهى اشتراكه مؤخراً' : ' انتهى اشتراكهم مؤخراً'));
  return {
    total,
    counts: { today: g.today.length, soon: g.soon.length, expired: g.expired.length },
    groups: g,
    title: s.gymName + ' · تذكيرات اليوم',
    body: total ? parts.join('، ') + '. افتح التطبيق لترسل التذكيرات.' : 'ما في اشتراكات بحاجة تذكير اليوم ✓'
  };
}

/* ---------------- الحضور والالتزام ---------------- */
export function visitsOf(m) { return Array.isArray(m.visits) ? Array.from(new Set(m.visits.filter(v => parseD(v)))).sort() : []; }
export function commitment(m, today) {
  const v = visitsOf(m);
  const month = today.slice(0, 7);
  const info = { total: v.length, month: v.filter(x => x.startsWith(month)).length, last: v[v.length - 1] || null, perWeek: 0, level: 0, label: 'ما في حضور مسجّل', pct: 0 };
  if (!v.length) return info;
  let end = today;
  if (m.endDate && diffDays(m.endDate, today) > 0) end = m.endDate; // منتهي: نقيس آخر فترة كان فيها مشترك
  const starts = [m.startDate].concat((m.history || []).map(h => h.startDate)).filter(x => parseD(x)).sort();
  let start = addDays(end, -27);
  if (starts.length && diffDays(start, starts[0]) > 0) start = starts[0];
  const days = Math.max(diffDays(start, end) + 1, 7);
  const n = v.filter(x => x >= start && x <= end).length;
  info.perWeek = Math.round(n / days * 7 * 10) / 10;
  info.pct = Math.min(100, Math.round(info.perWeek / 5 * 100));
  if (info.perWeek >= 4) { info.level = 4; info.label = 'ممتاز'; }
  else if (info.perWeek >= 2.5) { info.level = 3; info.label = 'منتظم'; }
  else if (info.perWeek >= 1.2) { info.level = 2; info.label = 'متقطّع'; }
  else { info.level = 1; info.label = 'ضعيف'; }
  return info;
}

/* ---------------- رسائل واتساب ---------------- */
export function fillTemplate(kind, m, s, today) {
  const t = (s.templates && s.templates[kind]) || '';
  const map = {
    'الاسم': firstName(m.name), 'النادي': s.gymName, 'العرض': m.offer || '',
    'التاريخ': fmtD(m.endDate), 'البداية': fmtD(m.startDate),
    'المتبقي': remainPhrase(daysLeft(m, today)), 'المبلغ': m.price == null ? '' : money(m.price)
  };
  return t.replace(/\{([^{}]+)\}/g, (all, k) => Object.prototype.hasOwnProperty.call(map, k.trim()) ? map[k.trim()] : all);
}

/* ---------------- اختبارات ذاتية (أدوات المطوّر) ---------------- */
export function selfTests() {
  const s = defaultSettings();
  const T = [];
  const t = (name, fn) => { try { const r = fn(); T.push({ name, ok: r === true, detail: r === true ? '' : String(r) }); } catch (e) { T.push({ name, ok: false, detail: e.message }); } };
  const eq = (a, b) => a === b ? true : 'متوقع ' + JSON.stringify(b) + ' والناتج ' + JSON.stringify(a);
  t('شهر من 3 تشرين الثاني بينتهي 3 كانون الأول', () => eq(computeEnd('2026-11-03', 1, 'month'), '2026-12-03'));
  t('شهر من 31 كانون الثاني بينتهي آخر شباط', () => eq(computeEnd('2027-01-31', 1, 'month'), '2027-02-28'));
  t('سنة من 29 شباط بتنتهي 28 شباط', () => eq(computeEnd('2028-02-29', 12, 'month'), '2029-02-28'));
  t('Day Pass بيخلص بنفس اليوم', () => eq(computeEnd('2026-11-03', 1, 'day'), '2026-11-03'));
  t('فرق الأيام عبر نهاية السنة', () => eq(diffDays('2026-12-30', '2027-01-02'), 3));
  t('تاريخ غلط بيرجع فاضي', () => eq(parseD('2026-02-30'), null));
  t('رقم 079 بيتحول لـ 962', () => eq(intlPhone('079 123 4567'), '962791234567'));
  t('رقم بأرقام عربية', () => eq(intlPhone('٠٧٨٥٥٥٦٦٧٧'), '962785556677'));
  t('رقم +962 بيرجع 07', () => eq(localPhone('+962 77 999 8877'), '0779998877'));
  t('رقم أردني صحيح', () => eq(isJoMobile('0791234567'), true));
  t('بحث: أحمد = احمد', () => eq(norm('أحمد'), norm('احمد')));
  t('بحث: مكة = مكه', () => eq(norm('مكة'), norm('مكه')));
  const today = '2026-11-03';
  const mk = (end, extra) => Object.assign({ name: 'تجربة', startDate: addMonths(end, -1), endDate: end }, extra || {});
  t('باقي 10 أيام = فعّال', () => eq(status(mk('2026-11-13'), today, 5), 'active'));
  t('باقي 5 أيام = قرب ينتهي', () => eq(status(mk('2026-11-08'), today, 5), 'soon'));
  t('بينتهي اليوم = قرب ينتهي', () => eq(status(mk('2026-11-03'), today, 5), 'soon'));
  t('انتهى مبارح = منتهي', () => eq(status(mk('2026-11-02'), today, 5), 'expired'));
  t('Day Pass ما بينحسب بالتذكيرات', () => eq(needsRemind({ name: 'x', startDate: today, endDate: today }, today, s), false));
  t('بعد التذكير ما بيرجع يطلب تذكير', () => { const m = mk('2026-11-05'); m.remindKey = remindKey(m, today); return eq(needsRemind(m, today, s), false); });
  t('بعد ما ينتهي بيطلب تذكير جديد', () => { const m = mk('2026-11-01'); m.remindKey = '2026-11-01:soon'; return eq(needsRemind(m, today, s), true); });
  t('ملخص الصبح بيعد صح', () => {
    const list = [mk('2026-11-03', { name: 'أ' }), mk('2026-11-06', { name: 'ب' }), mk('2026-11-07', { name: 'ج' }), mk('2026-11-01', { name: 'د' }), mk('2026-12-20', { name: 'هـ' }), mk('2026-11-04', { name: 'تست', isTest: true })];
    const dg = buildDigest(list, s, today);
    return eq(JSON.stringify(dg.counts), JSON.stringify({ today: 1, soon: 2, expired: 1 }));
  });
  t('الالتزام: 12 زيارة بآخر 4 أسابيع = منتظم', () => {
    const v = []; for (let i = 0; i < 12; i++) v.push(addDays(today, -i * 2));
    return eq(commitment(mk('2026-11-20', { startDate: '2026-09-01', visits: v }), today).label, 'منتظم');
  });
  t('رسالة التذكير فيها الاسم والتاريخ', () => {
    const txt = fillTemplate('soon', { name: 'محمد العلي', startDate: '2026-10-08', endDate: '2026-11-08', offer: 'شهر' }, s, today);
    return txt.includes('محمد') && txt.includes('8 تشرين الثاني 2026') && txt.includes('باقي 5 أيام') ? true : txt;
  });
  return T;
}
