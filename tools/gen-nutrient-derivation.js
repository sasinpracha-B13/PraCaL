#!/usr/bin/env node
/*
 * tools/gen-nutrient-derivation.js — derive satFat_g + fiber_g for meals.json / branded_products.json
 *
 * T-024b (saturated fat) + T-024c (fiber), governed by DEC-004.
 *
 * WHY A GENERATOR AND NOT 800 HAND-TYPED NUMBERS
 *   408 meals × 2 nutrients landing in a diff as bare numbers would be unreviewable —
 *   nobody could tell a researched value from a guess. Every value this script writes is
 *   a deterministic function of fields that already exist (`fat_g`, `carbs_g`, `category`)
 *   and the rule tables below. Re-run it and you get the same numbers; change a rule and
 *   you can see exactly which entries move. The rule tables ARE the documentation.
 *
 * THE TWO NUTRIENTS ARE DERIVED DIFFERENTLY, ON PURPOSE
 *   satFat_g = fat_g × ratio      — saturated fat is a fraction of a number we already have.
 *   fiber_g  = carbs_g × ratio    — fiber is a fraction of carbohydrate. A RATIO, not an
 *                                   absolute, because absolutes do not scale: one pizza slice
 *                                   and a whole large pizza are separate entries here.
 *                                   It also makes `fiber_g <= carbs_g` true by construction.
 *
 * DEC-004 LEAN DIRECTION (rule 3) — this is the part that must not be "improved" casually:
 *   · satFat ratios lean HIGH  — it is the variable under investigation; a low estimate
 *                                produces a falsely reassuring day.
 *   · fiber ratios lean LOW    — telling someone they hit 25-30 g when they did not is the
 *                                specific harm DEC-004 exists to prevent. Under-stating is safe.
 *   If you are unsure of a ratio, move satFat up and fiber down, never the reverse.
 *
 * RULE PRECEDENCE
 *   Name-keyword rules are tested in order, first match wins; category default if none match.
 *   Order matters and is deliberate: ปลากะพง**ทอด** is frying oil (0.42), ปลากะพง**นึ่ง** is
 *   the fish's own fat (0.25), so the frying rule sits above the seafood rule.
 *
 * HAND-SET ENTRIES
 *   `fruits` (7) and `healthy` (10) carry per-item values instead — for whole foods a
 *   composition figure is simply better than any ratio, and there are only 17 of them.
 *   They are tagged `estimated` (human judgement) rather than `derived` (rule output).
 *
 * Usage:
 *   node tools/gen-nutrient-derivation.js            # dry run — report only, writes nothing
 *   node tools/gen-nutrient-derivation.js --report   # dry run + per-entry table
 *   node tools/gen-nutrient-derivation.js --apply    # write meals.json + branded_products.json
 *   node tools/gen-nutrient-derivation.js --json     # machine-readable dry run
 *
 * Exit codes:
 *   0 — derivation produced no violation of the T-024a sanity rules
 *   1 — some entries could not be derived and were left ABSENT (per DEC-004, not guessed)
 *   2 — a derived value violated a sanity rule (satFat > fat, fiber > carbs) or script error
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MEALS_PATH = path.resolve(__dirname, '..', 'meals.json');
const BRANDED_PATH = path.resolve(__dirname, '..', 'branded_products.json');

/* ─────────────────── SATURATED FAT — ratio of fat_g, leaning HIGH ─────────────────── */

