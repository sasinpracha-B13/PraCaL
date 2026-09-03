# T-023 — CSV export: fix add-on double-count

**Status:** approved
**Owner:** Execution Agent
**Type:** bug fix (production data export)
**Depends on:** nothing
**Related:** T-022 (`docs/AI-HANDOFF-BRIEF.md` — the consultant-handoff use case this defect undermines) · T-024 (nutrient schema, which adds columns to the same export)

> `buildCSV` writes each add-on's nutrition **twice**: once folded into its parent meal row (because `calcEntryTotals` already includes add-ons) and again as its own `  + …` row. Anyone who sums the item rows of an exported CSV over-counts. On the user's real 132-day export that is **+4,485 kcal / +261 g protein / +253 g carbs / +175 g sugar / +258 g fat** of nutrition that was never eaten.

---

## 1. The defect

[`index.html:3415-3435`](../../index.html) — inside `buildCSV`:

```js
entries.forEach(e => {
  const m = e.snapshot || findMeal(e.mealId);
  const t = calcEntryTotals(e);          // ← ALREADY INCLUDES add-ons (index.html:1841-1852)
  rows.push([d, baseName, qty, e.sizePct || 100,
    Math.round(t.calories), …]);         // parent row = base + add-ons
  (e.addons || []).forEach(a => {
    …
    rows.push([d, `  + ${addon.name}`, count, '-',
      Math.round(addon.calories * count), …]);   // ← the same add-on, printed a second time
  });
});
const daySum = sumEntries(entries);      // correct (one pass through calcEntryTotals)
```

`สรุปวัน` is **correct** — `sumEntries` → `calcEntryTotals` counts each add-on once. Only the item rows are wrong.

**Observable signature** (real export, `pracal_เบย์_all_to_2026-09-03.csv`, 2026-04-25 → 2026-09-03):

| check | result |
|---|---|
| `สรุปวัน` kcal == Σ(item rows **excluding** `  + ` rows) | **132 / 132 days** ✅ |
| `สรุปวัน` kcal == Σ(**all** item rows) | 85 / 132 days ❌ |
| naive "sum every item row" vs `สรุปวัน`, all 5 columns | **217 / 660 cells wrong** |

Worked example — 2026-04-25, `ข้าวมันไก่` (`r04`, `baseCalories: 600`) + `น้ำจิ้ม` add-on (50 kcal):

```
ข้าวมันไก่ , 1 , 100 , 650      ← 600 + 50 : the น้ำจิ้ม is already in here
  + น้ำจิ้ม , 1 , -  ,  50      ← and again here
สรุปวัน   , - , -  , 1651      ← correct; equals 650 + (other parents), add-on counted once
```

## 2. Blast radius — the export is the only affected surface

Audited every consumer of `entry.addons` before editing (Universal Rule 4 + 5):

| site | behavior | verdict |
|---|---|---|
| `calcEntryTotals` ([1841](../../index.html)) | adds each add-on once | ✅ correct |
| `sumEntries` ([1863](../../index.html)) | one pass through `calcEntryTotals` | ✅ correct |
| `logEntryHtml` ([4346](../../index.html)) | renders add-on **names only**; the kcal shown is `t.calories` | ✅ correct |
| `meal-detail` ([5291](../../index.html)) | already prints base-only via `cal - ADDONS.reduce(…)` | ✅ correct (duplicated arithmetic — see §7) |
| `buildCSV` ([3418](../../index.html)) | **double-counts** | ❌ this task |

No dashboard ring, report, streak, plan or insight reads the CSV. **The fix cannot move any in-app number.**

## 3. Chosen behavior — parent row becomes base-only

Three options were considered:

| # | approach | outcome |
|---|---|---|
| **1** | parent row = meal **without** add-ons; `+` rows stay as the deltas | Σ(all item rows) == `สรุปวัน`. Matches what the indented `  + ` layout already implies to a reader. **← chosen** |
| 2 | keep parent as-eaten; blank out the numbers on `+` rows | loses add-on detail; the `+` row becomes decorative |
| 3 | keep both; add a row-type column | fixes ambiguity but changes the header — belongs with T-024, which changes the header anyway |

Option 1 is chosen because it makes the **naive** reading correct. A human or an LLM opening this file reads `ข้าวมันไก่ 600` + `  + น้ำจิ้ม 50` and concludes 650 — which after this fix is the truth.

## 4. Implementation

**4a. Extract `calcAddonTotals(entry)`** — new helper directly above `calcEntryTotals`. This is a pure extraction of the loop already living at [1841-1852](../../index.html); no arithmetic changes.

