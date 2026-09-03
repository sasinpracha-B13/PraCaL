#!/usr/bin/env node
/*
 * tools/audit-csv-addon-rows.js — read-only audit of an exported PraCaL CSV
 *
 * What it checks:
 *   For every day in the export, does the naive reading — "sum every item row" —
 *   equal that day's `สรุปวัน` row?
 *
 *   That is the property a human or an AI consultant assumes when they open the
 *   file. Before v1.10.51 it was false: `buildCSV` folded each add-on into its
 *   parent meal row (because `calcEntryTotals` already includes add-ons) and then
 *   printed the same add-on again as its own `  + …` row. T-023 made the parent
 *   row base-only, so parent + `  + …` rows now sum to the truth.
 *
 *   This script is the regression guard for that fix, and it also identifies a
 *   pre-fix export so old files are not mistaken for corrupt data.
 *
 * Layouts:
 *   Two export layouts exist and both are handled — the script reads the header row
 *   rather than assuming fixed indices.
 *     · v1.10.51 and earlier : วันที่, ชื่ออาหาร, …                       (10 columns)
 *     · v1.10.52 and later   : วันที่, ประเภทแถว, ชื่ออาหาร, …            (14 columns, T-024a)
 *   In the v1.10.52 layout the row kind comes from ประเภทแถว
 *   (รายการ / ส่วนเสริม / สรุปวัน / ครอบคลุม(%) / ชั่งน้ำหนัก) instead of being
 *   inferred from the name's leading "  + ". ครอบคลุม(%) rows are DEC-004 coverage
 *   disclosure, not nutrition, and are excluded from every sum.
 *
 * Tolerances:
 *   - แคลอรี่ is an integer column and must reconcile EXACTLY.
 *   - Macro columns are printed `toFixed(1)` per row while `สรุปวัน` rounds the
 *     unrounded day total, so a day with N item rows may legitimately drift up to
 *     0.05 × N grams. That drift is inherent to the export format and predates
 *     T-023 (it occurs on days with no add-ons at all).
 *
 * Usage:
 *   node tools/audit-csv-addon-rows.js <exported.csv>
 *   node tools/audit-csv-addon-rows.js <exported.csv> --json
 *
 * Exit codes (per tools/README.md convention):
 *   0 — clean (every day reconciles within tolerance)
 *   1 — warnings only (macro drift beyond the rounding tolerance, calories fine)
 *   2 — failures (calorie mismatch — e.g. a pre-v1.10.51 export, or the bug is back)
 *       or script error
 */

'use strict';

const fs = require('fs');

const SUMMARY_NAME = 'สรุปวัน';
const COVERAGE_KIND = 'ครอบคลุม(%)';

// Column layout is resolved from the header, not hardcoded — see "Layouts" above.
function resolveLayout(headerRow) {
  const h = headerRow.map(x => String(x).trim());
  const hasRowKind = h[1] === 'ประเภทแถว';
  const at = name => {
    const i = h.indexOf(name);
    if (i < 0) throw new Error('header is missing the column "' + name + '"');
    return i;
  };
  return {
    hasRowKind,
    nameIdx: hasRowKind ? at('ชื่ออาหาร') : 1,
    kindIdx: hasRowKind ? 1 : -1,
    cols: [
      { key: 'kcal', idx: at('แคลอรี่'),   label: 'แคลอรี่', exact: true },
      { key: 'p',    idx: at('โปรตีน(g)'), label: 'โปรตีน',  exact: false },
      { key: 'c',    idx: at('คาร์บ(g)'),  label: 'คาร์บ',   exact: false },
      { key: 's',    idx: at('น้ำตาล(g)'), label: 'น้ำตาล',  exact: false },
      { key: 'f',    idx: at('ไขมัน(g)'),  label: 'ไขมัน',   exact: false }
    ]
  };
}

function parseCSV(text) {
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQuotes = false;
      } else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