const SATFAT_RULES = [
  // Coconut milk & creamy-reduced: coconut fat is ~85-90% saturated, the highest in Thai cooking.
  { r: 0.70, why: 'กะทิ / น้ำข้น — coconut fat ~87% sat',
    kw: ['กะทิ', 'เขียวหวาน', 'แกงแดง', 'แกงเผ็ด', 'มัสมั่น', 'พะแนง', 'ฉู่ฉี่', 'แกงคั่ว', 'ต้มข่า', 'บวชชี', 'ขนมครก', 'น้ำข้น'] },
  // Pizza FIRST — "พิซซ่าถาดใหญ่ ขอบชีส" contains ชีส and would otherwise take the
  // dairy ratio below, over-stating a dish whose fat is diluted by dough and toppings.
  { r: 0.48, why: 'พิซซ่า — cheese diluted by dough/toppings', kw: ['พิซซ่า', 'pizza'] },
  // Dairy fat & butter-based bakery: milkfat is ~63% saturated.
  { r: 0.60, why: 'นม/เนย/ครีม/ชีส — milkfat ~63% sat',
    kw: ['ชีส', 'cheese', 'ครีม', 'เนย', 'คาโบนาร่า', 'ลาซานญ่า', 'บราวนี่', 'เค้ก', 'ไอศกรีม', 'ไอศครีม', 'ไอติม', 'ช็อกโกแลต', 'โกโก้', 'โดนัท', 'มิลค์เชค', 'คุกกี้', 'วาฟเฟิล', 'ซันเดย์', 'Caesar', 'McFlurry', 'ท็อปปิ้ง'] },
  // Fatty pork cuts & cured meats — the most saturated animal fats in the DB.
  { r: 0.42, why: 'หมูติดมัน/เนื้อแปรรูป — fatty & cured pork',
    kw: ['หมูกรอบ', 'สามชั้น', 'ขาหมู', 'ไส้กรอก', 'เบคอน', 'คอหมู', 'ซี่โครง', 'แหนม', 'ไส้ทอด', 'แฮม', 'หมูยอ', 'มีทบอล'] },
  // Deep frying: Thai street/commercial frying is largely palm oil (~49% sat).
  { r: 0.42, why: 'ของทอด — palm frying oil ~49% sat',
    kw: ['ทอด', 'ฟรายส์', 'ฟรายด์', 'นักเก็ต', 'กรอบ', 'ชุบแป้ง', 'ป๊อป', 'คาราเกะ', 'วิงซ์', 'สตริป', 'ชีสบอล', 'หอมทอด', 'Chips', 'มันฝรั่ง'] },
  // Beef & duck fat: more saturated than pork lean or poultry.
  { r: 0.40, why: 'เนื้อวัว/เป็ด — beef & duck fat', kw: ['เนื้อ', 'เป็ด', 'Rib Eye', 'Strip Loin', 'บอสตัน'] },
  // Fish & shellfish: the least saturated animal fats.
  { r: 0.25, why: 'ปลา/ทะเล — marine fat, lowest sat fraction',
    kw: ['ปลา', 'กุ้ง', 'ปู', 'หอย', 'ทะเล', 'แซลมอน', 'ทูน่า', 'Fish', 'ดอรี่', 'กะพง', 'ทับทิม', 'เก๋า', 'อินทรี'] },
  // No added frying fat — what is left is the ingredient's own fat.
  { r: 0.30, why: 'ต้ม/นึ่ง/ย่าง/ยำ — no added frying fat',
    kw: ['นึ่ง', 'ลวก', 'ต้ม', 'ย่าง', 'เผา', 'แช่', 'น้ำใส', 'ยำ', 'ส้มตำ', 'พล่า', 'ปิ้ง', 'อบ', 'สด', 'แจ่ว', 'สะเต๊ะ'] }
];

const SATFAT_CATEGORY = {
  fastfood: 0.45, snacks: 0.50, bakery: 0.50,
  mains: 0.38, rice_dishes: 0.38,
  noodles: 0.35, appetizers: 0.35, soups: 0.35,
  salads: 0.30, healthy: 0.25, fruits: 0.20,
  drinks: 0.60,            // Thai sweet drinks run on non-dairy creamer + condensed milk
  protein_drinks: 0.40, milk_drinks: 0.60, coffee_drinks: 0.60,
  packaged_drinks: 0.40, yogurt: 0.60, convenience: 0.40
};

/* ─────────────────── FIBER — ratio of carbs_g, leaning LOW ─────────────────── */

