# T-019 — Dynamic BMR from weight log + age auto-increment (Tier 1 + Tier 2)

**Status:** approved
**Owner:** Execution Agent
**Related:** Hard guardrail — `calcBMR` / `calcTDEE` / `proteinTarget` (PROJECT_STATE "Calculation correctness")
**Scope source:** user advisory question → "ทำ Tier 1+2"

> **Guardrail note:** This task touches `calcBMR`, `proteinTarget`, and the inputs to `calcTDEE`. Per PROJECT_STATE these need a numerical justification. **The Mifflin–St Jeor formula and all coefficients are byte-identical.** Only the *inputs* (body weight, age) change from a stale onboarding snapshot to current-derived values. All downstream protections (`calorieFloor`, elderly deficit cap) are unchanged and still apply.

---

## 1. Problem

`calcBMR(p)` ([index.html](index.html#L1199)) reads `p.weight` (a profile snapshot field set at onboarding / profile-edit only). When a user logs a new weight via the body-log view (`save-weight`) or check-in flow, `setWeight()` writes **only** to `u.weights[]` — it never updates `u.weight`. Same for `proteinTarget` (reads `p.weight`).

**Result:** a user who starts at 90 kg and logs down to 80 kg keeps a BMR/TDEE/calorie-target/protein-target computed from 90 kg until they manually re-edit their profile.

### Numerical impact

Mifflin–St Jeor: `BMR = 10·w + 6.25·h − 5·a + (5 ♂ / −161 ♀)`.

- Δweight −10 kg → ΔBMR −100 kcal → **ΔTDEE −155 kcal/day** at activity 1.55
- Eating at a "maintenance" target that's 155 kcal/day too high ≈ **+0.6 kg fat regain per month**, invisible to the user
- Protein target also overstated (90 kg basis vs 80 kg reality)

Age: Δ1 year → ΔBMR −5 kcal. Small per year, but `p.age` is a static number that never increments — stale over long-term use.

## 2. Goal

- **Tier 1:** BMR / TDEE / protein target track the user's **current** body weight, derived from a 7-day average of their own weight log (smooths daily water fluctuation). Falls back to `p.weight` snapshot when no log exists.
- **Tier 2:** Age derives from a stored `birthYear` so it auto-increments yearly instead of freezing at the onboarding value.
- Surface the change transparently (no silent target shifts the user can't explain).

## 3. Non-goals (forbidden in this task)

- ❌ Changing the Mifflin–St Jeor formula or any coefficient
- ❌ Changing `calorieFloor` (1200 ♀ / 1500 ♂) or the elderly −300 deficit cap
- ❌ Changing `activityMultiplier` / `goalZoneEval` / `effectiveGoalAdjust`
- ❌ Tier 3 (empirical TDEE from intake-vs-weight-trend) — separate future task, needs careful conservative tone like T-013d
- ❌ Tier 4 (Katch–McArdle / lean-mass from waist) — deferred
- ❌ A consent modal gating target changes — decided against (auto-tracking toward accuracy is the correct behavior; floors protect the downside; a transparency hint is shown instead)
- ❌ Schema-breaking changes (`birthYear` is additive; `age`/`weight` snapshots stay for back-compat + fallback)
- ❌ Mutating `u.weight` / `u.age` snapshots (derived values are computed, not written back — mirrors the snapshot+derived pattern from T-013d.3)

## 4. Design

### New helpers

```js
// Current body weight for physiological calc: 7-day average of the weight
// log (window ending at the most-recent logged entry), else profile snapshot.
function effectiveBodyWeight(p) {
  const log = (p && p.weights) || [];
  if (!log.length) return Number(p?.weight) || 0;
  const sorted = log.slice().sort((a, b) => a.date.localeCompare(b.date));
  const latest = sorted[sorted.length - 1];
  const cutoff = dateToKey(addDays(keyToDate(latest.date), -6));   // 7-day window
  const win = sorted.filter(w => w.date >= cutoff);
  if (!win.length) return Number(p?.weight) || 0;
  return win.reduce((s, w) => s + w.weight_kg, 0) / win.length;
}

// Current age from birthYear if present (auto-increments), else snapshot age.
function effectiveAge(p) {
  if (p && typeof p.birthYear === 'number' && p.birthYear > 1900) {
    const curYear = Number(todayKey().slice(0, 4));
    const a = curYear - p.birthYear;
    if (a >= 0 && a <= 120) return a;
  }
  return Number(p?.age) || 0;
}

// Helper used at profile-write sites to seed/refresh birthYear from an entered age.
function birthYearFromAge(age) {
  return Number(todayKey().slice(0, 4)) - (Number(age) || 0);
}
```

**Window choice rationale:** ending the 7-day window at the *latest logged entry* (not "today") means a user who hasn't logged in 30 days still gets their most recent body state, not an empty window. If they log daily, it's a true 7-day rolling mean. If they log once, it's that single value.

### Functions updated to use the helpers

| Function | Before | After |
|---|---|---|
| `calcBMR(p)` | `Number(p.weight)`, `Number(p.age)` | `effectiveBodyWeight(p)`, `effectiveAge(p)` |
| `proteinTarget(p)` | `Number(p.weight)`, `Number(p.age)` | `effectiveBodyWeight(p)`, `effectiveAge(p)` |
| `isElderly(p)` | `Number(p?.age)` | `effectiveAge(p)` (elderly protections activate as the user ages into 60) |

`calcTDEE`, `defaultCalorieTarget`, `effectiveCalorieTarget`, `dailyEffectiveTarget`, `goalZoneEval`, the dashboard ring, Reports, and the T-013d recomp insight all call `calcBMR`/`proteinTarget` transitively → they **auto-benefit** with no further change.

### Coherence: exercise-burn + meal-plan body weight

These read `u.weight` directly for non-BMR physiological calc and should also use current weight (null-safe one-line swaps; **not** guardrail functions):

- Activity burn (MET) display + calc: lines ~858, ~5280, ~5324, ~8285 → `effectiveBodyWeight(u)`
- Meal-plan body-weight read: line ~1626 → `effectiveBodyWeight(u)`

(`calculateBurn(type, intensity, duration, weightKg)` signature unchanged — only the weight argument source changes.)

### Migration (additive, no break)

In `migrateData()`:

```js
// v1.10.45 — T-019: seed birthYear for existing users so age auto-increments.
// We can't recover the original birthday; assume the snapshot age was accurate
// as of now (birthYear = currentYear − age). Going forward, age increments yearly.
if (typeof u.birthYear !== 'number' && typeof u.age === 'number' && u.age > 0) {
  u.birthYear = Number(todayKey().slice(0, 4)) - u.age;
  changed = true;
}
```

At migration `effectiveAge` returns exactly the old `age` (curYear − (curYear − age) = age) → **zero immediate change** for existing users. It only starts incrementing on future calendar-year rollovers.

### Profile-write sites set `birthYear`

Wherever a user object is built/updated with `age:`, also set `birthYear: birthYearFromAge(age)`:
- New-user creation (onboarding complete)
- Onboarding redo (`redoMode`)
- Profile-edit save

`age` is still written (kept as a display/back-compat snapshot); `birthYear` is the new source of truth for `effectiveAge`.

### Display transparency (no silent shifts)

- Profile header age → `effectiveAge(u)`
- Profile protein-calc detail line ("น้ำหนัก × 1.6g") → show `effectiveBodyWeight(u)` rounded (the weight protein is actually computed from)
- BMR/TDEE breakdown (`breakdownText` / target breakdown): append a small note when the effective weight differs from the snapshot, e.g. `(จากน้ำหนักล่าสุด ${w} kg เฉลี่ย 7 วัน)`, so the user understands why the target reflects their current weight.

## 5. Affected files

| File | Change |
|---|---|
| `index.html` | 3 new helpers · `calcBMR`/`proteinTarget`/`isElderly` use them · 5 burn/plan weight swaps · `migrateData` birthYear seed · 3 profile-write sites set birthYear · display transparency (age + protein-weight + breakdown note) · VERSION |
| `service-worker.js` | VERSION → v1.10.45 |
| `docs/specs/dynamic-bmr-weight-age.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-019 entry · guardrail-justification note |

## 6. Hard guardrails

- Mifflin–St Jeor formula + coefficients **byte-identical** (verify: the `10 * w + 6.25 * hcm - 5 * a` expressions unchanged except variable source)
- `calorieFloor` + elderly −300 cap unchanged (still wrap `defaultCalorieTarget`)
- `activityMultiplier` / `goalZoneEval` unchanged
- No data file changes (`meals.json`, `branded_products.json`, `audit-meals.js` byte-identical)
- VERSION sync (`index.html` ↔ `service-worker.js`)
- `birthYear` additive only; `age` + `weight` snapshots preserved for fallback
- Onboarding preview (pseudo-user without `weights`/`birthYear`) falls back to form inputs → identical preview behavior
- Existing users: `effectiveAge` returns the same age at migration time (no surprise target jump on upgrade)

## 7. Definition of Done

- [ ] `effectiveBodyWeight(p)` helper — 7-day window ending at latest log entry, snapshot fallback
- [ ] `effectiveAge(p)` helper — birthYear-derived, snapshot fallback, 0–120 clamp
- [ ] `birthYearFromAge(age)` helper
- [ ] `calcBMR` uses `effectiveBodyWeight` + `effectiveAge` (formula/coeffs unchanged)
- [ ] `proteinTarget` uses `effectiveBodyWeight` + `effectiveAge`
- [ ] `isElderly` uses `effectiveAge`
- [ ] Exercise-burn weight reads (4 sites) + meal-plan weight read (1 site) use `effectiveBodyWeight(u)`
- [ ] `migrateData` seeds `birthYear` for existing users (no immediate value change)
- [ ] New-user + redo + profile-edit save sites set `birthYear`
- [ ] Profile header shows `effectiveAge`; protein detail shows effective weight; breakdown note added
- [ ] Onboarding preview unaffected (pseudo-user fallback verified)
- [ ] VERSION v1.10.44 → v1.10.45 (sw + index)
- [ ] PROJECT_STATE updated (incl. guardrail justification)
- [ ] Data file hashes unchanged

## 8. Test plan (manual)

1. **Existing user upgrade**: load a user with snapshot weight 90, no recent log → BMR identical to before (fallback). Migration adds birthYear; age display unchanged.
2. **Weight drop reflects**: log 80 kg today → dashboard target + protein target drop accordingly; breakdown shows "จากน้ำหนักล่าสุด 80 kg".
3. **Smoothing**: log 81/80/79 across 3 days → effective weight = 80 (mean), not jumpy.
4. **Sparse log**: single 80 kg entry months ago, nothing since → effective weight = 80 (window ends at that entry).
5. **Floor still applies**: a very light user whose computed target dips below floor → target clamps at 1200 ♀ / 1500 ♂.
6. **Elderly cap**: user at 60+ with aggressive deficit → still capped at −300.
7. **New user**: complete onboarding at age 30 → birthYear = currentYear − 30; effectiveAge = 30.
8. **Year rollover** (simulate by editing birthYear): birthYear = lastYear − 30 → effectiveAge = 31, BMR −5 kcal.
9. **Onboarding preview**: BMR/TDEE preview on the form matches a manual Mifflin calc on the entered weight/age (no log yet).
10. **Profile-edit weight**: change weight in profile-edit → snapshot updates AND a same-day weight-log entry is consistent; target reflects it.
11. **Exercise burn**: log an activity → MET burn uses current weight, not the 90 kg snapshot.

## 9. Rollback plan

`git revert <T-019 commit>` restores `p.weight`/`p.age` direct reads in `calcBMR`/`proteinTarget`/`isElderly` and the burn/plan sites. `birthYear` becomes harmless unused data (ignored by reverted code). No data loss; weight log + snapshots intact.

## 10. Open questions (locked)

- **Consent before target change?** Locked: **NO** — auto-tracking toward the user's real weight is the correct default; `calorieFloor` + elderly cap protect the downside; a transparency hint explains the shift. A future opt-in "lock my target" toggle could be a separate task if requested.
- **Window length (7 vs 14 days)?** Locked: **7 days** — matches the existing `movingAverage(…, 7)` convention used in Reports/recomp insight; long enough to smooth water weight, short enough to track real change.
- **Empirical TDEE (Tier 3)?** Deferred — the app already has intake + weight-trend data to back-calculate true TDEE (covers metabolic adaptation automatically). Separate task with conservative tone; this spec intentionally stops at "feed current weight/age into the standard formula."
