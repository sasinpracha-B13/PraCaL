#!/usr/bin/env node
/*
 * tools/audit-meals.js — read-only audit of meals.json
 *
 * What it checks:
 *   1. True top-level meal count (parses JSON; does not grep nested ids).
 *   2. For each meal: protein_g*4 + carbs_g*4 + fat_g*9 + alcohol_g*7 vs baseCalories.
 *      - diff ≤ 5%  → pass
 *      - 5–15%      → warn
 *      - > 15%      → fail   (matches the rule the Netlify functions enforce
 *                              on AI output — held against human-curated data too)
 *      The alcohol term arrives with T-024a. Before it existed, every alcoholic
 *      entry failed by construction (beer d22 was -98 cal / 65.3%) because a
 *      drink whose calories are mostly ethanol cannot reconcile from P/C/F alone.
 *   3. Optional-nutrient sanity (T-024a / DEC-004), on entries that carry them:
 *      - satFat_g must be a number in [0, fat_g]      — it is a subset of total fat
 *      - fiber_g  must be a number in [0, carbs_g]    — it is a subset of carbohydrate
 *      - alcohol_g must be a number >= 0
 *      - nutrientSource must be present whenever any of the three is, and must be
 *        one of label | derived | estimated
 *      A violation here is a FAIL regardless of the calorie deviation, because a
 *      satFat_g above fat_g is not an estimate that drifted — it is impossible.
 *      Absent fields are NOT violations: DEC-004 rule 1 says unknown means omitted.
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
 *   0 — all entries within ±5% and no sanity violation (clean)
 *   1 — warnings only (5–15%)
 *   2 — failures present (> 15%, or an optional-nutrient sanity violation) or script error
 */

'use strict';

const fs = require('fs');
const path = require('path');

const MEALS_PATH = path.resolve(__dirname, '..', 'meals.json');
const PASS_PCT = 5;
const WARN_PCT = 15;
const MIN_CAL_FOR_CHECK = 5;   // skip water/zero-cal items — div-by-near-zero is meaningless
const ALCOHOL_KCAL_PER_G = 7;
const NUTRIENT_SOURCES = ['label', 'derived', 'estimated'];

// T-024a / DEC-004 — returns a list of human-readable violations, empty when clean.
// Reads with != null, never || 0: an absent field is unknown and must not be judged.
function optionalNutrientViolations(m) {
  const v = [];
  const num = (k) => {
    if (m[k] == null) return null;
    if (typeof m[k] !== 'number' || !isFinite(m[k])) { v.push(`${k} is not a finite number (${JSON.stringify(m[k])})`); return null; }
    return m[k];
  };
  const fat = Number(m.fat_g) || 0;
  const carbs = Number(m.carbs_g) || 0;
  const satFat = num('satFat_g');
  const fiber = num('fiber_g');
  const alcohol = num('alcohol_g');
  if (satFat != null && satFat < 0) v.push(`satFat_g ${satFat} is negative`);
  if (satFat != null && satFat > fat + 1e-9) v.push(`satFat_g ${satFat} exceeds fat_g ${fat}`);
  if (fiber != null && fiber < 0) v.push(`fiber_g ${fiber} is negative`);
  if (fiber != null && fiber > carbs + 1e-9) v.push(`fiber_g ${fiber} exceeds carbs_g ${carbs}`);
  if (alcohol != null && alcohol < 0) v.push(`alcohol_g ${alcohol} is negative`);
  const carriesAny = ['satFat_g', 'fiber_g', 'alcohol_g'].some(k => m[k] != null);
  if (carriesAny && m.nutrientSource == null) v.push('carries an optional nutrient but has no nutrientSource (DEC-004 rule 4)');
  if (m.nutrientSource != null && !NUTRIENT_SOURCES.includes(m.nutrientSource)) {
    v.push(`nutrientSource "${m.nutrientSource}" is not one of ${NUTRIENT_SOURCES.join(' | ')}`);
  }
  return v;
}

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
    // T-024a: alcohol carries 7 kcal/g. Absent means "no alcohol data", which for a
    // non-alcoholic food is the same as zero contribution — so || 0 is correct HERE
    // (unlike the sanity check above, which must distinguish absent from zero).
    const a = Number(m.alcohol_g) || 0;
    const macroCal = p * 4 + c * 4 + f * 9 + a * ALCOHOL_KCAL_PER_G;
    const diff = Math.round(macroCal - cal);
    const diffPct = Math.round((Math.abs(macroCal - cal) / cal) * 1000) / 10;
    const violations = optionalNutrientViolations(m);
    const entry = {
      id: m.id,
      name: m.name,
      cal,
      macroCal: Math.round(macroCal),
      diff,
      diffPct,
      violations,
    };
    // A sanity violation is a hard fail: satFat_g > fat_g is impossible, not imprecise.
    if (violations.length) results.fail.push(entry);
    else if (diffPct <= PASS_PCT) results.pass.push(entry);
    else if (diffPct <= WARN_PCT) results.warn.push(entry);
    else results.fail.push(entry);
  }

  const withOptional = meals.filter(m => ['satFat_g', 'fiber_g', 'alcohol_g'].some(k => m[k] != null)).length;
  return { dataVersion, total: meals.length, results, withOptional };
}

function fmtSigned(n) {
  return (n > 0 ? '+' : '') + n;
}

function reportHuman({ dataVersion, total, results, withOptional }) {
  const out = [];
  out.push('===========================================');
  out.push('  meals.json audit');
  out.push('===========================================');
  out.push(`  data version : ${dataVersion}`);
  out.push(`  total entries: ${total}`);
  out.push('');
  out.push(`  pass (≤${PASS_PCT}%)   : ${results.pass.length}`);
  out.push(`  warn (${PASS_PCT}-${WARN_PCT}%) : ${results.warn.length}`);
  out.push(`  fail (>${WARN_PCT}% or sanity): ${results.fail.length}`);
  out.push(`  with optional nutrients   : ${withOptional}`);
  out.push(`  skipped (<${MIN_CAL_FOR_CHECK} cal): ${results.skipped.length}`);
  out.push('');

  if (results.fail.length) {
    out.push(`--- FAIL (deviation > ${WARN_PCT}%) ---`);
    results.fail
      .sort((a, b) => b.diffPct - a.diffPct)
      .forEach(e => {
        out.push(`  [${e.id}] ${e.name}`);
        out.push(`    declared ${e.cal} cal · macro-implied ${e.macroCal} cal · diff ${fmtSigned(e.diff)} (${e.diffPct}%)`);
        (e.violations || []).forEach(v => out.push(`    ⚠ ${v}`));
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

function reportJson({ dataVersion, total, results, withOptional }) {
  const summary = {
    dataVersion,
    total,
    withOptional,
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