const FIBER_RULES = [
  // Nothing plant-solid in the glass. A measured zero, not an absence.
  { r: 0.00, why: 'ไม่มีกากใย — no plant solids',
    kw: ['น้ำเปล่า', 'น้ำอัดลม', 'โค้ก', 'สไปรต์', 'เบียร์', 'Whey', 'นมสด', 'ไข่ขาว', 'อกไก่', 'ทูน่ากระป๋อง', 'Yogurt', 'โยเกิร์ต', 'มิลค์เชค', 'ชาเย็น', 'ชาไทย', 'ชาดำ', 'ชามะนาว', 'โอเลี้ยง', 'อเมริกาโน่', 'กาแฟ', 'ลาเต้', 'คาปูชิโน', 'เนสกาแฟ', 'นมชมพู'] },
  // Whole grains, legumes, nuts, seeds — the densest fiber sources in the DB.
  { r: 0.10, why: 'ธัญพืชเต็มเมล็ด/ถั่ว — whole grain & legume',
    kw: ['ข้าวกล้อง', 'ข้าวโอ๊ต', 'โอ๊ต', 'โฮลวีท', 'ธัญพืช', 'ถั่ว', 'เม็ดมะม่วง', 'งา', 'อัลมอนด์', 'เต้าหู้'] },
  // ── The starch base decides the fiber, so these outrank the vegetable/curry rules ──
  // A creamy mushroom PASTA is pasta, not a mushroom dish; ขนมจีน + green curry is
  // noodles, not a vegetable curry. Ranking vegetables first over-stated both, and
  // over-stating fiber is the single direction DEC-004 forbids.
  { r: 0.05, why: 'แป้งขัดขาว — refined flour/bread/pasta base',
    kw: ['พิซซ่า', 'ขนมปัง', 'เบอร์เกอร์', 'สปาเก็ตตี้', 'ลาซานญ่า', 'แซนด์วิช', 'แป้ง'] },
  { r: 0.035, why: 'เส้นก๋วยเตี๋ยว — rice noodle base + garnish',
    kw: ['ก๋วยเตี๋ยว', 'บะหมี่', 'ขนมจีน', 'ก๋วยจั๊บ', 'หมี่', 'วุ้นเส้น', 'ผัดไทย', 'ราดหน้า', 'ผัดซีอิ๊ว', 'สุกี้', 'มาม่า', 'เย็นตาโฟ'] },
  { r: 0.012, why: 'ข้าวสวยล้วน — plain white rice base', kw: ['ข้าวสวย', 'ข้าวเหนียว', 'ข้าวต้ม', 'โจ๊ก'] },
  // ── then the dish's vegetable content ──
  // Vegetable-forward dishes: the carbohydrate here IS largely vegetable.
  { r: 0.12, why: 'จานผักนำ — carbohydrate is mostly vegetable',
    kw: ['ผักบุ้ง', 'คะน้า', 'กะหล่ำ', 'บล็อกโคลี่', 'บร็อคโคลี่', 'มะระ', 'ผักรวม', 'ผัดผัก', 'สลัดผัก', 'แกงส้ม', 'แกงเลียง', 'จับฉ่าย', 'ชะอม', 'สาหร่าย', 'เห็ด', 'ข้าวโพด', 'ผักสด'] },
  { r: 0.10, why: 'ส้มตำ — green papaya', kw: ['ส้มตำ'] },
  { r: 0.08, why: 'สลัด/แกงกะทิใส่ผัก — vegetables present but not dominant',
    kw: ['สลัด', 'เขียวหวาน', 'มัสมั่น', 'พะแนง', 'แกงแดง', 'แกงเผ็ด', 'แกงป่า', 'แกงเหลือง', 'แกงคั่ว', 'พายแอปเปิล'] },
  { r: 0.07, why: 'ซุป/ต้ม — herbs and aromatics',
    kw: ['เกาเหลา', 'แกงจืด', 'ต้มยำ', 'ต้มแซ่บ', 'ต้มโคล้ง', 'ซุป', 'เล้ง', 'ต้มเลือด'] },
  // Fries/potato sit BELOW salads and get their own lower ratio: in a combo meal most of
  // the carbohydrate is soda and batter, not potato. At 0.08 a fried-chicken set scored 8 g.
  { r: 0.05, why: 'มันฝรั่ง/เฟรนช์ฟรายส์ — potato, diluted in combo sets', kw: ['มันฝรั่ง', 'ฟรายส์'] },
  { r: 0.02, why: 'ของหวาน/น้ำหวาน — refined sugar carries no fiber',
    kw: ['เค้ก', 'บราวนี่', 'โดนัท', 'ไอศกรีม', 'ไอศครีม', 'คุกกี้', 'ซันเดย์', 'วาฟเฟิล', 'น้ำส้ม', 'น้ำมะพร้าว', 'แตงโมปั่น', 'ขนมครก', 'บวชชี', 'หวาน'] }
];

