# T-012 — Waist circumference tracking

**Status:** approved (user picked Option A from "waist + photos" brainstorm — execute waist first)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-012 · T-013/T-014 (progress photos) queued next · Rule 16

> **Re-scope note:** T-012 was Insight Engine placeholder; user picked waist tracking as quick body-composition win. Insight Engine pushed to T-015 (4th deferral — pattern: user prioritizes concrete metrics first).

---

## Goal

Add **waist circumference (รอบเอว, cm)** as a tracked metric alongside weight. Better body-composition signal than weight alone (especially for recomp / visceral-fat awareness). Reuses existing weight-log pattern.

## Non-goals (scope locked)

- ❌ Progress photos (T-013/T-014)
- ❌ Other body measurements (chest, hip, arm, etc.) — could extend later
- ❌ Body-fat % calculation (would need additional measurements + formula)
- ❌ Onboarding asks for waist (kept optional throughout)

## Schema

New per-user array (independent of weight):

```js
u.waist = [
  { date: 'YYYY-MM-DD', waist_cm: 82 },
  ...
]
```

Decision: **independent array** (not paired with weight entries) — user can log either alone. If they log both on the same day, two entries (one per array, same date).

Migration: existing users get `u.waist = []` on next load (added to the existing schema migration block alongside `u.weights`, `u.activities`, etc.).

## Helpers to add

```js
// Waist log mutations (mirror weight pattern)
setWaist(user, key, cm)
removeWaist(user, key)
sortedWaist(user, days = null)
latestWaist(user)
waistChangeOver(user, days)
waistTrend(user, days = 14)  // slope from linear regression

// Body-composition signal
waistHeightRatio(u, waist_cm)        // waist_cm / u.height
waistHealthFlag(u, waist_cm)          // {color, text} based on ratio + WHO cutoffs
```

## Refactor — generalize existing helpers

3 weight helpers hardcode `weight_kg`. Make them accept an optional `valueKey` (backward-compatible, defaults to `weight_kg`):

- `movingAverage(series, window, valueKey?)`
- `linearRegression(series, valueKey?)`
- `svgLineChart(series, avgSeries, w?, h?, opts?)` — `opts.valueKey`, `opts.yLabel`

Existing callers (Reports weight chart) pass nothing → defaults → unchanged behavior. New waist callers pass `valueKey: 'waist_cm'`.

## UI changes

### `renderWeightLog` view (extended)

Header rename: ⚖️ บันทึกน้ำหนัก → 📊 บันทึกร่างกาย (more inclusive)

Input card gains a 2nd field:
```
น้ำหนักวันนี้ (กก.) [70.2]
รอบเอว (ซม. — ถ้ามี)  [82.0]
[ บันทึก ]
```

Save handler logic:
- If both valid → save both to respective arrays (same date)
- If only weight valid → save weight only
- If only waist valid → save waist only
- If neither → error

After save, both fields clear.

New chart section (shows only if user has ≥2 waist entries):
```
📐 รอบเอว 30 วันล่าสุด
[svg line chart]
ล่าสุด: 82.0 cm
เปลี่ยน 30 วัน: -1.5 cm ⬇️
waist:height ratio: 0.48 ✅ สุขภาพดี
```

New history list section: most-recent N waist entries with delete buttons (mirror weight history).

### `renderReports` view (extended)

After the existing weight stat-card, add new waist stat-card (only if user has waist data in the active range):

```
📐 รอบเอว (30 วันล่าสุด)
ล่าสุด: 82.0 cm
เริ่ม: 84.0 cm
เปลี่ยน: -2.0 cm ⬇️
[line chart]
ratio: 0.48 ✅ สุขภาพดี
```

## Health signal — waist:height ratio

WHO-based thresholds (generic adult):

| ratio | flag color | label |
|---|---|---|
| < 0.4 | amber | เอวเล็กผิดปกติ (consult doctor) |
| 0.4 – 0.5 | green | ✅ สุขภาพดี |
| 0.5 – 0.55 | amber | ⚠️ ความเสี่ยงเพิ่ม |
| 0.55 – 0.6 | red | ⚠️ ความเสี่ยงสูง |
| > 0.6 | red | 🔴 ความเสี่ยงสูงมาก |

