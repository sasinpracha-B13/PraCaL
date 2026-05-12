# T-011 — Custom date range for Reports

**Status:** approved (user-directed scope · Phase 2 of T-009 picked up)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-011 · T-009 spec §"Open questions" deferred this · Rule 16

> **Re-scope note:** T-011 was previously a placeholder for "Insight Engine" (proposed at end of T-009 review). User pivoted to custom date range first. Insight Engine → T-012 placeholder.

---

## Goal

Add **custom date range** option to Reports so user can pick arbitrary start/end dates instead of being limited to 7/14/30/90 rolling windows.

## Non-goals

- ❌ Calendar widget overhaul (use native `<input type="date">`)
- ❌ Period comparison ("this 30d vs prev 30d") — separate task
- ❌ Save preset custom ranges
- ❌ Weight chart custom range (already follows rangeWeights, automatically benefits — but no extra polish in this task)

## UX

### Segmented control gets a 5th button

```
[7 วัน] [14 วัน] [30 วัน ✓] [90 วัน] [📅 กำหนดเอง]
```

Tap `[📅 กำหนดเอง]`:
- `rangeMode → 'custom'`
- Show date-range row below segmented:
  ```
  ตั้งแต่ [📅 2026-04-15]  ถึง  [📅 2026-05-04]
  ```
- Re-render reports with that range

Tap one of the rolling buttons (7/14/30/90):
- `rangeMode → 'rolling'`
- Hide date inputs
- Re-render with rolling window

Switch modes preserves the other mode's state — toggle back/forth without losing setup.

### Date input behavior

- Native `<input type="date">` (works on iOS/Android/desktop)
- Two inputs: `range-start` + `range-end`
- Live update via input listener (debounced 200ms)
- Validation:
  - If `start > end` → silently swap on render
  - If `end > today` → clamp to today
  - Same-day allowed (1-day report)
- No upper limit on start date (could go back to first log entry)

### Label

| Mode | Label format |
|---|---|
| Rolling | `${N} วันล่าสุด` (unchanged) |
| Custom | `${startTH} – ${endTH}` (e.g., "15 เม.ย. – 4 พ.ค.") |

## Architecture

### State

```
state.tmp.rangeMode     = 'rolling' | 'custom'    // default 'rolling'
state.tmp.rangeDays     = 7 | 14 | 30 | 90        // active when rolling
state.tmp.customStart   = 'YYYY-MM-DD'            // active when custom
state.tmp.customEnd     = 'YYYY-MM-DD'            // active when custom
```

First time `[📅 กำหนดเอง]` tapped: pre-fill customStart/End from current rolling range (smooth transition — user sees same data initially).

Range change clears `chartSelection` (already done in T-010; extends to mode change too).

### New helper: `keysBetween(startKey, endKey)`

Produces `[key₀, key₁, ...]` between two date keys inclusive. Mirrors `lastNDaysKeys` style.

### Refactor `rangeAggregate` signature

```js
// Before: rangeAggregate(userId, days)
// After:  rangeAggregate(userId, rangeSpec)
//   rangeSpec = number              → rolling lastN
//   rangeSpec = { start, end }      → custom range
//   rangeSpec = undefined/null      → default 30 rolling
```

Internal: extract `aggregateOverKeys(userId, keys)` from the existing body; both branches call it. **No call-site outside Reports**, so signature change is safe — but I still pass through numbers to keep existing internal compat.

### New handler

```js
'set-range-mode': (e, btn) => {
  const mode = btn.dataset.mode;
  if (mode === 'custom') {
    state.tmp.rangeMode = 'custom';
    // Pre-fill if not set
    if (!state.tmp.customStart || !state.tmp.customEnd) {
      const days = state.tmp.rangeDays || 30;
      const today = todayKey();
      const start = dateToKey(addDays(keyToDate(today), -(days - 1)));
      state.tmp.customStart = start;
      state.tmp.customEnd = today;
    }
    state.tmp.chartSelection = null;  // stale
  }
  render();
}
```

`set-range-days` (existing) also sets `rangeMode = 'rolling'` to handle the inverse switch.

### New input listener (debounced)