```js
// v1.10.51 — T-023: add-on contribution for one entry, split out of calcEntryTotals so the
// CSV export can print a base-only parent row without re-deriving the ADDONS lookup.
// Add-ons are NOT scaled by sizePct/quantity (unchanged from the original inline loop).
function calcAddonTotals(entry) {
  const acc = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, sugar_g: 0 };
  (entry.addons || []).forEach(addon => {
    const id = typeof addon === 'string' ? addon : addon.id;
    const count = typeof addon === 'string' ? 1 : (addon.count || 0);
    if (!count) return;
    const a = ADDONS.find(x => x.id === id);
    if (!a) return;
    acc.calories  += a.calories * count;
    acc.protein_g += a.protein_g * count;
    acc.carbs_g   += a.carbs_g * count;
    acc.fat_g     += a.fat_g * count;
    acc.sugar_g   += (a.sugar_g || 0) * count;
  });
  return acc;
}
```

**4b. `calcEntryTotals` delegates to it** — the inline `(entry.addons || []).forEach(…)` block is replaced by:

```js
  const ad = calcAddonTotals(entry);
  calories += ad.calories;
  protein  += ad.protein_g;
  carbs    += ad.carbs_g;
  fat      += ad.fat_g;
  sugar    += ad.sugar_g;
```

Behavior-identical: same operands, same order, same skip rules (`!count`, `!a`).

**4c. `buildCSV` prints the parent net of add-ons:**

```js
      const t  = calcEntryTotals(e);
      const ad = calcAddonTotals(e);   // v1.10.51 — T-023: subtract; the + rows below carry these
      rows.push([d, baseName, qty, e.sizePct || 100,
        Math.round(t.calories - ad.calories),
        (t.protein_g - ad.protein_g).toFixed(1),
        (t.carbs_g   - ad.carbs_g).toFixed(1),
        (t.sugar_g   - ad.sugar_g).toFixed(1),
        (t.fat_g     - ad.fat_g).toFixed(1), '']);
```

The `  + …` rows and the `สรุปวัน` row are **not** touched.

**4d. Version bumps** — `index.html` and `service-worker.js` → `v1.10.51` (both, per the bumping policy).

## 5. Predicted audit result (stated before implementing)

Because `parent_new = parent_old − addons`, the post-fix naive sum equals the pre-fix sum of parent rows — which §1 already measured as exactly `สรุปวัน` on kcal for 132/132 days. Therefore:

1. **kcal: 0 mismatching cells out of 132** — exact.
2. **P/C/S/F: ≤ ~25 cells drift by exactly ±0.1 g**, because every row prints `toFixed(1)` independently while `สรุปวัน` prints `toFixed(1)` of the unrounded day total. This drift **must appear at the same rate on days that have no add-ons at all** — that is the proof it is pre-existing and not caused by this change.
3. No in-app number changes.

## 6. Audit result (measured — `tools/audit-csv-addon-rows.js`)

Simulated the fix against the real 132-day export by applying `parent − addons` to each of the 598 item rows (54 of which carry add-ons):

```
naive "sum every item row" vs สรุปวัน
  BEFORE fix : mismatching cells 217 / 660
  AFTER  fix : mismatching cells  24 / 660   worst abs drift 0.1

post-fix, split by whether the day has add-ons
  days WITHOUT any add-on : 16 / 425 cells drift (3.8%)
  days WITH    add-ons    :  8 / 235 cells drift (3.4%)
  kcal column mismatches  :  0            ← the bug, gone
  every residual drift is exactly ±0.1 g  : true
```

Prediction met on all three points. The ±0.1 g residual occurs **slightly more often on add-on-free days**, confirming it is per-row `toFixed(1)` rounding that this task neither creates nor is responsible for. Documented as a known tolerance, not fixed here: closing it would mean either widening the export's decimals or recomputing `สรุปวัน` from rounded rows — the latter would make the CSV disagree with the dashboard, which is worse.

## 7. Findings flagged, deliberately NOT fixed (Universal Rule 3)

- **`meal-detail` duplicates the add-on arithmetic** — [index.html:5291](../../index.html) computes base-only inline via `cal - ADDONS.reduce(…)` over `state.tmp.addonCounts`. Correct today, but it is a second copy of the same idea. It reads view state (`addonCounts`), not an `entry`, so `calcAddonTotals` does not drop in unchanged. Candidate for a later cleanup.
- **`SPECIAL_MEAL_ADDONS` has no CSV representation at all** — special-meal add-ons ([index.html:965](../../index.html)) never reach `buildCSV`; a special meal exports as one aggregate row. Not a double-count, but it is an export blind spot. Belongs with T-024.
- **The `สรุปวัน` row remains a summation trap** — an analyst who sums *every* row including `สรุปวัน` still doubles the total. A row-type column would end the ambiguity; deferred to T-024, which changes the header anyway.

## 8. Definition of done

- [x] `calcAddonTotals` extracted; `calcEntryTotals` delegates to it with identical arithmetic
- [x] `buildCSV` parent row is base-only; `+` rows and `สรุปวัน` unchanged
- [x] Audit script committed under `tools/`, run against the real 132-day export
- [x] kcal reconciles on 132/132 days; residual drift proven pre-existing
- [x] Both `VERSION` constants bumped to `v1.10.51`
- [x] Diff scope = the two functions + two version lines + the new audit script. No other collateral.
- [x] `PROJECT_STATE.md` + `TASK_BOARD.md` updated
