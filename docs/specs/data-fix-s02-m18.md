# T-005 — Fix s02 + m18 data discrepancies in `meals.json`

**Status:** approved (scope locked by user · doc minimal · production-data change)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-005 · T-003 audit findings (commit `aa20e6a`)

---

## Goal

Resolve the two real macro/calorie-consistency failures that T-003's `tools/audit-meals.js` flagged in `meals.json`:

- `s02` — ส้มตำปู (papaya salad with crab) — current diff +18.8%
- `m18` — ปลาทอดราดพริก (deep-fried fish with chili sauce) — current diff −16.6%

Both currently fail the `protein×4 + carbs×4 + fat×9` vs `baseCalories` ±15% rule (the same rule the Netlify Functions enforce on AI output, applied to human-curated data).

## Non-goals (scope locked by user)

- ❌ No schema change
- ❌ No `alcohol_g` field
- ❌ No beer or alcohol-class logic
- ❌ No broad nutrition rewrite
- ❌ No edits to any meal other than s02 and m18
- ❌ No UI / `index.html` rendering changes (only the cached `VERSION` constant bumps for cache invalidation)
- ❌ No `tools/audit-meals.js` logic change (it correctly catches both entries; nothing wrong with the auditor)

## Current state (from `meals.json`)

| field | s02 (ส้มตำปู, salads) | m18 (ปลาทอดราดพริก, mains) |
|---|---|---|
| `baseCalories` | 165 | 585 |
| `baseWeight_g` | 250 | 300 |
| `protein_g` | 12 | 32 |
| `carbs_g` | 28 | 18 |
| `fat_g` | 4 | 32 |
| `sugar_g` | 12 | 10 |
| macro-calc (P×4 + C×4 + F×9) | 196 | 488 |
| diff vs `baseCalories` | **+31 cal (+18.8%)** ❌ | **−97 cal (−16.6%)** ❌ |

## The fix (each entry, smallest defensible change)

### s02 — ส้มตำปู

- **Change:** `baseCalories` 165 → **195**
- **Reason:** macros 12P/28C/4F are realistic for ส้มตำปู 250g (low-fat dish + 12g sugar from palm sugar); the `196` macro-cal estimate aligns with the sister entry **s03 ส้มตำปลาร้า** which is `205 cal` with similar 14P/30C/5F. The original `165` looks like an under-count, not a macro error. Bumping `baseCalories` is the smallest, most defensible single-cell correction.
- **Result after fix:** 195 vs macro-cal 196 → diff −1 cal (−0.5%) ✅ pass

### m18 — ปลาทอดราดพริก

- **Change:** `fat_g` 32 → **42**
- **Reason:** deep-fried fish absorbs significant oil (~10–15g per 100g of fish during frying). For a 300g serving with chili-sauce coating, 32g fat under-counts oil absorption; 42g is realistic. The sister entry **m19 หมูทอดกระเทียม** has `30g fat / 200g serving` (≈15g/100g) — m18 at 42g/300g (≈14g/100g) is now in the same range. The `baseCalories: 585` is plausible for the dish; raising fat to match it is the more honest fix than dropping calories.
- **Result after fix:** macros 32P/18C/42F → macro-cal 578; vs 585 → diff −7 cal (−1.2%) ✅ pass

### Why these fixes (vs alternatives)

| Alternative | Why rejected |
|---|---|
| Drop s02 calories to 165 by lowering a macro | All three macros are reasonable; no candidate to lower without a separate justification |
| Drop m18 calories from 585 to 488 | 488 cal for 300g fried fish is on the low end of plausibility; raising fat is more honest about deep-frying |
| Recompute calories from macros (= force diff to 0%) | Both meals' calories aren't measured-from-macro in real life — they're separate references; hitting exactly 0% is over-precise |
| Add `alcohol_g` schema field | Out of scope (user-locked) |

## Affected files

| File | Change |
|---|---|
| `meals.json` | s02 `baseCalories` 165→195 · m18 `fat_g` 32→42 · top-level `"version": "1.10.9"` → `"1.10.10"` |
| `service-worker.js` | `VERSION` `'v1.10.22'` → `'v1.10.23'` (cache invalidation; required because `meals.json` is a cache-first asset) |
| `index.html` | `VERSION` `'v1.10.22'` → `'v1.10.23'` (must match service worker; hard guardrail) |
| `docs/specs/data-fix-s02-m18.md` | this spec (new) |
| `PROJECT_STATE.md` | Current Version line updated; Active Task T-005 status |
| `TASK_BOARD.md` | T-005 redefined from placeholder → formal entry; status `todo → in_progress → review` |
| `AGENTS.md` | already includes Rule 16 (Value bias) — added in this same turn before T-005 began |

