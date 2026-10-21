// T-026b — ทดสอบเครื่องคำนวณเงิน "ของจริง" ที่ดึงจาก index.html (ไม่ใช่โมเดลจำลอง) ตามสเปก docs/specs/T-026-money-tracking.md §6
// วิธีใช้: node tools/test-money-engine.js index.html   · ควรรันซ้ำด้วย TZ=Pacific/Honolulu และ TZ=Pacific/Kiritimati (B-3)
// exit 0 = ผ่านทั้งหมด · exit 1 = มีข้อไม่ผ่าน
const fs = require('fs');
const vm = require('vm');
const SRC = fs.readFileSync(process.argv[2], 'utf8').replace(/\r\n/g, '\n');

// ---------- extraction ----------
const between = (a, b) => { const i = SRC.indexOf(a), j = SRC.indexOf(b, i); if (i < 0 || j < 0) throw new Error('marker ' + a); return SRC.slice(i, j); };
function skipString(s, j) { const q = s[j]; j++; while (j < s.length && s[j] !== q) { if (s[j] === '\\') j++; j++; } return j; }
function grab(start) {
  const i = SRC.indexOf(start); if (i < 0) throw new Error('missing ' + start); let d = 0;
  for (let j = SRC.indexOf('{', i); j < SRC.length; j++) {
    const c = SRC[j];
    if (c === '/' && SRC[j + 1] === '/') { j = SRC.indexOf('\n', j); continue; }
    if (c === '/' && SRC[j + 1] === '*') { j = SRC.indexOf('*/', j) + 1; continue; }
    if (c === '"' || c === "'" || c === '`') { j = skipString(SRC, j); continue; }
    if (c === '{') d++; else if (c === '}') { d--; if (d === 0) return SRC.slice(i, j + 1); }
  }
}
const line = s => { const i = SRC.indexOf(s); if (i < 0) throw new Error('missing ' + s); return SRC.slice(i, SRC.indexOf('\n', i)); };
const CODE = [
  between("const STORAGE_KEY = 'pracal_v1';", 'const CATEGORIES = ['),
  line('const MAX_USERS = '), grab('function dateToKey('), grab('function formatDateTH('),
  between('/* ========== BACKUP v2 + RESTORE', '/* ========== CSV EXPORT')
].join('\n');

function makeStorage() {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) };
}
// แทน IndexedDB: transaction ทีละอันตามคิว (เหมือน readwrite ที่ทับกัน) · เขียนล้มเหลว = ไม่เปลี่ยนอะไร
function memMoneyBackend() {
  let raw = null, failWrites = false, q = Promise.resolve();
  return {
    readRaw: async () => raw,
    transact(fn) {
      const p = q.then(async () => {
        await new Promise(r => setTimeout(r, 1));           // ให้อีกแท็บมีโอกาสแทรก ถ้ากลไกไม่กันจริง
        const step = fn(raw);
        if (step.write !== undefined) { if (failWrites) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } raw = step.write; }
        return step.result;
      });
      q = p.catch(() => {});
      return p;
    },
    raw: () => raw, set: v => { raw = v; }, fail: v => { failWrites = v; }
  };
}
function makeStores() { return { ls: makeStorage(), money: memMoneyBackend() }; }
function makeTab(stores) {
  const ctx = { console, localStorage: stores.ls, sessionStorage: makeStorage(), window: {}, navigator: {}, location: { reload() {} }, __be: stores.money };
  vm.createContext(ctx);
  vm.runInContext(CODE, ctx);
  vm.runInContext('_moneyBackend = __be', ctx);
  return name => vm.runInContext(name, ctx);
}

// ---------- assertions ----------
let n = 0, fails = 0;
const B = x => Math.round(x * 100);
const ok = (label, cond, got) => { n++; if (!cond) fails++; console.log((cond ? '  ok   ' : '  FAIL ') + label + (cond ? '' : '   got: ' + JSON.stringify(got))); };
const eqB = (label, got, baht) => ok(label + ' = ' + baht.toLocaleString('en-US'), got === B(baht), got / 100);
const eq = (label, got, want) => ok(label, JSON.stringify(got) === JSON.stringify(want), got);
const has = (label, err, frag) => ok(label + ' → "' + frag + '"', typeof err === 'string' && err.includes(frag), err);
const sec = t => console.log('\n=== ' + t + ' ===');