const FIBER_CATEGORY = {
  rice_dishes: 0.025, noodles: 0.035, fastfood: 0.045,
  mains: 0.05, appetizers: 0.05, soups: 0.07, salads: 0.08,
  snacks: 0.03, bakery: 0.03, drinks: 0.01,
  protein_drinks: 0.0, milk_drinks: 0.0, coffee_drinks: 0.0,
  packaged_drinks: 0.01, yogurt: 0.0, convenience: 0.03
};

/* ─────────── HAND-SET: whole foods, where a composition figure beats any ratio ─────────── */

const HAND_SET = {
  // fruits — fiber from standard composition figures, satFat negligible
  'กล้วยหอม (1 ลูก)':   { fiber_g: 3.1, satFat_g: 0.1 },
  'แอปเปิ้ล (1 ลูก)':   { fiber_g: 3.3, satFat_g: 0.1 },
  'ส้ม (1 ลูก)':        { fiber_g: 2.4, satFat_g: 0.0 },
  'มะม่วงสุก (1 ลูก)':  { fiber_g: 2.6, satFat_g: 0.2 },
  'แตงโม (1 ถ้วย)':     { fiber_g: 0.6, satFat_g: 0.0 },
  'สับปะรด (1 ถ้วย)':   { fiber_g: 2.3, satFat_g: 0.0 },
  'ฝรั่ง (1 ลูก)':      { fiber_g: 5.4, satFat_g: 0.2 },
  // healthy — single-ingredient foods
  'อกไก่ย่าง 100g':        { fiber_g: 0.0, satFat_g: 1.1 },
  'ไข่ขาว 3 ฟอง':          { fiber_g: 0.0, satFat_g: 0.0 },
  'ข้าวโอ๊ต 1 ถ้วย':       { fiber_g: 8.0, satFat_g: 0.9 },
  'Greek Yogurt 1 ถ้วย':   { fiber_g: 0.0, satFat_g: 1.9 },
  'ทูน่ากระป๋อง':          { fiber_g: 0.0, satFat_g: 1.4 },
  'บร็อคโคลี่ลวก 100g':    { fiber_g: 2.6, satFat_g: 0.0 },
  'ข้าวกล้อง 1 ทัพพี':     { fiber_g: 1.8, satFat_g: 0.4 },
  'ปลาแซลมอนย่าง 100g':    { fiber_g: 0.0, satFat_g: 3.1 },
  'Whey Protein 1 scoop':  { fiber_g: 0.0, satFat_g: 0.6 },
  'ถั่วลันเตาต้ม 1 ถ้วย':  { fiber_g: 8.3, satFat_g: 0.2 }
};

/* ─────────────────────────────── engine ─────────────────────────────── */

const round1 = n => Math.round(n * 10) / 10;
const hay = m => `${m.name || ''} ${m.nameThai || ''}`;

function matchRule(rules, m) {
  const h = hay(m);
  for (const rule of rules) {
    const hit = rule.kw.find(k => h.includes(k));
    if (hit) return { ratio: rule.r, why: rule.why, via: 'keyword:' + hit };
  }
  return null;
}

function derive(m) {
  const name = (m.name || '').trim();
  if (HAND_SET[name]) {
    return { ...HAND_SET[name], source: 'estimated', satWhy: 'hand-set (whole food)', fibWhy: 'hand-set (whole food)' };
  }
  const fat = Number(m.fat_g);
  const carbs = Number(m.carbs_g);
  const cat = m.category || '';
  const out = { source: 'derived' };

  // saturated fat
  if (Number.isFinite(fat)) {
    const hit = matchRule(SATFAT_RULES, m);
    const ratio = hit ? hit.ratio : SATFAT_CATEGORY[cat];
    if (ratio != null) {
      out.satFat_g = Math.min(round1(fat * ratio), fat);   // can never exceed total fat
      out.satWhy = hit ? hit.why : 'category:' + cat;
      out.satVia = hit ? hit.via : 'category';
    }
  }
  // fiber
  if (Number.isFinite(carbs)) {
    const hit = matchRule(FIBER_RULES, m);
    const ratio = hit ? hit.ratio : FIBER_CATEGORY[cat];
    if (ratio != null) {
      out.fiber_g = Math.min(round1(carbs * ratio), carbs);
      out.fibWhy = hit ? hit.why : 'category:' + cat;
      out.fibVia = hit ? hit.via : 'category';
    }
  }
  return out;
}