```js
if (e.target.id === 'range-start' || e.target.id === 'range-end') {
  const field = e.target.id === 'range-start' ? 'customStart' : 'customEnd';
  state.tmp[field] = e.target.value;
  state.tmp.chartSelection = null;
  clearTimeout(render._t);
  render._t = setTimeout(render, 200);
}
```

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) Add `keysBetween` helper · (2) Refactor `rangeAggregate` to accept rangeSpec · (3) Update `renderReports` (5th segmented button + date inputs + label + agg call) · (4) New handler `set-range-mode` · (5) Update `set-range-days` to set mode='rolling' · (6) Input listener for date fields · (7) VERSION → v1.10.29 |
| `service-worker.js` | VERSION → v1.10.29 |
| `docs/specs/reports-custom-range.md` | this spec (new) |
| `PROJECT_STATE.md` | Current Version + Latest Completed Work |
| `TASK_BOARD.md` | T-011 row (re-scoped) + T-012 placeholder for Insight Engine |

## Hard guardrails

- VERSION sync (sw + index)
- `rangeAggregate` API change is backward-compatible (still accepts a number)
- No data file changes (`meals.json` / `branded_products.json` untouched)

## Workflow audit

1. **`renderReports` aggregate call** — already the only `rangeAggregate` caller. Passes `rangeDays` (number) today; will pass `{ start, end }` in custom mode.
2. **Charts (`svgDailyLineChart` / `svgDailyBarChart`)** — consume `agg.days`. Works with any length. ✅
3. **Stats rendering** — all uses `agg.avg` / `agg.loggedCount` etc.; agnostic to day count. ✅
4. **Weight chart** — uses `rangeWeights` filtered by `rStart`/`rEnd`. Already range-driven; benefits automatically. ✅
5. **Recommendations** — checks `agg.loggedCount / agg.totalDays`. For a 1-day custom range with no logs, `0/1 = 0` → triggers "บันทึกให้สม่ำเสมอขึ้น" prematurely? Edge case — could add a `if (totalDays >= 7)` guard but out of scope; not a regression (rolling 7 already has this).
6. **Chart selection state** — cleared on mode change + date change. ✅
7. **CSV export** — uses its own `buildCSV(userId, startKey, endKey)` API; unrelated. ✅
8. **Dashboard, Library, Suggester, Planner** — unaffected.

## Definition of Done

- [ ] `keysBetween(startKey, endKey)` helper added (small, ~8 lines)
- [ ] `rangeAggregate` accepts number (rolling) or `{start, end}` (custom)
- [ ] 5th segmented button `[📅 กำหนดเอง]` renders next to 7/14/30/90
- [ ] Tap `[กำหนดเอง]` → mode flips, date inputs appear pre-filled
- [ ] Tap any of 7/14/30/90 → mode flips to rolling, date inputs hidden
- [ ] Date inputs: native `<input type="date">`, live-update debounced 200ms
- [ ] Auto-swap if start > end; clamp end to today
- [ ] Range label: rolling = "N วันล่าสุด" · custom = "${startTH} – ${endTH}"
- [ ] Chart selection (T-010) clears on mode/date change
- [ ] All 3 daily charts + weight chart adapt to custom range automatically
- [ ] VERSION v1.10.28 → v1.10.29 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## Test plan

1. Open Reports → default rolling 30 days unchanged behavior
2. Tap `[📅 กำหนดเอง]` → date inputs appear pre-filled with today-29 to today
3. Change start date to 2 weeks ago → charts re-render
4. Change end date to 1 week ago → charts re-render with that window
5. Swap start/end backwards → auto-fixed
6. Set end > today → clamped (or shown clamped on next render)
7. Tap `[7 วัน]` → custom inputs hide, rolling 7d view
8. Tap `[📅 กำหนดเอง]` again → custom inputs come back with previous start/end preserved
9. Selection in a chart, then change date → selection clears
10. VERSION grep both files v1.10.29
11. Data file hashes unchanged

## Rollback plan

`git revert <T-011 commit>` removes the helper + handlers + UI changes cleanly. Reports goes back to T-010 state.

## Open questions

- **Should "เดือนนี้" / "เดือนก่อน" preset shortcuts come back?** Out of scope — user removed them in T-009. Could be revisited in a "Reports presets" task.
- **Limit max range?** No cap in Phase 1; very long ranges might be slow with very dense logs, but realistic data sizes are fine.
