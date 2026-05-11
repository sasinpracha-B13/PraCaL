# T-009 — Reports redesign with graphs + time range

**Status:** approved (user-directed scope; Path B locked)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-009 · Rule 16 (value bias — user-visible)

---

## Goal

Replace the month-only Reports page with a **range-based** view that includes 3 new daily-trend charts (plus the existing weight chart extended to the range). User can pick from `7 / 14 / 30 / 90 วัน` (default 30). Removes the month-nav buttons.

## Non-goals (scope locked by user)

- ❌ Custom date picker (Phase 2)
- ❌ Logging heatmap (Phase 2)
- ❌ Period comparison ("this 30d vs prev 30d") (Phase 2)
- ❌ New schema fields
- ❌ Touching `meals.json` / `branded_products.json` (this is code-only)

## Layout (new)

```
┌─ Header ──────────────────────────────┐
│ 📊 รายงาน              [⚖️] [📅]      │
├───────────────────────────────────────┤
│ [7][14][30][90]  ← range segmented    │
├───────────────────────────────────────┤
│ ⚖️ น้ำหนัก                            │
│   stats + [line chart — existing]      │
├───────────────────────────────────────┤
│ 🔥 แคลอรี่ ${range} วัน               │
│   stats + status banner (goal-aware)   │
│   [LINE CHART: intake + TDEE target]   │  ← new chart 1
│   [BAR CHART: energy balance per day]  │  ← new chart 2 (color-coded)
├───────────────────────────────────────┤
│ 🥩 โปรตีน                             │
│   stats                                │
│   [BAR CHART: daily protein + target]  │  ← new chart 3
├───────────────────────────────────────┤
│ 🍚 คาร์บ & น้ำตาล (existing stats)    │
├───────────────────────────────────────┤
│ 📝 การบันทึก (existing stats)         │
├───────────────────────────────────────┤
│ 🎯 คำแนะนำ (existing)                 │
└───────────────────────────────────────┘
```

## New helpers (in `index.html`)

### `rangeAggregate(userId, days = 30)`

Mirror of existing `monthAggregate` but driven by `lastNDaysKeys(days)` instead of `monthKeys(year, monthIdx)`. Returns identical shape so the recommendation logic and existing stat rendering keep working:

```js
{
  days: [{ key, entries, totals, logged, exerciseBurn, totalBurn, energyDelta, goalDelta }],
  avg: { calories, protein_g, carbs_g, fat_g, sugar_g, exerciseBurn, energyDelta, goalDelta },
  loggedCount, totalDays, avgMeals, streak
}
```

Effort: ~25 lines (logic-copy from monthAggregate).

### `svgDailyLineChart(days, opts)`

```js
function svgDailyLineChart(days, {
  valueFn,        // (day) → number (e.g., d => d.totals.calories)
  targetFn,       // (day) → number, optional — dashed line target
  color = '#d97706',
  targetColor = '#9ca3af',
  w = 320, h = 140
}) { ... }
```

Mirrors `svgLineChart`'s padding + grid pattern, but generic. Skips `!day.logged` entries (renders gap rather than zero, so unlogged days don't drag the line down).

### `svgDailyBarChart(days, opts)`

```js
function svgDailyBarChart(days, {
  valueFn,        // (day) → number (can be negative for energy balance)
  colorFn,        // (value) → color string
  targetLine,     // optional number — solid horizontal line
  yMin, yMax,     // optional auto-fit
  zeroLine = true, // show y=0 line (for ± value charts)
  w = 320, h = 140
}) { ... }
```

Handles negative values for energy balance (deficit = below zero line, surplus = above).

## State changes

- `state.tmp.rangeDays` — number, default 30 when entering reports view
- Old `state.tmp.year` / `state.tmp.monthIdx` removed from Reports flow (kept elsewhere if any other view uses them — grep first)

## New handler