/*
 * Both data files are HAND-FORMATTED — one entry per line, with nested `customizations`
 * arrays indented beneath the meals that have them. `JSON.stringify(doc, null, 2)` would
 * reformat all 823 lines and bury 496 real value changes in thousands of cosmetic ones,
 * which is precisely the kind of unreviewable diff this project's rules exist to prevent.
 *
 * So the writer edits the TEXT: for each entry it finds that entry's own line (every scalar
 * field lives on the line that opens the object) and inserts or updates the three fields
 * immediately after the last macro on that line. Fields that are already present are
 * updated in place rather than duplicated — that is what makes re-running safe, and it is
 * how d22's existing alcohol_g/fiber_g survive untouched.
 *
 * Correctness is not taken on trust: the caller re-parses the result and asserts that the
 * ONLY differences from the original object graph are the three intended fields.
 */
function writeSurgically(filePath, raw, plan) {
  const before = JSON.parse(raw);
  const lines = raw.split('\n');
  let touched = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const idMatch = /^\s*\{ *"id": "([^"]+)"/.exec(line);
    if (!idMatch) continue;                 // not an entry-opening line (e.g. a customization)
    const d = plan.get(idMatch[1]);
    if (!d) continue;                       // customization ids are never in the plan

    let out = line;
    const setField = (key, value) => {
      if (value == null) return;
      const json = typeof value === 'string' ? JSON.stringify(value) : String(value);
      const existing = new RegExp('("' + key + '": )(?:"[^"]*"|-?[0-9.]+)');
      if (existing.test(out)) { out = out.replace(existing, '$1' + json); return; }
      // Insert after the last macro present on this line, keeping nutrition grouped.
      const anchor = /("(?:sugar_g|fat_g|carbs_g)": -?[0-9.]+)/g;
      let last = null, mm;
      while ((mm = anchor.exec(out)) !== null) last = mm;
      if (!last) throw new Error('no macro anchor on line for id ' + idMatch[1]);
      const at = last.index + last[0].length;
      out = out.slice(0, at) + ', "' + key + '": ' + json + out.slice(at);
    };
    // Inserted in REVERSE: each insert lands immediately after the anchor, so the last
    // one written ends up leftmost. This order puts them on disk as satFat_g, fiber_g,
    // nutrientSource — reading left to right the way the schema documents them.
    setField('nutrientSource', d.source);
    setField('fiber_g', d.fiber_g);
    setField('satFat_g', d.satFat_g);
    if (out !== line) { lines[i] = out; touched++; }
  }

  const next = lines.join('\n');
  // Verify: parse the result and diff it against the original, key by key.
  const after = JSON.parse(next);
  const listOf = doc => Array.isArray(doc) ? doc : (doc.meals || doc.products || doc.items || []);
  const A = listOf(before), B = listOf(after);
  if (A.length !== B.length) throw new Error('entry count changed: ' + A.length + ' -> ' + B.length);
  const ALLOWED = new Set(['satFat_g', 'fiber_g', 'nutrientSource']);
  for (let i = 0; i < A.length; i++) {
    for (const k of new Set([...Object.keys(A[i]), ...Object.keys(B[i])])) {
      if (ALLOWED.has(k)) continue;
      if (JSON.stringify(A[i][k]) !== JSON.stringify(B[i][k])) {
        throw new Error('unintended change on ' + A[i].id + '.' + k + ': ' +
                        JSON.stringify(A[i][k]) + ' -> ' + JSON.stringify(B[i][k]));
      }
    }
  }
  fs.writeFileSync(filePath, next);
  console.log('  ' + path.basename(filePath) + ': ' + touched + ' entry lines rewritten, ' +
              'all other fields verified byte-identical after re-parse');
}

