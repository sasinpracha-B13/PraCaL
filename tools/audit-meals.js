#!/usr/bin/env node
/*
 * tools/audit-meals.js — read-only audit of meals.json
 *
 * What it checks:
 *   1. True top-level meal count (parses JSON; does not grep nested ids).
 *   2. For each meal: protein_g*4 + carbs_g*4 + fat_g*9 vs baseCalories.
 *      - diff ≤ 5%  → pass
 *      - 5–15%      → warn
 *      - > 15%      → fail   (matches the rule the Netlify functions enforce
 *                              on AI output — held against human-curated data too)
 *
 * Why: T-001's literal `grep '"id"' meals.json` returned 541 because of nested
 *      customization ids (true count: 375). This script is the reliable way
 *      to count and validate.
 *
 * Usage:
 *   node tools/audit-meals.js          # human output
 *   node tools/audit-meals.js --json   # machine output
 *
 * Exit codes (per tools/README.md convention):
 *   0 — all entries within ±5% (clean)
 *   1 — warnings only (5–15%)
 *   2 — failures present (> 15%) or script error
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MEALS_PATH = path.resolve(__dirname, '..', 'meals.json');
const PASS_PCT = 5;
const WARN_PCT = 15;
const MIN_CAL_FOR_CHECK = 5;   // skip water/zero-cal items — div-by-near-zero is meaningless

function audit() {
  const raw = fs.readFileSync(MEALS_PATH, 'utf8');
  const data = JSON.parse(raw);
  const meals = Array.isArray(data.meals) ? data.meals : [];
  const dataVersion = data.version || '?';

  const results = { pass: [], warn: [], fail: [], skipped: [] };

  for (const m of meals) {
    const cal = Number(m.baseCalories) || 0;
    if (cal < MIN_CAL_FOR_CHECK) {
      results.skipped.push({ id: m.id, name: m.name, cal });
      continue;
    }
    const p = Number(m.protein_g) || 0;
    const c = Number(m.carbs_g) || 0;
    const f = Number(m.fat_g) || 0;
    const macroCal = p * 4 + c * 4 + f * 9;
    const diff = Math.round(macroCal - cal);
    const diffPct = Math.round((Math.abs(macroCal - cal) / cal) * 1000) / 10;
    const entry = {
      id: m.id,
      name: m.name,
      cal,
      macroCal: Math.round(macroCal),
      diff,
      diffPct,
    };
    if (diffPct <= PASS_PCT) results.pass.push(entry);
    else if (diffPct <= WARN_PCT) results.warn.push(entry);
    else results.fail.push(entry);
  }

  return { dataVersion, total: meals.length, results };
}

function fmtSigned(n) {
  return (n > 0 ? '+' : '') + n;
}

function reportHuman({ dataVersion, total, results }) {
  const out = [];
  out.push('===========================================');
  out.push('  meals.json audit');
  out.push('===========================================');
  out.push(`  data version : ${dataVersion}`);
  out.push(`  total entries: ${total}`);
  out.push('');
  out.push(`  pass (≤${PASS_PCT}%)   : ${results.pass.length}`);
  out.push(`  warn (${PASS_PCT}-${WARN_PCT}%) : ${results.warn.length}`);
  out.push(`  fail (>${WARN_PCT}%)  : ${results.fail.length}`);
  out.push(`  skipped (<${MIN_CAL_FOR_CHECK} cal): ${results.skipped.length}`);
  out.push('');

  if (results.fail.length) {
    out.push(`--- FAIL (deviation > ${WARN_PCT}%) ---`);
    results.fail
      .sort((a, b) => b.diffPct - a.diffPct)
      .forEach(e => {
        out.push(`  [${e.id}] ${e.name}`);
        out.push(`    declared ${e.cal} cal · macro-implied ${e.macroCal} cal · diff ${fmtSigned(e.diff)} (${e.diffPct}%)`);
      });
    out.push('');
  }

  if (results.warn.length) {
    out.push(`--- WARN (deviation ${PASS_PCT}-${WARN_PCT}%) ---`);
    results.warn
      .sort((a, b) => b.diffPct - a.diffPct)
      .forEach(e => {
        out.push(`  [${e.id}] ${e.name}`);
        out.push(`    declared ${e.cal} cal · macro-implied ${e.macroCal} cal · diff ${fmtSigned(e.diff)} (${e.diffPct}%)`);
      });
    out.push('');
  }

  if (results.skipped.length) {
    out.push(`--- skipped (baseCalories < ${MIN_CAL_FOR_CHECK}) ---`);
    results.skipped.forEach(e => {
      out.push(`  [${e.id}] ${e.name}  (cal=${e.cal})`);
    });
    out.push('');
  }

  out.push('===========================================');
  process.stdout.write(out.join('\n') + '\n');
}

function reportJson({ dataVersion, total, results }) {
  const summary = {
    dataVersion,
    total,
    summary: {
      pass: results.pass.length,
      warn: results.warn.length,
      fail: results.fail.length,
      skipped: results.skipped.length,
    },
    fail: results.fail,
    warn: results.warn,
    skipped: results.skipped,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
}

function main() {
  const isJson = process.argv.includes('--json');
  let result;
  try {
    result = audit();
  } catch (err) {
    process.stderr.write(`audit failed: ${err.message}\n`);
    process.exit(2);
  }
  (isJson ? reportJson : reportHuman)(result);

  if (result.results.fail.length) process.exit(2);
  if (result.results.warn.length) process.exit(1);
  process.exit(0);
}

main();