// ---------- build §6.1 through the real commit path ----------
const TODAY = '2026-11-30';
(async () => {
const store = makeStores();
store.ls.setItem('pracal_v1', '{"users":[{"id":"uA","name":"A"}],"logs":{}}');
const healthBefore = store.ls.getItem('pracal_v1');
const A = makeTab(store);
const commit = A('moneyCommit'), user = A('moneyUser');
const F = { upsert: A('moneyUpsertTxn'), addDebt: A('moneyAddDebt'), buy: A('moneyCreateInstallmentPurchase'), anchor: A('moneyAddDebtAnchor'),
  del: A('moneyDeleteTxn'), delFx: A('moneyDeleteEffects'), close: A('moneyCloseDebt'), delDebt: A('moneyDeleteDebt'),
  change: A('moneyChangeDebt'), changePrev: A('moneyDebtChangePreview') };
const Q = { sum: A('moneySummary'), debt: A('moneyDebtBalanceAt'), debts: A('moneyDebtTotalsAt'), others: A('moneyBalancesWithOthersAt'),
  filt: A('moneyFilteredCost'), validate: A('moneyValidateUser'), period: A('moneyPeriodRange'), asOf: A('moneyAsOf'),
  facts: A('moneyAnchorFacts'), dup: A('moneyInstallmentDupWarning'), delta: A('moneyMonthlyDelta'), parse: A('parseMoneyInput'),
  fmt: A('formatMoney'), parseBackup: A('parseBackupText') };
const run = async (fn, today = TODAY) => { const r = await commit(d => fn(user(d, 'uA'), today)); if (!r.ok) throw new Error('setup commit failed: ' + r.error); return r; };
const exp = (id, date, amt, cat, ctx, mine = amt, extra = {}) => ({ id, kind: 'expense', date, amount: B(amt), categoryId: cat, contextId: ctx, myShare: B(mine), ...extra });
const pay = (id, date, debtId, amt, p, i, f) => ({ id, kind: 'debtPayment', date, debtId, amount: B(amt), principal: p == null ? null : B(p), interest: p == null ? null : B(i), fee: p == null ? null : B(f) });

await run((mu, t) => {
  mu.enabled = true;
  F.addDebt(mu, { id: 'D1', name: 'ผ่อนมือถือ', type: 'installment', interestFree: true, categoryId: 'c_shop', contextId: 'x_self', originDate: '2026-06-01', startDate: '2026-10-01', startBalance: B(12000), installment: B(2000), dueDay: 5 }, t);
  F.addDebt(mu, { id: 'D2', name: 'บัตรกดเงินสด X', type: 'loan', startDate: '2026-10-01', startBalance: B(30000) }, t);
});
const steps = [
  { id: 'T1', kind: 'income', date: '2026-10-01', amount: B(35000), categoryId: 'i_salary' },
  exp('T2', '2026-10-03', 60, 'c_food', 'x_self'),
  pay('T3', '2026-10-05', 'D1', 2000, 2000, 0, 0),
  exp('T4', '2026-10-10', 1200, 'c_food', 'x_friend', 600),
  exp('T5', '2026-10-12', 2000, 'c_fun', 'x_self'),
  pay('T6', '2026-10-15', 'D2', 3000, null),
  exp('T7', '2026-10-20', 900, 'c_food', 'x_partner'),
  exp('T8', '2026-10-18', 44, 'c_travel', 'x_self'),
  exp('T9', '2026-10-31', 800, 'c_food', 'x_friend', 400),
  { id: 'T10', kind: 'income', date: '2026-11-01', amount: B(35000), categoryId: 'i_salary' }
];
for (const t of steps) await run(mu => F.upsert(mu, t, TODAY));
await run((mu, t) => F.buy(mu, { debtId: 'D3', downTxnId: 'T17', name: 'ทีวี', date: '2026-11-02', price: B(15000), down: B(3000), categoryId: 'c_shop', contextId: 'x_self', interestFree: true, installment: B(1000) }, t));
const steps2 = [
  { id: 'T12', kind: 'moneyBack', backType: 'refund', date: '2026-11-03', amount: B(2000), allocations: [{ txnId: 'T5', mine: B(2000), others: 0 }] },
  pay('T13', '2026-11-05', 'D1', 2000, 2000, 0, 0),
  { id: 'T11', kind: 'moneyBack', backType: 'reimburse', date: '2026-11-08', amount: B(700), allocations: [{ txnId: 'T9', amount: B(400) }, { txnId: 'T4', amount: B(300) }] }
];
for (const t of steps2) await run(mu => F.upsert(mu, t, TODAY));
await run((mu, t) => F.anchor(mu, 'D2', { id: 'A1', type: 'statement', date: '2026-11-10', balance: B(27450) }, t));
for (const t of [
  exp('T15', '2026-11-12', 300, 'c_fun', 'x_self'),
  pay('T16', '2026-11-15', 'D2', 3000, 2600, 300, 100),
  { id: 'W1', kind: 'writeOff', date: '2026-11-20', amount: B(300), sourceTxnId: 'T4', categoryId: 'c_food', contextId: 'x_friend' },
  pay('T18', '2026-11-25', 'D3', 1000, 1000, 0, 0)
]) await run(mu => F.upsert(mu, t, TODAY));
const MU = A('_money').byUser.uA;
const clone = o => JSON.parse(JSON.stringify(o));
const D = (mu, id) => mu.debts.find(d => d.id === id);
const tryMut = (fn) => { const mu = clone(MU); try { fn(mu); } catch (e) { return { mu, error: e.message }; } return { mu, error: Q.validate(mu) }; };

sec('ข้อมูลชุด §6.1 ผ่านกติกาทั้งชุด');
eq('validate(final)', Q.validate(MU), null);
eq('ข้อมูลสุขภาพ pracal_v1 ไม่ถูกแตะ (H-1)', store.ls.getItem('pracal_v1') === healthBefore, true);

sec('6.2 ตุลาคม');
let s = Q.sum(MU, '2026-10-01', '2026-10-31');
eqB('รายรับ', s.cash.income, 35000); eqB('เงินคืน', s.cash.back, 0); eqB('เงินเข้า', s.cash.cashIn, 35000);
eqB('จ่ายค่าใช้จ่าย', s.cash.paid, 5004); eqB('จ่ายหนี้', s.cash.debtPaid, 5000); eqB('คืนเงินให้คนอื่น', s.cash.payOut, 0);
eqB('เงินออก', s.cash.cashOut, 10004); eqB('ผลต่าง', s.cash.net, 24996);
eqB('ค่าใช้จ่ายของฉัน', s.mine, 6004);
eqB('AC-2 กระทบยอด', s.reconcile.paid - s.reconcile.othersShare + s.reconcile.writeOff - s.reconcile.refundMine + s.reconcile.installment + s.reconcile.interestFee, 6004);
eqB('  ส่วนของคนอื่น', s.reconcile.othersShare, 1000); eqB('  งวดผ่อนสินค้า', s.reconcile.installment, 2000);
eqB('ยอดชำระที่ยังไม่แยกเงินต้น/ดอกเบี้ย (C2)', s.unsplitLoan, 3000); eq('  ลิงก์ไปงวด T6', s.unsplitTxnIds, ['T6']);
eqB('AC-3 อาหาร', s.byCategory.c_food.net, 1960); eqB('AC-3 เกม/บันเทิง', s.byCategory.c_fun.net, 2000);
eqB('AC-3 ช้อปปิ้ง (งวด D1)', s.byCategory.c_shop.net, 2000); eqB('AC-3 เดินทาง', s.byCategory.c_travel.net, 44);
eqB('AC-4 ตัวเอง', s.byContext.x_self, 4104); eqB('AC-4 เพื่อน', s.byContext.x_friend, 1000); eqB('AC-4 แฟน', s.byContext.x_partner, 900);
eqB('หนี้: เงินต้น', s.debt.principal, 2000); eqB('หนี้: ยังไม่แยก', s.debt.unsplit, 3000);
let f = Q.filt(MU, '2026-10-01', '2026-10-15', 'c_food', 'x_partner'); eq('AC-5 อาหาร×แฟน 1–15 ต.ค. = 0 · 0 รายการ', [f.net, f.count], [0, 0]);
f = Q.filt(MU, '2026-10-01', '2026-10-31', 'c_food', 'x_partner'); eq('AC-5 อาหาร×แฟน ต.ค. = 900 · 1 รายการ', [f.net, f.count], [B(900), 1]);
f = Q.filt(MU, '2026-10-01', '2026-10-31', 'c_food', 'x_friend'); eq('AC-6 อาหาร×เพื่อน ต.ค. ของฉัน 1,000 · จ่ายไป 2,000', [f.net, f.paid], [B(1000), B(2000)]);

sec('6.2 พฤศจิกายน');
s = Q.sum(MU, '2026-11-01', '2026-11-30');
eqB('AC-1 รายรับ (ไม่รวมเงินคืน)', s.cash.income, 35000); eqB('เงินคืน', s.cash.back, 2700); eqB('เงินเข้า', s.cash.cashIn, 37700);
eqB('จ่ายค่าใช้จ่าย (รวมดาวน์)', s.cash.paid, 3300); eqB('จ่ายหนี้', s.cash.debtPaid, 6000); eqB('เงินออก', s.cash.cashOut, 9300); eqB('ผลต่าง', s.cash.net, 28400);
eqB('ค่าใช้จ่ายของฉัน', s.mine, 5000);
eqB('AC-7 กระทบยอด', s.reconcile.paid - s.reconcile.othersShare + s.reconcile.writeOff - s.reconcile.refundMine + s.reconcile.installment + s.reconcile.interestFee, 5000);
eqB('  ไม่ต้องคืนแล้ว', s.reconcile.writeOff, 300); eqB('  ร้านคืน', s.reconcile.refundMine, 2000); eqB('  งวดผ่อน', s.reconcile.installment, 3000); eqB('  ดอก/ค่าธรรมเนียม', s.reconcile.interestFee, 400);
eq('AC-8 เกม/บันเทิง จ่าย/คืน/สุทธิ = 300/2,000/−1,700', s.byCategory.c_fun, { paid: B(300), refunded: B(2000), net: B(-1700) });
const cat = id => (s.byCategory[id] || { net: 0 }).net; eqB('AC-8 ช้อปปิ้ง', cat('c_shop'), 6000); eqB('AC-8 ดอกเบี้ย/ค่าธรรมเนียม', cat('c_interest'), 400); eqB('AC-8 อาหาร', cat('c_food'), 300);
eqB('AC-8 ตัวเอง', s.byContext.x_self, 4700); eqB('AC-8 เพื่อน', s.byContext.x_friend, 300);
eq('หนี้ เงินต้น/ดอก/ค่าธรรมเนียม/ยังไม่แยก', [s.debt.principal, s.debt.interest, s.debt.fee, s.debt.unsplit], [B(5600), B(300), B(100), 0]);
ok('AC-9 ไม่มีตัวเลข 15,000 / 12,000 / 30,000 ในเงินออกเดือนใด', ![Q.sum(MU, '2026-10-01', '2026-10-31'), s].some(x => [B(15000), B(12000), B(30000)].includes(x.cash.cashOut)));

sec('6.3 ยอด ณ วันที่');
let d2 = Q.debt(MU, D(MU, 'D2'), '2026-10-31');
eq('AS-1 D1 ณ 31 ต.ค. ยืนยัน 10,000', Q.debt(MU, D(MU, 'D1'), '2026-10-31'), { confirmed: true, balance: B(10000), basedOn: '2026-10-01', anchorType: 'start' });
eq('AS-1 D2 ณ 31 ต.ค. ยังไม่ยืนยัน (30,000 ณ 1 ต.ค. · จ่ายหลังจากนั้น 3,000)', [d2.confirmed, d2.lastConfirmed, d2.lastConfirmedDate, d2.paidSince, 'balance' in d2], [false, B(30000), '2026-10-01', B(3000), false]);
eq('AS-1 D3 ณ 31 ต.ค. ยังไม่เริ่มติดตาม', Q.debt(MU, D(MU, 'D3'), '2026-10-31'), null);
eq('AS-1 หนี้รวม ณ 31 ต.ค. = ยืนยัน 10,000 · ยังไม่ยืนยัน 1 · ไม่มีผลรวมทั้งหมด', Q.debts(MU, '2026-10-31'), { confirmedTotal: B(10000), confirmedCount: 1, unconfirmedCount: 1, total: null });
eqB('AS-1 ค้างรับ ณ 31 ต.ค.', Q.others(MU, '2026-10-31').receivable, 1000);
eq('AS-2 D1/D2/D3 ณ 30 พ.ย.', ['D1', 'D2', 'D3'].map(id => Q.debt(MU, D(MU, id), '2026-11-30').balance), [B(8000), B(24850), B(11000)]);
eq('AS-2 หนี้รวม 43,850 (ยืนยันครบ)', Q.debts(MU, '2026-11-30').total, B(43850));
eq('AS-2 ค้างรับ / ต้องคืน ณ 30 พ.ย.', [Q.others(MU, '2026-11-30').receivable, Q.others(MU, '2026-11-30').payable], [0, 0]);
// AS-3: เดือน ต.ค. ที่ดูจากข้อมูลเฉพาะเหตุการณ์ ≤ 31 ต.ค. ต้องเท่ากับดูจากข้อมูลสุดท้าย
const octOnly = clone(MU); octOnly.txns = octOnly.txns.filter(t => t.date <= '2026-10-31'); octOnly.debts = octOnly.debts.filter(d => d.anchors[0].date <= '2026-10-31');
octOnly.debts.forEach(d => { d.anchors = d.anchors.filter(a => a.date <= '2026-10-31'); });
const keyNums = mu => { const x = Q.sum(mu, '2026-10-01', '2026-10-31'); return [x.cash, x.mine, x.byCategory, x.byContext, Q.debts(mu, '2026-10-31'), Q.others(mu, '2026-10-31').receivable]; };
eq('AS-3 รายงาน ต.ค. ดู ณ 31 ต.ค. = ดู ณ 30 พ.ย. (ทุกตัวเลข)', keyNums(octOnly), keyNums(MU));
eq('AS-4 ช่วง 15 ต.ค.–15 พ.ย. ดูวันที่ 21 พ.ย. → ณ สิ้นช่วง', Q.asOf({ start: '2026-10-15', end: '2026-11-15' }, '2026-11-21'), { date: '2026-11-15', label: 'ณ สิ้นช่วง 15 พ.ย. 2569' });
eq('AS-5 เดือนนี้ระหว่างเดือน → ณ วันนี้', Q.asOf(Q.period('month', '2026-11-11'), '2026-11-11').date, '2026-11-11');

sec('6.4 เหตุการณ์ข้ามเดือน');
eq('X-1 ค้างรับ ณ 31 ต.ค. 2 รายการ', Q.others(MU, '2026-10-31').items.map(i => i.txnId), ['T4', 'T9']);
let nov2 = Q.sum(MU, '2026-11-02', '2026-11-02');
eqB('X-2 เงินออกวันซื้อทีวี (ดาวน์เท่านั้น)', nov2.cash.cashOut, 3000);
eq('X-2 D3 ณ 2 พ.ย. ยืนยัน 12,000', Q.debt(MU, D(MU, 'D3'), '2026-11-02').balance, B(12000));
eq('X-2 ลิงก์สองทาง ทีวี ↔ T17', [D(MU, 'D3').purchase.downPaymentTxnId, MU.txns.find(t => t.id === 'T17').debtId], ['T17', 'D3']);
eqB('X-3 ต.ค. เกม/บันเทิง ยัง 2,000 หลังร้านคืน 3 พ.ย.', Q.sum(MU, '2026-10-01', '2026-10-31').byCategory.c_fun.net, 2000);
eq('X-3 1–3 พ.ย. เกม/บันเทิง จ่าย 0 / คืน 2,000 / −2,000', Q.sum(MU, '2026-11-01', '2026-11-03').byCategory.c_fun, { paid: 0, refunded: B(2000), net: B(-2000) });
eq('X-4 ค้างรับ ณ 8 พ.ย. = T4 300 เท่านั้น', Q.others(MU, '2026-11-08').items, [{ txnId: 'T4', date: '2026-10-10', pos: B(300) }]);
eqB('X-4 ค้างรับ ณ 7 พ.ย.', Q.others(MU, '2026-11-07').receivable, 1000);
d2 = Q.debt(MU, D(MU, 'D2'), '2026-11-09');
eq('X-5 D2 ณ 9 พ.ย. ยังไม่ยืนยัน · ไม่มีตัวเลขยอด', [d2.confirmed, d2.lastConfirmed, 'balance' in d2], [false, B(30000), false]);
ok('X-5 ไม่มีคำว่า "อย่างน้อย" ในโค้ดเงิน', !between('/* ========== MONEY', '/* ========== CSV EXPORT').includes('อย่างน้อย'));
eq('X-6 D2 ณ 10 พ.ย. ยืนยัน 27,450', Q.debt(MU, D(MU, 'D2'), '2026-11-10').balance, B(27450));
const A1 = D(MU, 'D2').anchors.find(a => a.id === 'A1');
eq('X-6 ข้อเท็จจริงใบแจ้ง: จ่ายไป 3,000 · ยอดลดลง 2,550', [Q.facts(MU, D(MU, 'D2'), A1).paidSince, Q.facts(MU, D(MU, 'D2'), A1).decreasedBy], [B(3000), B(2550)]);
eqB('X-6 ใบแจ้งไม่สร้างเงินออก (10 พ.ย.)', Q.sum(MU, '2026-11-10', '2026-11-10').cash.cashOut, 0);
eqB('X-7 ค้างรับ ณ 20 พ.ย.', Q.others(MU, '2026-11-20').receivable, 0);
eqB('X-7 ยกให้ลง พ.ย. (อาหาร·เพื่อน 20 พ.ย.)', Q.filt(MU, '2026-11-20', '2026-11-20', 'c_food', 'x_friend').net, 300);
eqB('X-7 ต.ค. ยัง 6,004', Q.sum(MU, '2026-10-01', '2026-10-31').mine, 6004);
eq('X-8 D3 ณ 25 พ.ย.', Q.debt(MU, D(MU, 'D3'), '2026-11-25').balance, B(11000));

sec('6.5 แก้ไข / ลบ / หนี้ / จัดสรร');
let r = tryMut(mu => { const t = mu.txns.find(x => x.id === 'T13'); t.amount = t.principal = B(1500); });
eq('E-1 D1 = 8,500', Q.debt(r.mu, D(r.mu, 'D1'), TODAY).balance, B(8500)); eqB('E-1 พ.ย. เงินออก', Q.sum(r.mu, '2026-11-01', '2026-11-30').cash.cashOut, 8800); eqB('E-1 พ.ย. ของฉัน', Q.sum(r.mu, '2026-11-01', '2026-11-30').mine, 4500);
r = tryMut(mu => F.del(mu, 'T13'));
eq('E-2 D1 = 10,000', Q.debt(r.mu, D(r.mu, 'D1'), TODAY).balance, B(10000)); eqB('E-2 พ.ย. เงินออก', Q.sum(r.mu, '2026-11-01', '2026-11-30').cash.cashOut, 7300);
r = tryMut(mu => Object.assign(mu.txns.find(x => x.id === 'T6'), { principal: B(2550), interest: B(450), fee: 0 }));
eq('E-3 D2 ณ 30 พ.ย. ยัง 24,850', Q.debt(r.mu, D(r.mu, 'D2'), TODAY).balance, B(24850));
eq('E-3 D2 ณ 31 ต.ค. ยืนยัน 27,450', Q.debt(r.mu, D(r.mu, 'D2'), '2026-10-31').balance, B(27450));
eqB('E-3 ต.ค. ของฉัน', Q.sum(r.mu, '2026-10-01', '2026-10-31').mine, 6454);
eq('E-3 preview ก่อนบันทึก: ต.ค. +450 เท่านั้น (C2)', Q.delta(MU, r.mu), [{ month: '2026-10', before: B(6004), after: B(6454), delta: B(450) }]);
r = tryMut(mu => F.del(mu, 'T16'));
eq('E-4 D2 = 27,450', Q.debt(r.mu, D(r.mu, 'D2'), TODAY).balance, B(27450));
r = tryMut(mu => { mu.txns.find(x => x.id === 'T16').date = '2026-11-10'; });
eq('E-5 ย้าย T16 ไปวันใบแจ้ง → 27,450 (ไม่ตัดซ้ำ)', Q.debt(r.mu, D(r.mu, 'D2'), TODAY).balance, B(27450));
const fx = F.delFx(clone(MU), 'T4');
eq('E-6 ผลที่บอกในกล่องยืนยัน', fx.map(e => [e.type, e.txnId, e.amount]), [['unlink-back', 'T11', B(300)], ['delete-writeoff', 'W1', B(300)]]);
r = tryMut(mu => F.del(mu, 'T4'));
eq('E-6 validate หลังลบ', r.error, null);
eqB('E-6 ต.ค. จ่ายค่าใช้จ่าย', Q.sum(r.mu, '2026-10-01', '2026-10-31').cash.paid, 3804); eqB('E-6 ต.ค. ของฉัน', Q.sum(r.mu, '2026-10-01', '2026-10-31').mine, 5404);
eqB('E-6 พ.ย. ของฉัน', Q.sum(r.mu, '2026-11-01', '2026-11-30').mine, 4700); eqB('E-6 พ.ย. เงินคืนยัง', Q.sum(r.mu, '2026-11-01', '2026-11-30').cash.back, 2700);
eq('E-6 T11 เหลือผูก T9 เท่านั้น', r.mu.txns.find(t => t.id === 'T11').allocations.map(a => a.txnId), ['T9']);
r = tryMut(mu => { mu.txns = mu.txns.filter(t => t.id !== 'W1'); mu.txns.find(x => x.id === 'T4').myShare = B(1000); });
has('E-7 ส่วนของฉันเกินขอบ', r.error, 'ส่วนของฉันสูงสุดได้ ฿900');
r = tryMut((mu) => { F.upsert(mu, pay('T19', '2026-11-28', 'D1', 7800, 7800, 0, 0), TODAY); return F.close(mu, 'D1', '2026-11-28', TODAY); });
eq('E-8 validate', r.error, null);
eq('E-8 D1 ปิด ส่วนลด 200', [D(r.mu, 'D1').status, D(r.mu, 'D1').anchors.find(a => a.type === 'close').waived], ['closed', B(200)]);
eqB('E-8 พ.ย. เงินออก', Q.sum(r.mu, '2026-11-01', '2026-11-30').cash.cashOut, 17100); eqB('E-8 พ.ย. ของฉัน', Q.sum(r.mu, '2026-11-01', '2026-11-30').mine, 12800);
eq('E-8 หนี้รวม 35,850', Q.debts(r.mu, TODAY).total, B(35850));
r = tryMut(mu => F.upsert(mu, pay('T19', '2026-11-28', 'D1', 9000, 9000, 0, 0), TODAY));
has('E-9 จ่ายเกินยอดยืนยัน', r.error, 'เงินต้นมากกว่ายอดคงเหลือ ฿8,000');
r = tryMut(mu => { mu.txns = mu.txns.filter(t => t.id !== 'T16'); D(mu, 'D2').anchors = D(mu, 'D2').anchors.filter(a => a.id !== 'A1'); F.upsert(mu, pay('T19', '2026-11-09', 'D2', 99000, null), TODAY); });
eq('E-9 หนี้ยังไม่ยืนยัน → บันทึกได้', r.error, null);
r = tryMut(mu => F.delDebt(mu, 'D1'));
has('E-10 ลบหนี้ที่มีการจ่าย', r.error, 'ลบไม่ได้');
r = tryMut(mu => { mu.txns = mu.txns.filter(t => t.id !== 'T18'); F.delDebt(mu, 'D3', true); });
eq('E-10 ลบ D3 + ดาวน์', [r.error, r.mu.debts.some(d => d.id === 'D3'), r.mu.txns.some(t => t.id === 'T17')], [null, false, false]);
r = tryMut(mu => { mu.txns = mu.txns.filter(t => t.id !== 'T18'); F.delDebt(mu, 'D3', false); });
eq('E-10 ลบ D3 เก็บดาวน์ (ไม่ผูกแล้ว)', [r.error, r.mu.txns.find(t => t.id === 'T17').debtId], [null, undefined]);
r = tryMut(mu => { mu.categories.find(c => c.id === 'c_fun').archived = true; });
eqB('E-11 ซ่อนหมวด → ตัวเลขไม่เปลี่ยน', Q.sum(r.mu, '2026-10-01', '2026-10-31').byCategory.c_fun.net, 2000);
r = tryMut(mu => { mu.txns.find(x => x.id === 'T16').fee = B(50); });
has('E-12 แยกงวดไม่ครบ', r.error, 'รวมได้ ฿2,950 ไม่เท่ายอดจ่าย ฿3,000');
const at7 = () => { const mu = clone(MU); mu.txns = mu.txns.filter(t => t.date <= '2026-11-07'); return mu; };
const alloc = (amt, al) => { const mu = at7(); try { F.upsert(mu, { id: 'X', kind: 'moneyBack', backType: 'reimburse', date: '2026-11-07', amount: B(amt), allocations: al.map(([id, a]) => ({ txnId: id, amount: B(a) })) }, TODAY); } catch (e) { return e.message; } return Q.validate(mu); };
eq('E-13 700 → T9 400 + T4 300 ผ่าน', alloc(700, [['T9', 400], ['T4', 300]]), null);
has('E-13 T9 500 เกินค้างรับ', alloc(700, [['T9', 500]]), 'เกินส่วนของคนอื่น ฿400');
has('E-13 1,000 > 700 เกินยอดที่ได้รับ', alloc(700, [['T9', 400], ['T4', 600]]), 'จัดสรรเกินยอดที่ได้รับ');
eq('E-13 800 → 700 จัดสรร เหลือ 100 ไม่ผูก (ผ่าน · UI ต้องยืนยัน)', alloc(800, [['T9', 400], ['T4', 300]]), null);
const refundT4 = (mine, others, date = '2026-11-21') => tryMut(mu => F.upsert(mu, { id: 'X', kind: 'moneyBack', backType: 'refund', date, amount: B(mine + others), allocations: [{ txnId: 'T4', mine: B(mine), others: B(others) }] }, TODAY));
has('E-14 ร้านคืน 700 เป็นส่วนของฉันทั้งหมด (ส่วนของฉัน 600 + ยกให้ 300)', refundT4(1000, 0).error, 'ส่วนของฉันคืนได้สูงสุด ฿900');
eq('E-14 แบ่ง mine 600 / others 0 ผ่าน', refundT4(600, 0).error, null);
r = tryMut(mu => F.upsert(mu, { id: 'X', kind: 'moneyBack', backType: 'reimburse', date: '2026-10-09', amount: B(100), allocations: [{ txnId: 'T4', amount: B(100) }] }, TODAY));
has('E-15 คืนก่อนวันจ่าย', r.error, 'วันที่ต้องไม่ก่อนวันจ่าย');
eq('E-16 รายจ่ายช้อปปิ้ง 1,000 ขณะ D3 active → เตือน', Q.dup(MU, exp('X', '2026-11-25', 1000, 'c_shop', 'x_self')), { debtId: 'D3', name: 'ทีวี' });
eq('E-16 อาหาร 1,000 → ไม่เตือน', Q.dup(MU, exp('X', '2026-11-25', 1000, 'c_food', 'x_self')), null);
eq('E-16 D1 งวด 2,000 ครบวันที่ 5 · รายจ่าย 2,000 วันที่ 20 → ไม่เตือน (เกิน ±5 วัน)', Q.dup(MU, exp('X', '2026-11-20', 2000, 'c_shop', 'x_self')), null);
eq('E-16 รายจ่าย 2,000 วันที่ 3 → เตือน D1', Q.dup(MU, exp('X', '2026-11-03', 2000, 'c_shop', 'x_self')).debtId, 'D1');
const pv = F.changePrev(MU, 'D1', { type: 'loan' });
eq('E-17 preview: งวด 5 ต.ค.–5 พ.ย. · ต.ค. −2,000 · พ.ย. −2,000', [pv.error, pv.firstDate, pv.lastDate, pv.months.map(m => [m.month, m.delta])], [null, '2026-10-05', '2026-11-05', [['2026-10', B(-2000)], ['2026-11', B(-2000)]]]);
r = tryMut(mu => F.change(mu, 'D1', { type: 'loan' }, '2026-11-30T10:00:00Z'));
eq('E-17 หลังเปลี่ยน ต.ค./พ.ย. ของฉัน · เงินออก ต.ค.', [Q.sum(r.mu, '2026-10-01', '2026-10-31').mine, Q.sum(r.mu, '2026-11-01', '2026-11-30').mine, Q.sum(r.mu, '2026-10-01', '2026-10-31').cash.cashOut], [B(4004), B(3000), B(10004)]);
eq('E-17 history', D(r.mu, 'D1').history, [{ at: '2026-11-30T10:00:00Z', field: 'type', from: 'installment', to: 'loan' }]);
eq('E-17 เปลี่ยนเป็นผ่อนสินค้าโดยไม่มีหมวด → ไม่ผ่าน', !!F.changePrev(MU, 'D2', { type: 'installment' }).error, true);
r = tryMut(mu => { F.addDebt(mu, { id: 'D9', name: 'ผ่อนเครื่องซักผ้า', type: 'installment', interestFree: false, categoryId: 'c_travel', contextId: 'x_self', startDate: '2026-11-01', startBalance: B(10000) }, TODAY); F.upsert(mu, pay('P9', '2026-11-20', 'D9', 1100, 1000, 100, 0), TODAY); });
eq('E-19 validate', r.error, null);
eqB('E-19 ผ่อนสินค้ามีดอก: 1,100 ทั้งงวดในหมวดสินค้า', Q.filt(r.mu, '2026-11-20', '2026-11-20', 'c_travel', null).net, 1100);
eq('E-19 ไม่ไปหมวดดอกเบี้ย · หนี้ 9,000', [Q.filt(r.mu, '2026-11-20', '2026-11-20', 'c_interest', null).net, Q.debt(r.mu, D(r.mu, 'D9'), TODAY).balance], [0, B(9000)]);
r = tryMut(mu => F.upsert(mu, pay('P8', '2026-11-28', 'D1', 2050, 2000, 0, 50), TODAY));
eq('E-20 0% + ค่าธรรมเนียม 50: D1 ลด 2,000 · ของฉัน +2,050', [r.error, Q.debt(r.mu, D(r.mu, 'D1'), TODAY).balance, Q.filt(r.mu, '2026-11-28', '2026-11-28', 'c_shop', null).net], [null, B(6000), B(2050)]);
r = tryMut(mu => F.upsert(mu, pay('P8', '2026-11-28', 'D1', 2050, 2000, 50, 0), TODAY));
has('E-20 หนี้ 0% ใส่ดอกเบี้ย → ไม่ผ่าน', r.error, 'หนี้ 0% ไม่มีดอกเบี้ย');
r = tryMut(mu => { F.addDebt(mu, { id: 'D8', name: 'ผ่อน', type: 'installment', interestFree: true, categoryId: 'c_shop', contextId: 'x_self', startDate: '2026-11-01', startBalance: B(12000) }, TODAY); });
eq('E-18 ไม่มีดาวน์: หนี้ 12,000 · เงินออกวันซื้อ 0', [r.error, Q.debt(r.mu, D(r.mu, 'D8'), '2026-11-01').balance, Q.sum(r.mu, '2026-11-01', '2026-11-01').cash.cashOut - Q.sum(MU, '2026-11-01', '2026-11-01').cash.cashOut], [null, B(12000), 0]);
r = tryMut(mu => { const p = { debtId: 'D7', downTxnId: 'Z', name: 'x', date: '2026-11-01', price: B(1000), down: B(1000), categoryId: 'c_shop', contextId: 'x_self' }; F.buy(mu, p, TODAY); });
has('ซื้อผ่อนที่ดาวน์ = ราคา', r.error, 'ไม่มียอดผ่อนเหลือ');
r = tryMut(mu => F.close(mu, 'D2', '2026-11-09', TODAY));
has('ปิดหนี้ที่ยังไม่ยืนยัน', r.error, 'ยืนยันยอดก่อนปิดหนี้');

sec('6.5b ร้านคืนรายการที่จ่ายแทนคนอื่น (C5)');
const rf = (events) => {
  const mu = { ...clone(MU), txns: [], debts: [] };
  F.upsert(mu, exp('E', '2026-11-01', 1200, 'c_food', 'x_friend', 600), TODAY);
  for (const e of events) F.upsert(mu, e, TODAY);
  return mu;
};
const storeRefund = (date, mine, others) => ({ id: 'R' + date, kind: 'moneyBack', backType: 'refund', date, amount: B(mine + others), allocations: [{ txnId: 'E', mine: B(mine), others: B(others) }] });
let m = rf([storeRefund('2026-11-10', 600, 600)]);
s = Q.sum(m, '2026-11-01', '2026-11-30');
eq('RF-A validate', Q.validate(m), null);
eq('RF-A เงินคืน 1,200 · รายรับ 0 · ของฉัน 0', [s.cash.back, s.cash.income, s.mine], [B(1200), 0, 0]);
eq('RF-A ค้างรับ ณ 9 พ.ย. 600 → ณ 10 พ.ย. 0 · ต้องคืน 0', [Q.others(m, '2026-11-09').receivable, Q.others(m, '2026-11-10').receivable, Q.others(m, '2026-11-10').payable], [B(600), 0, 0]);
const reimb = { id: 'RB', kind: 'moneyBack', backType: 'reimburse', date: '2026-11-05', amount: B(600), allocations: [{ txnId: 'E', amount: B(600) }] };
const payout = amt => ({ id: 'PO', kind: 'payOut', date: '2026-11-15', amount: B(amt), sourceTxnId: 'E' });
m = rf([reimb, storeRefund('2026-11-10', 600, 600), payout(600)]);
s = Q.sum(m, '2026-11-01', '2026-11-30');
eq('RF-B validate', Q.validate(m), null);
eq('RF-B เงินเข้า 1,800 · เงินออก 1,800 · ผลต่าง 0 · ของฉัน 0', [s.cash.cashIn, s.cash.cashOut, s.cash.net, s.mine], [B(1800), B(1800), 0, 0]);
eqB('RF-B คืนเงินให้คนอื่นอยู่ในเงินออก', s.cash.payOut, 600);
eq('RF-B ต้องคืน ณ 10 พ.ย. 600 → ณ 15 พ.ย. 0', [Q.others(m, '2026-11-10').payable, Q.others(m, '2026-11-15').payable], [B(600), 0]);
eq('RF-B คืนเงินให้เพื่อนไม่อยู่ในค่าใช้จ่ายของฉัน', Q.sum(m, '2026-11-15', '2026-11-15').mine, 0);
has('RF-C คืนเงินให้เพื่อน 700 (ต้องคืน 600)', Q.validate(rf([reimb, storeRefund('2026-11-10', 600, 600), payout(700)])), 'ต้องคืนรายการนี้ ฿600');
has('RF-C คืนเงินให้เพื่อนก่อนเกิดยอดต้องคืน', Q.validate(rf([reimb, storeRefund('2026-11-16', 600, 600), payout(600)])), 'ต้องคืนรายการนี้');
has('RF-D ร้านคืน 1,200 เป็นส่วนของฉันทั้งหมด', Q.validate(rf([storeRefund('2026-11-10', 1200, 0)])), 'ส่วนของฉันคืนได้สูงสุด ฿600');
has('RF-D ส่วนของคนอื่น 700 (มี 600)', Q.validate(rf([storeRefund('2026-11-10', 500, 700)])), 'ส่วนของคนอื่นในรายการนี้มี ฿600');
m = rf([]); F.upsert(m, exp('S', '2026-11-02', 500, 'c_fun', 'x_self'), TODAY);
F.upsert(m, { id: 'RS', kind: 'moneyBack', backType: 'refund', date: '2026-11-03', amount: B(100), allocations: [{ txnId: 'S', mine: 0, others: B(100) }] }, TODAY);
has('RF-E รายการที่ไม่ได้จ่ายแทนใคร มีส่วนของคนอื่นไม่ได้', Q.validate(m), 'ไม่ได้จ่ายแทนใคร');
m = rf([reimb, storeRefund('2026-11-10', 600, 600), payout(600)]);
eq('RF-F ผลการลบที่บอกในกล่องยืนยัน', F.delFx(m, 'E').map(e => [e.type, e.txnId]), [['unlink-back', 'RB'], ['unlink-back', 'R2026-11-10'], ['unlink-payout', 'PO']]);
F.del(m, 'E');
s = Q.sum(m, '2026-11-01', '2026-11-30');
eq('RF-F หลังลบ: validate · ของฉัน 0 · เงินเข้า/ออกยังอยู่', [Q.validate(m), s.mine, s.cash.cashIn, s.cash.payOut], [null, 0, B(1800), B(600)]);

sec('6.6 วันที่');
eq('B-1 T8 อยู่ในเดือน ต.ค.', Q.filt(MU, '2026-10-01', '2026-10-31', 'c_travel', null).count, 1);
s = Q.sum(MU, '2026-10-12', '2026-10-18');
eq('B-2 สัปดาห์ 12–18 ต.ค. เงินออก 5,044 · ของฉัน 2,044 · ยังไม่แยก 3,000', [s.cash.cashOut, s.mine, s.unsplitLoan], [B(5044), B(2044), B(3000)]);
eq('B-4 พุธ 11 พ.ย. สัปดาห์นี้ = 9–15 พ.ย.', Q.period('week', '2026-11-11'), { start: '2026-11-09', end: '2026-11-15' });
eq('B-4 เดือนก่อน = 1–31 ต.ค.', Q.period('lastMonth', '2026-11-11'), { start: '2026-10-01', end: '2026-10-31' });
eq('B-4 อาทิตย์ 15 พ.ย. ยังอยู่สัปดาห์ 9–15', Q.period('week', '2026-11-15'), { start: '2026-11-09', end: '2026-11-15' });
eq('B-4 เดือนก่อนของ ม.ค. = ธ.ค. ปีก่อน', Q.period('lastMonth', '2027-01-05'), { start: '2026-12-01', end: '2026-12-31' });
r = tryMut(mu => F.upsert(mu, exp('X', '2026-12-01', 10, 'c_food', 'x_self'), TODAY));
has('B-5 วันที่ในอนาคต', r.error, 'ไม่อยู่ในอนาคต');
eq('B-5 กำหนดเองสิ้นสุดก่อนเริ่ม', Q.period('custom', TODAY, { start: '2026-11-10', end: '2026-11-01' }), null);

sec('จำนวนเงิน (parse / format)');
eq('parse 1200 · 1,200 · 1200.5 · 1200.50 · ฿1,200.50', ['1200', '1,200', '1200.5', '1200.50', '฿1,200.50'].map(Q.parse), [120000, 120000, 120050, 120050, 120050]);
eq('parse 0.1 + 0.2 ไม่มีทศนิยมลอย (1200.10 → 120010)', Q.parse('1200.10'), 120010);
eq('parse ผิดรูป: 1,20 · 12.345 · abc · -5 · 10000000 · ว่าง', ['1,20', '12.345', 'abc', '-5', '10000000', ''].map(Q.parse), [null, null, null, null, null, null]);
eq('format', [Q.fmt(120000), Q.fmt(120050), Q.fmt(-170000), Q.fmt(5, { hidden: true })], ['฿1,200', '฿1,200.50', '−฿1,700', '฿•••']);

sec('ร้านคืนหลังยกหนี้ให้เพื่อน (การตีความข้อ 2 — ยืนยัน 2026-10-21)');
// T4: จ่าย 1,200 · ส่วนฉัน 600 · เพื่อนคืน 300 (T11) · ยกให้ 300 (W1, 20 พ.ย.) → ภาระของฉัน 900 · ค้างรับ 0
const afterW1 = (mine, others, date) => tryMut(mu => F.upsert(mu, { id: 'RX', kind: 'moneyBack', backType: 'refund', date, amount: B(mine + others), allocations: [{ txnId: 'T4', mine: B(mine), others: B(others) }] }, TODAY));
r = afterW1(900, 0, '2026-11-21');
eq('RF-G ร้านคืนส่วนของฉัน 900 (600 + ที่ยกให้ 300) → ผ่าน', r.error, null);
eqB('RF-G ค่าใช้จ่ายของฉันจาก T4 ทั้งหมด (600 + ยกให้ 300 − ร้านคืน 900)', A('moneyMyCostLines')(r.mu, '2026-10-01', '2026-11-30').lines.filter(l => ['T4', 'W1', 'RX'].includes(l.txnId)).reduce((a, l) => a + l.amount, 0), 0);
eq('RF-G ไม่สร้างค้างรับ/ต้องคืน (pos T4 = 0)', [Q.others(r.mu, TODAY).receivable, Q.others(r.mu, TODAY).payable], [0, 0]);
has('RF-G ร้านคืนส่วนของฉัน 901 → เกินภาระที่เหลือ', afterW1(901, 0, '2026-11-21').error, 'ส่วนของฉันคืนได้สูงสุด ฿900');
has('RF-G คืน 900 ก่อนวันยกให้ (19 พ.ย.) → ณ วันนั้นเหลือแค่ 600', afterW1(900, 0, '2026-11-19').error, 'ส่วนของฉันคืนได้สูงสุด ฿600 ณ วันที่คืน');
r = afterW1(900, 300, '2026-11-21');
eq('RF-H ร้านคืนทั้งบิล 1,200 = ของฉัน 900 + ของคนอื่น 300 → ผ่าน', r.error, null);
eq('RF-H ส่วนของคนอื่น 300 = เงินที่เพื่อนจ่ายมาแล้ว → ต้องคืนเพื่อน 300 (ไม่ใช่ค้างรับซ้ำ)', [Q.others(r.mu, TODAY).receivable, Q.others(r.mu, TODAY).payable], [0, B(300)]);
has('RF-H ส่วนของคนอื่นเกิน (ยกให้ไปแล้ว 300 ของ 600)', afterW1(900, 301, '2026-11-21').error, 'ส่วนของคนอื่นในรายการนี้มี ฿300');
r = tryMut(mu => { F.addDebt(mu, { id: 'D9', name: 'ผ่อน', type: 'installment', interestFree: false, categoryId: 'c_travel', contextId: 'x_self', startDate: '2026-11-01', startBalance: B(10000) }, TODAY); F.upsert(mu, pay('P9', '2026-11-20', 'D9', 1100, 1000, 100, 0), TODAY); });
s = Q.sum(r.mu, '2026-11-20', '2026-11-20');
eq('การตีความข้อ 1: เก็บเงินต้น/ดอกเบี้ยแยกในข้อมูล ดูได้โดยไม่บวกซ้ำ', [s.byCategory.c_travel.net, s.debt.principal, s.debt.interest, s.byCategory.c_interest ? 'นับซ้ำในหมวดดอกเบี้ย' : 'ไม่ซ้ำ'], [B(1100), B(1000), B(100), 'ไม่ซ้ำ']);

sec('บันทึก: ล้มเหลว / กดซ้ำ / หลายแท็บ (S-*) — backend จำลองที่ทำ transaction ทีละอันเหมือน IndexedDB');
const stS = makeStores(); const T1 = makeTab(stS);
const addAt = (tab, id) => tab('moneyCommit')(d => tab('moneyUpsertTxn')(tab('moneyUser')(d, 'u'), { id, kind: 'expense', date: '2026-11-01', amount: 6000, myShare: 6000, categoryId: 'c_food', contextId: 'x_self' }, TODAY));
const idsIn = st => (JSON.parse(st.money.raw()) || { byUser: { u: { txns: [] } } }).byUser.u.txns.map(t => t.id);
eq('S-2 กดบันทึกสองครั้งด้วย id เดียวกัน → 1 รายการ', [(await addAt(T1, 'a')).ok, (await addAt(T1, 'a')).ok, idsIn(stS)], [true, true, ['a']]);
const before = stS.money.raw(); stS.money.fail(true);
r = await addAt(T1, 'b'); stS.money.fail(false);
eq('S-1 เขียนล้มเหลว → write-failed · ที่เก็บเดิมทุกไบต์ · สถานะในแท็บไม่มี b', [r.ok, r.reason, stS.money.raw() === before, T1('_money').byUser.u.txns.some(t => t.id === 'b')], [false, 'write-failed', true, false]);
has('S-1 ข้อความ', r.error, 'บันทึกไม่สำเร็จ');
eq('S-1 กดอีกครั้ง → สำเร็จ', (await addAt(T1, 'b')).ok, true);
const T2 = makeTab(stS); await T2('moneyLoad')();
eq('S-3 แท็บ 1 เพิ่ม c', (await addAt(T1, 'c')).ok, true);
r = await addAt(T2, 'd');
eq('S-3 แท็บ 2 (ข้อมูลเก่า) เพิ่ม d → stale ไม่เขียนทับ', [r.ok, r.reason, idsIn(stS)], [false, 'stale', ['a', 'b', 'c']]);
eq('S-3 แท็บ 2 ได้ข้อมูลล่าสุดแล้ว', T2('_money').byUser.u.txns.map(t => t.id), ['a', 'b', 'c']);
eq('S-3 กด d อีกครั้ง → a b c d', [(await addAt(T2, 'd')).ok, idsIn(stS)], [true, ['a', 'b', 'c', 'd']]);
// สองแท็บอ่านสถานะเดียวกัน แล้วบันทึกพร้อมกัน (ไม่รอกัน) — ต้องไม่ "สำเร็จทั้งคู่แต่เหลือรายการเดียว"
await T1('moneyLoad')();
const [x1, x2] = await Promise.all([addAt(T1, 'e'), addAt(T2, 'f')]);
const okCount = [x1, x2].filter(x => x.ok).length;
eq('S-6 บันทึกพร้อมกัน: สำเร็จ 1 · อีกอัน stale ชัดเจน · ที่เก็บมีเท่าที่รายงานว่าสำเร็จ', [okCount, ([x1, x2].find(x => !x.ok) || {}).reason, idsIn(stS).length], [1, 'stale', 5]);
const delAt = (tab, id) => tab('moneyCommit')(d => { tab('moneyDeleteTxn')(tab('moneyUser')(d, 'u'), id); });
const editAt = (tab, id, amt) => tab('moneyCommit')(d => { const t = tab('moneyUser')(d, 'u').txns.find(x => x.id === id); t.amount = t.myShare = amt; });
await T1('moneyLoad')(); await T2('moneyLoad')();
const [y1, y2] = await Promise.all([delAt(T1, 'a'), editAt(T2, 'a', 9900)]);
eq('S-7 ลบ/แก้ชนกัน: สำเร็จ 1 อีกอัน stale · ไม่มีการเขียนทับเงียบ', [[y1, y2].filter(y => y.ok).length, ([y1, y2].find(y => !y.ok) || {}).reason], [1, 'stale']);
const revBefore = stS.money.raw();
stS.ls.setItem('pracal_restore_epoch', 'restored-by-other-tab');
r = await addAt(T2, 'g');
eq('S-5 หลังแท็บอื่นกู้คืน → restored-elsewhere · ไม่เขียน', [r.ok, r.reason, stS.money.raw() === revBefore], [false, 'restored-elsewhere', true]);
const T3 = makeTab(stS);
r = await T3('moneyCommit')(d => { T3('moneyUpsertTxn')(T3('moneyUser')(d, 'u'), { id: 'h', kind: 'expense', date: '2026-11-01', amount: 100, myShare: 200, categoryId: 'c_food', contextId: 'x_self' }, TODAY); });
eq('ผิดกติกา → invalid · ไม่เขียน', [r.ok, r.reason, stS.money.raw() === revBefore], [false, 'invalid', true]);
stS.money.set('{broken');
const T4 = makeTab(stS);
r = await addAt(T4, 'i');
eq('ข้อมูลเงินเสีย → ไม่เขียนทับ (corrupt)', [r.ok, r.reason, stS.money.raw()], [false, 'corrupt', '{broken']);

sec('ลบโปรไฟล์ — ระดับ engine (C)');
const stP = makeStores(); const TP = makeTab(stP);
const addFor = (uid, id) => TP('moneyCommit')(d => TP('moneyUpsertTxn')(TP('moneyUser')(d, uid), { id, kind: 'expense', date: '2026-11-01', amount: 100, myShare: 100, categoryId: 'c_food', contextId: 'x_self' }, TODAY));
await addFor('u1', 'p1'); await addFor('u2', 'p2'); await addFor('u2', 'p3');
const u2Before = JSON.stringify(JSON.parse(stP.money.raw()).byUser.u2);
r = await TP('moneyDeleteUserData')('u1');
const afterDel = JSON.parse(stP.money.raw());
eq('ลบเฉพาะ u1 · คืนข้อมูลที่ลบให้ผู้เรียก', [r.ok, 'u1' in afterDel.byUser, r.result.txns.map(t => t.id)], [true, false, ['p1']]);
eq('โปรไฟล์อื่น (u2) ไม่เปลี่ยนทุกไบต์', JSON.stringify(afterDel.byUser.u2) === u2Before, true);
await addFor('u_new', 'n1');
eq('โปรไฟล์ใหม่ไม่เห็นข้อมูลของคนเดิม', JSON.parse(stP.money.raw()).byUser.u_new.txns.map(t => t.id), ['n1']);
stP.money.fail(true);
r = await TP('moneyDeleteUserData')('u2');
stP.money.fail(false);
eq('ลบไม่สำเร็จ → ok:false (ผู้เรียกต้องไม่ลบโปรไฟล์) · ข้อมูล u2 ยังอยู่', [r.ok, JSON.stringify(JSON.parse(stP.money.raw()).byUser.u2) === u2Before], [false, true]);
r = await TP('moneyDeleteUserData')('u2');
const put = await TP('moneyPutUserData')('u2', r.result);
eq('คืนข้อมูลที่ลบได้ (กรณีลบสุขภาพไม่สำเร็จ)', [put.ok, JSON.stringify(JSON.parse(stP.money.raw()).byUser.u2) === u2Before], [true, true]);
ok('flow ลบโปรไฟล์ใน index.html เรียก moneyDeleteUserData ก่อน persist() และไม่ขึ้น "ลบแล้ว" เมื่อไม่สำเร็จ',
  /'delete-user': async[\s\S]*?moneyDeleteUserData\(u\.id\)[\s\S]*?if \(!mr\.ok\) return toast[\s\S]*?if \(!persist\(\)\)[\s\S]*?moneyPutUserData[\s\S]*?toast\('ลบแล้ว'\)/.test(SRC));

sec('สำรอง/กู้คืนกับข้อมูลเงิน (ตรวจไฟล์)');
const health = { users: [{ id: 'uA', name: 'A' }], currentUserId: 'uA', customMeals: [], favorites: [], logs: {}, dailyTargets: {} };
const money = A('_money');
const file = JSON.stringify({ format: 'pracal-backup', formatVersion: 2, appVersion: 'v1.10.55', exportedAt: '2026-11-30T00:00:00Z', health, money });
let pb = Q.parseBackup(file, file.length);
eq('ไฟล์ v2 ที่มีข้อมูลเงินชุด §6.1 → รับ · เงินเท่าเดิมทุกค่า', [pb.ok, JSON.stringify(pb.money) === JSON.stringify(money), pb.summary.moneyTxns, pb.summary.debts], [true, true, MU.txns.length, 3]);
const badMoney = clone(money); badMoney.byUser.uA.txns.find(t => t.id === 'T11').allocations[0].amount = B(900);
const badFile = JSON.stringify({ format: 'pracal-backup', formatVersion: 2, health, money: badMoney });
pb = Q.parseBackup(badFile, badFile.length);
eq('ไฟล์ที่ข้อมูลเงินผิดกติกา → ปฏิเสธก่อนเขียน', [pb.ok, /เกิน/.test(pb.error)], [false, true]);
const orphanMoney = clone(money); orphanMoney.byUser.uGone = clone(money.byUser.uA);
const orphanFile = JSON.stringify({ format: 'pracal-backup', formatVersion: 2, health, money: orphanMoney });
pb = Q.parseBackup(orphanFile, orphanFile.length);
eq('ข้อมูลเงินของโปรไฟล์ที่ไม่มีในไฟล์ → ไม่นำเข้า + นับให้หน้าตัวอย่างเตือน', [pb.ok, Object.keys(pb.money.byUser), pb.droppedMoneyProfiles], [true, ['uA'], 1]);

console.log('\n' + (fails ? `${fails} FAILURE(S) of ${n} ❌` : `ALL ${n} T-026b CHECKS PASS ✅`) + `  (TZ=${process.env.TZ || 'system'})`);
process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