const num = v => { const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
const isAddonRow = name => /^\s+\+\s/.test(name);
const r1 = n => Math.round(n * 10) / 10;

function audit(csvPath) {
  let text = fs.readFileSync(csvPath, 'utf8');
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const parsed = parseCSV(text);
  if (!parsed.length) throw new Error('empty file');
  const layout = resolveLayout(parsed[0]);
  const COLS = layout.cols;
  const rows = parsed.slice(1).filter(r => r[0] && /^\d{4}-\d{2}-\d{2}$/.test(r[0]));

  const days = new Map();
  for (const r of rows) {
    const date = r[0];
    const name = r[layout.nameIdx] || '';
    const kind = layout.hasRowKind ? String(r[layout.kindIdx] || '').trim() : null;

    // Coverage rows carry percentages, not nutrition — never sum them.
    if (kind === COVERAGE_KIND) continue;
    // Standalone weigh-in rows carry no nutrition either.
    if (kind === 'ชั่งน้ำหนัก' || name.trim() === '(ชั่งน้ำหนัก)') continue;

    if (!days.has(date)) days.set(date, { date, summary: null, itemRows: 0, addonRows: 0, all: {}, parentsOnly: {} });
    const d = days.get(date);
    const vals = {};
    for (const col of COLS) vals[col.key] = num(r[col.idx]);

    const isSummary = layout.hasRowKind ? kind === SUMMARY_NAME : name.trim() === SUMMARY_NAME;
    if (isSummary) { d.summary = vals; continue; }
    d.itemRows++;
    const addon = layout.hasRowKind ? kind === 'ส่วนเสริม' : isAddonRow(name);
    if (addon) d.addonRows++;
    for (const col of COLS) {
      d.all[col.key] = (d.all[col.key] || 0) + vals[col.key];
      if (!addon) d.parentsOnly[col.key] = (d.parentsOnly[col.key] || 0) + vals[col.key];
    }
  }

  const findings = [];
  let daysChecked = 0, preFixSignature = 0;
  for (const d of [...days.values()].sort((a, b) => (a.date < b.date ? -1 : 1))) {
    if (!d.summary) { findings.push({ date: d.date, col: '-', severity: 'fail', note: 'ไม่มีแถว สรุปวัน' }); continue; }
    daysChecked++;
    // Pre-fix signature: parents alone match the summary, but parents+addons do not.
    if (d.addonRows > 0 &&
        Math.abs(d.parentsOnly.kcal - d.summary.kcal) < 0.5 &&
        Math.abs(d.all.kcal - d.summary.kcal) >= 0.5) preFixSignature++;

    for (const col of layout.cols) {
      const got = d.all[col.key] || 0;
      const want = d.summary[col.key];
      const diff = got - want;
      const tol = col.exact ? 0.5 : 0.05 * d.itemRows + 1e-9;
      if (Math.abs(diff) > tol) {
        findings.push({
          date: d.date, col: col.label, severity: col.exact ? 'fail' : 'warn',
          rows: r1(got), summary: want, diff: r1(diff), itemRows: d.itemRows
        });
      }
    }
  }

  const fails = findings.filter(f => f.severity === 'fail');
  const warns = findings.filter(f => f.severity === 'warn');
  return { csvPath, layout: layout.hasRowKind ? 'v1.10.52+ (14 คอลัมน์)' : 'v1.10.51 หรือเก่ากว่า (10 คอลัมน์)',
           daysChecked, totalRows: rows.length, preFixSignature, findings, fails, warns };
}

function main() {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const csvPath = args.find(a => !a.startsWith('--'));
  if (!csvPath) {
    console.error('usage: node tools/audit-csv-addon-rows.js <exported.csv> [--json]');
    process.exit(2);
  }
  if (!fs.existsSync(csvPath)) {
    console.error('ไม่พบไฟล์: ' + csvPath);
    process.exit(2);
  }

  let res;
  try { res = audit(csvPath); }
  catch (err) { console.error('audit error: ' + err.message); process.exit(2); }

  const code = res.fails.length ? 2 : (res.warns.length ? 1 : 0);

  if (json) {
    console.log(JSON.stringify({ ...res, exitCode: code }, null, 2));
    process.exit(code);
  }

  console.log('audit-csv-addon-rows — ' + res.csvPath);
  console.log('  รูปแบบไฟล์: ' + res.layout);
  console.log('  วันที่ตรวจ: ' + res.daysChecked + '  ·  แถวข้อมูล: ' + res.totalRows);
  console.log('');

  if (res.preFixSignature > 0) {
    console.log('  ⚠️  พบลายเซ็นของบั๊กก่อน v1.10.51 (T-023) บน ' + res.preFixSignature + ' วัน:');
    console.log('      ผลรวมแถวแม่ (ไม่รวม "  + ") ตรงกับ สรุปวัน แต่พอรวมแถว "  + " แล้วเกิน');
    console.log('      → add-on ถูกนับสองครั้ง  ไฟล์นี้น่าจะ export จากแอปเวอร์ชันเก่า');
    console.log('      แก้โดย export ใหม่จาก v1.10.51 ขึ้นไป');
    console.log('');
  }

  if (!res.findings.length) {
    console.log('  ✅ ทุกวันกระทบยอดตรง — "บวกทุกแถวรายการ" = สรุปวัน');
  } else {
    for (const f of res.findings.slice(0, 40)) {
      const tag = f.severity === 'fail' ? '❌ FAIL' : '⚠️  WARN';
      if (f.note) { console.log('  ' + tag + '  ' + f.date + '  ' + f.note); continue; }
      console.log('  ' + tag + '  ' + f.date + '  ' + f.col +
                  '  แถวรวม ' + f.rows + '  สรุปวัน ' + f.summary + '  ต่าง ' + f.diff);
    }
    if (res.findings.length > 40) console.log('  … อีก ' + (res.findings.length - 40) + ' รายการ');
  }

  console.log('');
  console.log('  สรุป: fail ' + res.fails.length + ' · warn ' + res.warns.length +
              '  → exit ' + code);
  if (code === 1) {
    console.log('  (warn = คลาดเคลื่อนจากปัดทศนิยม 1 ตำแหน่งต่อแถว ซึ่งมีมาก่อน T-023)');
  }
  process.exit(code);
}

main();