Plus Asian-specific cutoff hint (secondary):
- Male: waist > 90cm = abdominal obesity
- Female: waist > 80cm

Shown if user has gender set and waist exceeds the cutoff.

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) Generalize movingAverage/linearRegression/svgLineChart with optional valueKey · (2) Add 8 waist helpers (set/remove/sorted/latest/change/trend + 2 health) · (3) Schema migration `u.waist = []` · (4) renderWeightLog adds 2nd input + chart + history · (5) renderReports adds waist stat-card · (6) save-weight handler extended to also save waist · (7) New delete-waist handler · (8) VERSION → v1.10.30 |
| `service-worker.js` | VERSION → v1.10.30 |
| `docs/specs/waist-tracking.md` | this spec (new) |
| `PROJECT_STATE.md` | Current Version + Latest Completed Work |
| `TASK_BOARD.md` | T-012 row + T-015 placeholder (Insight Engine, 4th deferral) |

## Hard guardrails

- `u.height` required for waist:height ratio — if missing, skip ratio display
- VERSION sync
- Backward compat: refactored helpers still work with all existing callers (no signature breakage)
- No data file changes (`meals.json` / `branded_products.json` untouched)

## Workflow audit

1. **Existing weight chart in Reports** — uses `svgLineChart(rangeWeights, movingAverage(rangeWeights, 7))`. New optional `opts` param at position 5; existing call works unchanged. ✅
2. **Existing weight chart in Weight Log** — same pattern, unchanged. ✅
3. **`linearRegression` callers** — only `weightTrend(user, days)` uses it; pass new param via that helper. ✅
4. **`movingAverage` callers** — Reports weight + Weight Log weight. Both keep using default. ✅
5. **`setWeight` users** — only `save-weight` handler. Extended to also call `setWaist` when waist input valid. ✅
6. **Schema migration** — new `u.waist = []` block in existing migration loop. ✅
7. **`u.height` missing** — older users may have `u.height = 0` or `null`. Ratio calc returns null → no flag displayed. ✅
8. **Dashboard, Library, Suggester, Planner** — unaffected (don't reference waist).

## Definition of Done

- [ ] `u.waist = []` initialized via schema migration for all users
- [ ] 6 waist mutation helpers + 2 health helpers added
- [ ] `movingAverage` / `linearRegression` / `svgLineChart` accept optional `valueKey` (defaults preserve existing behavior)
- [ ] Weight-log view: 2nd input "รอบเอว (ซม.)" · save handler captures both · either-or-both saving works
- [ ] Weight-log view: waist chart appears with ≥2 waist entries · health flag + ratio shown
- [ ] Weight-log view: waist history list with delete buttons
- [ ] Reports view: new waist stat-card (only when range has waist data) with chart + change + ratio + flag
- [ ] Existing weight chart in both views still renders identically (refactor backward-compat verified)
- [ ] VERSION v1.10.29 → v1.10.30
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## Test plan

1. Fresh install → no waist data → no waist sections render
2. Enter weight + waist → both saved, both charts appear after 2+ entries each
3. Enter only weight → only weight saved · no waist chart
4. Enter only waist → only waist saved · no weight chart entry today
5. Delete waist entry → disappears from list + chart
6. Reports → custom date range → waist chart filters correctly
7. Reports → 7-day range with no waist data in range → waist card hidden
8. Waist:height ratio displayed correctly for u.height = 170, waist = 85 → 0.5 (green amber edge)
9. VERSION grep both files v1.10.30
10. Existing weight chart unchanged visually (regression test)

## Rollback plan

`git revert <T-012 commit>` removes helpers + UI + schema-migration line. Existing user data (`u.weights`) untouched.  `u.waist` arrays remain in user data but are inert after revert.

## Open questions

- **Should onboarding ask for initial waist?** No — kept optional throughout. User adds when ready.
- **What about goal for waist?** No goal tracking in this task — could be Phase 2 (waist target). Out of scope.