function run() {
  const apply = process.argv.includes('--apply');
  const asJson = process.argv.includes('--json');
  const perEntry = process.argv.includes('--report');

  const mealsRaw = fs.readFileSync(MEALS_PATH, 'utf8');
  const mealsDoc = JSON.parse(mealsRaw);
  const brandedRaw = fs.readFileSync(BRANDED_PATH, 'utf8');
  const brandedDoc = JSON.parse(brandedRaw);
  const branded = Array.isArray(brandedDoc) ? brandedDoc : (brandedDoc.products || brandedDoc.items || []);

  const stats = { total: 0, satSet: 0, fibSet: 0, handSet: 0, viaKeyword: 0, viaCategory: 0, absent: [], violations: [] };
  const rows = [];

  const process1 = (m, isBranded) => {
    stats.total++;
    // branded uses `calories`, meals use `baseCalories`; both share the macro key names
    const d = derive(m);
    if (d.source === 'estimated') stats.handSet++;
    if (d.satFat_g != null) {
      stats.satSet++;
      if (d.satFat_g > (Number(m.fat_g) || 0) + 1e-9) stats.violations.push(`${m.id} satFat ${d.satFat_g} > fat ${m.fat_g}`);
    }
    if (d.fiber_g != null) {
      stats.fibSet++;
      if (d.fiber_g > (Number(m.carbs_g) || 0) + 1e-9) stats.violations.push(`${m.id} fiber ${d.fiber_g} > carbs ${m.carbs_g}`);
    }
    if (d.satVia === 'category' || d.fibVia === 'category') stats.viaCategory++; else if (d.source === 'derived') stats.viaKeyword++;
    if (d.satFat_g == null && d.fiber_g == null) stats.absent.push(m.id + ' ' + m.name);
    rows.push({ id: m.id, name: m.name, cat: m.category, branded: !!isBranded,
                fat: m.fat_g, carbs: m.carbs_g, satFat_g: d.satFat_g, fiber_g: d.fiber_g,
                satWhy: d.satWhy, fibWhy: d.fibWhy, source: d.source });
    return d;
  };

  const plan = new Map();   // id -> derived fields, used by the surgical writer below

  mealsDoc.meals.forEach(m => { const d = process1(m, false); plan.set(m.id, d); });
  branded.forEach(b => { const d = process1(b, true); plan.set(b.id, d); });

  if (apply) {
    if (stats.violations.length) {
      console.error('REFUSING TO WRITE — sanity violations:\n  ' + stats.violations.join('\n  '));
      process.exit(2);
    }
    writeSurgically(MEALS_PATH, mealsRaw, plan);
    writeSurgically(BRANDED_PATH, brandedRaw, plan);
    console.log('WROTE meals.json + branded_products.json');
  }

  if (asJson) { console.log(JSON.stringify({ stats: { ...stats, absent: stats.absent.length }, rows }, null, 2)); }
  else {
    console.log('===========================================');
    console.log('  nutrient derivation ' + (apply ? '(APPLIED)' : '(dry run — nothing written)'));
    console.log('===========================================');
    console.log('  entries processed : ' + stats.total + '  (meals ' + mealsDoc.meals.length + ' + branded ' + branded.length + ')');
    console.log('  satFat_g set      : ' + stats.satSet);
    console.log('  fiber_g set       : ' + stats.fibSet);
    console.log('  hand-set (whole foods, tagged estimated): ' + stats.handSet);
    console.log('  matched a keyword rule                  : ' + stats.viaKeyword);
    console.log('  fell through to a CATEGORY default      : ' + stats.viaCategory + '   ← weakest tier, review first');
    console.log('  left ABSENT (not guessed, per DEC-004)  : ' + stats.absent.length);
    if (stats.absent.length) stats.absent.slice(0, 20).forEach(a => console.log('      ' + a));
    console.log('  sanity violations : ' + stats.violations.length);
    stats.violations.forEach(v => console.log('      ' + v));
    if (perEntry) {
      console.log('\n--- per entry ---');
      rows.forEach(r => console.log(
        [String(r.id).padEnd(6), (r.name || '').slice(0, 34).padEnd(36),
         'fat ' + String(r.fat).padStart(5), '→ sat ' + String(r.satFat_g).padStart(5),
         '| carb ' + String(r.carbs).padStart(5), '→ fib ' + String(r.fiber_g).padStart(5),
         '| ' + r.satWhy + ' / ' + r.fibWhy].join(' ')));
    }
    console.log('===========================================');
  }
  process.exit(stats.violations.length ? 2 : (stats.absent.length ? 1 : 0));
}

run();