No other production code touched. No `index.html` UI changes — the constant bump is the only edit there.

## Hard guardrails touched

- **`meals.json` schema** — schema unchanged (no fields added/removed/renamed). Only cell values + the meta `version` field change.
- **Service-worker `VERSION` ↔ `index.html` `VERSION` invariant** — bumped together (`v1.10.22` → `v1.10.23`).
- **`MAX_USERS` etc.** — untouched.

## Workflow audit (every flow that reads s02 / m18 / meals.json)

1. **Library / search** — reads `meals.json` via fetch; renders meal cards. Both entries still appear with the same id, name, emoji, category. Macro/calorie display will show the corrected numbers. ✅
2. **`pick-meal` → `meal-detail`** — uses `findMeal(id)` → `meal.baseCalories` etc. for display + `addLogEntry`. Corrected values flow through cleanly. ✅
3. **`addLogEntry`** — entries logged before this fix have `snapshot: null` and a stable `mealId`; reading them post-fix calls `findMeal(mealId)` and gets the new values. **Behavior change:** old log entries for s02 referencing the old values will now display 195 cal instead of 165. This is the *intended* impact — accurate calorie tracking — but it does change historical aggregates by ~30 cal per old s02 log. Acceptable: the prior numbers were wrong; the corrected version is what should be there. Documented for transparency.
4. **`calcEntryTotals`** — uses `entry.snapshot || findMeal(entry.mealId)`. If a future log has `snapshot` (e.g., custom meal, scanned product, or in-app edit that captured snapshot), the snapshot wins; only `findMeal` paths see the correction. ✅ (The standard logging path doesn't snapshot for DB meals, so corrections do propagate.)
5. **`tools/audit-meals.js`** — re-running it should now show s02 + m18 in `pass` (diff <5%), not `fail`. ✅ (verified post-edit by PS parallel-impl)
6. **PWA cache** — `meals.json` is cached cache-first by `service-worker.js`. Without bumping `VERSION`, existing PWA users keep stale data. The version bump is what ships the fix to those users.
7. **Customizations on s02 + m18** — both meals have `customizations` arrays unchanged. Customization deltas remain valid (they're relative `calChange` etc., not absolute).
8. **Sister entries (s03, m19)** — untouched; still have their own audit results.

## Definition of Done (mirrored in TASK_BOARD)

- [ ] s02 `baseCalories` 165 → 195 in `meals.json`
- [ ] m18 `fat_g` 32 → 42 in `meals.json`
- [ ] `meals.json` `"version"` 1.10.9 → 1.10.10
- [ ] `service-worker.js` `VERSION` v1.10.22 → v1.10.23
- [ ] `index.html` `VERSION` v1.10.22 → v1.10.23
- [ ] PS audit re-run: s02 and m18 no longer in `FAIL` list (diff < 5%)
- [ ] Total entries still 375 (no entries added/removed)
- [ ] Hash check confirms only s02 + m18 entries changed (no unrelated edits)
- [ ] Read-only invariant on other entries (manual diff confirms)
- [ ] `PROJECT_STATE.md` Current Version updated to v1.10.23
- [ ] Spec, PROJECT_STATE, TASK_BOARD updated; AGENTS.md Rule 16 added (already in this turn)

## Test plan (manual)

1. Re-run `tools/.audit-meals-verify.ps1` (or equivalent PS mirror); confirm:
   - `total entries: 375`
   - `pass` count up by 2 (was 297, now 299)
   - `fail` count down by 2 (was 5, now 3 — beer + 2 black-coffee noise remain, expected)
2. `git diff meals.json` shows exactly 3 small hunks: s02 line, m18 line, version line.
3. `git diff service-worker.js` and `git diff index.html` show only the `VERSION` constant change.
4. Manually load the PWA in a fresh browser, confirm Library view renders s02 + m18 with new numbers.

## Rollback plan

`git revert <T-005 commit>` restores all three files atomically. Version bump unwinds (v1.10.23 → v1.10.22 in both places). Cached PWA users would receive the revert as another version bump (v1.10.24 if a quick fix-revert sequence) — clean rollback path.

## Open questions

None at write-time. If the corrected numbers feel wrong on review, revisit by going back to `in_progress` and choosing a different fix approach (e.g., for m18, dropping calories instead of raising fat).
