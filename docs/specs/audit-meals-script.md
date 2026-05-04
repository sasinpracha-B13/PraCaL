# T-003 — `tools/audit-meals.js`

**Status:** approved (scope locked by T-003 DoD; surfaced by T-001 audit)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-003 · `PROJECT_STATE.md` Open Question 2 · T-001 audit findings

---

## Goal

Build a read-only audit script that validates `meals.json` integrity. Two specific things to catch:

1. **True top-level meal count** — replacing the literal `grep '"id"' meals.json` that misled T-001 (returned 541 because of nested customization ids; truth is 375).
2. **Macro/calorie consistency per entry** — the same `protein×4 + carbs×4 + fat×9` vs `baseCalories` check the Netlify functions enforce on AI output. Held against human-curated data too.

## Non-goals

- **Not fixing issues.** This is a reporter; offending entries are listed for a follow-up Data/Domain task.
- **Not auditing `branded_products.json`.** Separate task if needed; products have a slightly different shape (servingSize, servingsPerPackage).
- **Not running in CI.** Manual invocation only. CI/automation is a separate decision (`docs/decisions/`).
- **Not introducing dependencies.** Node stdlib only — no `package.json`, no install step.
- **Not modifying `meals.json`.** Read-only.

## Entry points

Command-line:

```bash
node tools/audit-meals.js          # human-readable output to stdout
node tools/audit-meals.js --json   # machine-readable JSON to stdout
```

No env vars. No flags beyond `--json`.

## State changes / affected views

None — script lives outside the running app. The browser does not load `tools/`.

## Affected files

| File | Change |
|---|---|
| `tools/audit-meals.js` | **new** — the audit script |
| `tools/README.md` | adds catalog row + bumps "Suggested first tools" status |
| `PROJECT_STATE.md` | Open Question 2 partially addressed (audit tooling exists for meals.json; broader test infra still open) |
| `TASK_BOARD.md` | T-003 row → `done` after user gate |

No production code, no `index.html`, no `meals.json`, no `service-worker.js`, no `netlify/functions/*`. Hard guardrails not touched.

## Behavior

### Buckets

For each meal entry with `baseCalories ≥ 5`:

```
diffPct = abs(macroCal - baseCalories) / baseCalories × 100
where macroCal = protein_g × 4 + carbs_g × 4 + fat_g × 9
```

| Bucket | Threshold | Meaning |
|---|---|---|
| pass | `diffPct ≤ 5` | tight match, no action |
| warn | `5 < diffPct ≤ 15` | within Netlify function tolerance but worth knowing |
| fail | `diffPct > 15` | would be flagged by the AI consistency check too — needs human review |

Entries with `baseCalories < 5` are skipped (water and similar; macro check would divide by ~zero).

### Exit codes

Per `tools/README.md` convention:

- `0` — all entries pass
- `1` — warnings present, no failures
- `2` — failures present (or script crashed)

### Human output

```
===========================================
  meals.json audit
===========================================
  data version : 1.10.9
  total entries: 375

  pass (≤5%)   : <count>
  warn (5-15%) : <count>
  fail (>15%)  : <count>

--- FAIL (deviation > 15%) ---
  [meal_id] meal name
    declared <cal> cal · macro-implied <cal> cal · diff <±diff> (<diffPct>%)
  ...

--- WARN (deviation 5-15%) ---
  ...
===========================================
```

### JSON output

```json
{
  "dataVersion": "1.10.9",
  "total": 375,
  "summary": { "pass": <n>, "warn": <n>, "fail": <n> },
  "warn": [ { "id": "...", "name": "...", "cal": <n>, "macroCal": <n>, "diff": <n>, "diffPct": <n> }, ... ],
  "fail": [ ... ]
}
```

## Workflows that must keep working

- **`meals.json` consumers** (the running app, future tools): unchanged. Script is read-only.
- **CI / build / deploy:** unchanged. Script is opt-in, runs locally on demand.
- **Data/Domain Agent edits to `meals.json`:** unchanged. Script becomes a *post-edit verification step* but doesn't block edits.

## Hard guardrails touched

None. Script is a tool, not behavior.

## Test plan

Manual verification after script is written:

1. **Run `node tools/audit-meals.js`** — exits cleanly (0/1/2 depending on data state). Output is readable.
2. **Confirm count = 375** in the output (validates the bug T-001 surfaced is fixed).
3. **Confirm data version = `1.10.9`** matches `meals.json`'s `version` field.
4. **Run `node tools/audit-meals.js --json`** — emits valid JSON to stdout (parses with `JSON.parse`).
5. **Snapshot the first run** in this spec's "First-run output" section below — historical record of what the data looked like at T-003 land.
6. **Audit script is read-only:** confirm `meals.json` byte-identical before / after running (`md5sum` / `Get-FileHash`).

## First-run output (snapshot)

> Captured during T-003 implementation. Becomes the baseline for future runs.
>
> **Verification policy (user-approved):** PS parallel-implementation (`tools/.audit-meals-verify.ps1`, git-ignored helper) is accepted as canonical evidence for T-003. The PS impl mirrors the JS line-for-line; read-only invariant (`Get-FileHash` before/after) verified. A future user-side `node tools/audit-meals.js` is *optional validation*, not a gating condition for `done`. If the broader runtime decision in T-004 (`DEC-002`) changes this, that supersedes.
>
> **Result summary:** 375 total · 297 pass · 70 warn · **5 fail** · 3 skipped · exit code `2`.

### Summary

```
===========================================
  meals.json audit
===========================================
  data version : 1.10.9
  total entries: 375

  pass (≤5%)   : 297
  warn (5-15%) : 70
  fail (>15%)  : 5
  skipped (<5 cal): 3
===========================================
```

### Failures (deviation > 15%)

| id | name | declared cal | macro-implied | diff | diffPct |
|---|---|---|---|---|---|
| d22 | เบียร์ (1 ขวด 330ml) | 150 | 52 | −98 | 65.3% |
| d15 | กาแฟดำเย็น / อเมริกาโน่ไม่หวาน | 5 | 4 | −1 | 20.0% |
| d03 | กาแฟดำร้อน | 5 | 4 | −1 | 20.0% |
| s02 | ส้มตำปู | 165 | 196 | +31 | 18.8% |
| m18 | ปลาทอดราดพริก | 585 | 488 | −97 | 16.6% |

### Findings worth noting (out of scope for T-003 — for follow-up)

1. **`d22` (beer) at 65% off is an expected limitation of the macro check.** Alcohol contributes ~7 cal/g but isn't in the `protein × 4 + carbs × 4 + fat × 9` formula. Beer/wine entries will always appear inflated. Future schema option: add `alcohol_g` field and include in `macroCal`. Out of scope for T-003.
2. **`d15` and `d03` (black coffee) at 20% are noise from low-cal absolute diffs.** Declared 5 cal, macro-implied 4 — only 1 cal apart. Consider raising `MIN_CAL_FOR_CHECK` to ~10 to reduce false positives. Decided to keep at 5 for now to surface the visibility gap; can adjust in a tuning pass.
3. **`s02` and `m18` at 16-19% are real data discrepancies.** Worth a Data/Domain task to recompute / verify the originals.
4. **70 warnings (5–15%)** mostly cluster at the lower end (5-9%), suggesting most are within reasonable cooking variation rather than data errors. Worth a periodic review but not urgent.

### Skipped (baseCalories < 5)

`d11` น้ำเปล่า · `d23` น้ำเปล่าอัดลม · `b55` น้ำอัดลม Zero — all 0 cal, macro check meaningless.

## Definition of Done

Mirrored in `TASK_BOARD.md` T-003. Each checkbox ticked when evidence is produced.

## Rollback plan

`git rm tools/audit-meals.js` and revert the catalog row in `tools/README.md`. No production effect; rollback is trivial.

## Open questions

None at write-time. Future enhancement candidates (out of scope for T-003):

- Audit branded_products (separate shape).
- Audit `customizations` deltas (negative cal/macro adjustments — different rule).
- Pre-commit hook that runs `audit-meals.js` on staged `meals.json`.
- Detect meals with missing fields (`emoji`, `category`, `baseWeight_g`).
- Detect duplicate ids or near-duplicate names.

These are notes, not commitments.