```js
'set-range-days': (e, btn) => {
  const v = Number(btn.dataset.v);
  if ([7, 14, 30, 90].includes(v)) state.tmp.rangeDays = v;
  render();
}
```

## Affected files

| File | Change |
|---|---|
| `index.html` | +3 helpers (`rangeAggregate`, `svgDailyLineChart`, `svgDailyBarChart`); refactor `renderReports`; remove `month-prev`/`month-next` handlers; +`set-range-days` handler; VERSION → v1.10.27 |
| `service-worker.js` | VERSION → v1.10.27 |
| `docs/specs/reports-redesign-graphs.md` | this spec (new) |
| `PROJECT_STATE.md` | Current Version + Latest Completed Work |
| `TASK_BOARD.md` | T-009 row + transitions |

**No data changes** — `meals.json`, `branded_products.json` untouched. No data-version bump.

## Hard guardrails

- `monthAggregate` not deleted (other views may use it — grep first; if no callers, can deprecate but not in this task)
- VERSION sync (sw + index)
- Existing svgLineChart unchanged (weight chart keeps using it)

## Workflow audit

1. **Existing weight chart** — still uses `svgLineChart`; just needs data source change (weights from range instead of month). ✅
2. **Recommendations logic** — uses `agg.avg.protein_g`, `agg.avg.sugar_g`, `agg.loggedCount`, `agg.totalDays`, `agg.streak`. All present in `rangeAggregate` output (same shape as `monthAggregate`). ✅
3. **Other views using `monthAggregate`** — grep before delete; T-009 doesn't delete `monthAggregate`, just stops using it in Reports.
4. **Month nav state (`state.tmp.year`, `state.tmp.monthIdx`)** — grep all uses; only Reports uses them (verified during execution). Remove from Reports init.
5. **CSV export uses `buildCSV(userId, startKey, endKey)`** — already range-based, unaffected.

## Definition of Done

- [ ] `rangeAggregate(userId, days)` helper exists, returns shape identical to `monthAggregate`
- [ ] `svgDailyLineChart` + `svgDailyBarChart` helpers added with documented signatures
- [ ] Range segmented control `[7][14][30][90]` renders at top of Reports
- [ ] Default range = 30 days when entering view
- [ ] Month nav (`← prev / next →`) removed
- [ ] Calorie line chart renders with target line (TDEE + avg exercise)
- [ ] Energy balance bar chart renders with color-coded bars (green deficit / amber surplus) + zero line
- [ ] Protein bar chart renders with target line
- [ ] Weight chart preserved (still uses `svgLineChart`), data source switched to range
- [ ] Stats rows (calories/protein/carbs/sugar/logging) use range values; copy updated from "เดือนนี้" → "ในช่วง N วัน"
- [ ] Recommendations logic still fires correctly with range aggregate
- [ ] Empty state when no logs in range
- [ ] VERSION v1.10.26 → v1.10.27 (sw + index)
- [ ] PROJECT_STATE.md + TASK_BOARD.md updated

## Test plan

1. **Load reports view** → default 30 days, all 4 charts render with real data
2. **Tap [7]** → all charts re-render with 7-day window
3. **Tap [90]** → all charts re-render with 90-day window
4. **No-data state** — fresh install with no logs; reports shows empty message; no chart crashes
5. **Partial data** — only 3 days logged in range; charts show gaps for unlogged days (line chart) or skip bars (bar chart)
6. **VERSION grep** — both files show v1.10.27
7. **Other views still work** — Dashboard, Library, Suggester, Meal Plan unaffected (sanity tap)

## Rollback plan

`git revert <T-009 commit>` restores month-nav. The 3 new helpers + handler get removed cleanly.

## Open questions

- **Month nav restored as a side panel?** No — user said "ลบ month nav". History view (📅 button in header) already covers per-day drill-down.
- **What about year-over-year comparison?** Phase 2.
- **Save user's preferred range?** Phase 2 (could persist `state.tmp.rangeDays` to user profile).
