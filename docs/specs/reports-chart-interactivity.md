# T-010 — Reports chart interactivity + burn-line per-day fix

**Status:** approved (user-directed scope)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-010 · T-009 (built the charts this task improves) · Rule 16

> **Re-scope note:** Originally T-010 was proposed as "Insight Engine" (interpretation layer). User pivoted to chart improvements first ("ทำให้กดที่กราฟแล้วอ่านค่าละเอียดได้หน่อย แล้วก็กราฟแคลที่เผาผลาญต้องเอาค่าที่เผาผลาญจริงที่บันทึกในวันนั้นๆมาด้วยสิ"). Insight Engine becomes T-011 (deferred).

---

## Goal

1. **Bug fix** — calorie chart's "burn target" line currently shows a single flat AVERAGE across the range. It should show the **actual per-day total burn** (TDEE + exercise that was logged that day), so users see the burn line spike on workout days.
2. **Interactive charts** — tap on any bar or line-point in the 3 new charts → show a detail box with exact values for that day.

## Non-goals (scope locked)

- ❌ Weight chart tap-to-read — kept as Phase 2 (different data shape, uses old `svgLineChart`)
- ❌ Insight engine (T-011, deferred)
- ❌ Chart styling overhaul
- ❌ Data schema changes

## Bug analysis — burn-line averaging

Current `svgDailyLineChart` code:

```js
// Target line — average of target values across logged days
if (targetFn) {
  const targets = points.map(p => p.target).filter(t => t != null);
  const avgTarget = targets.reduce(...) / targets.length;
  targetLine = `<line ... y1="${yT}" y2="${yT}" ... />`;  // ← FLAT LINE
}
```

The bug: `targetFn` is called per day to get values, but render code averages them and draws a flat line.

`d.totalBurn = TDEE + sumActivitiesBurn(userId, dateKey)` IS already per-day-accurate. So the data is correct; only the rendering is wrong.

**Fix:** render `targetFn` as a per-day path (line that varies), same shape as the data path but dashed.

## Interactive design

### Hit-area pattern

For each chart, add invisible column-wide `<rect>` overlays — full chart height — with `data-act="show-chart-point"`. Tap any column = tap that day. Larger hit area than the small bars/dots = mobile-friendly.

```svg
<g class="hit-area">
  <rect data-act="show-chart-point" data-chart-id="cal" data-day-idx="0"
        x="..." y="${padT}" width="${dayWidth}" height="${innerH}"
        fill="transparent"/>
  <!-- one per day -->
</g>
```

### State

`state.tmp.chartSelection = { chartId, idx } | null`

- Tap a new column → set
- Tap the same column → toggle off
- Change range → clear (idx may be stale)
- Leave Reports → `go()` resets `state.tmp`

### Handler

```js
'show-chart-point': (e, btn) => {
  const chartId = btn.dataset.chartId;
  const idx = Number(btn.dataset.dayIdx);
  const cur = state.tmp.chartSelection;
  if (cur && cur.chartId === chartId && cur.idx === idx) {
    state.tmp.chartSelection = null;
  } else {
    state.tmp.chartSelection = { chartId, idx };
  }
  render();
}
```

### Visual selection cue

- **Bar charts:** selected bar gets `stroke="#1f2937" stroke-width="2"`
- **Line charts:** selected point gets larger radius (4.5 vs 2.4) + outline ring

### Detail box rendering

After each chart, conditionally render a detail box if `chartSelection.chartId === thisChart`:

```html
<div class="chart-detail" style="...">
  📅 ${formatDateTH(day.key)} · ${chart-specific fields}
</div>
```

**Per-chart format:**

| Chart | Detail format |
|---|---|
| Calorie line (`cal`) | `📅 date · กิน X kcal · เผารวม Y kcal (TDEE Z + ออกกำลัง W) · ส่วนต่าง ±N` |
| Balance bars (`bal`) | `📅 date · ส่วนต่าง ±N kcal (deficit/surplus) · กิน X vs เผา Y` |
| Protein bars (`prot`) | `📅 date · โปรตีน X g (เป้า Y — ผ่าน/ไม่ถึง)` |

Unlogged days: show `📅 date · ไม่ได้บันทึก`.

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) Fix `svgDailyLineChart` target rendering — flat line → per-day path · (2) Both chart helpers add hit-area + selection support · (3) New `show-chart-point` handler · (4) `set-range-days` clears selection · (5) `renderReports` passes `chartId` + `selectedIdx`, renders detail boxes |
| `service-worker.js` | VERSION → v1.10.28 |
| `docs/specs/reports-chart-interactivity.md` | this spec (new) |
| `PROJECT_STATE.md` | Current Version + Latest Completed Work |
| `TASK_BOARD.md` | T-010 row (re-scoped from "insight engine") + T-011 placeholder for the deferred insight engine |

## Hard guardrails

- VERSION sync (sw + index)
- Existing `svgLineChart` (weight) untouched
- No data file changes

## Definition of Done

- [ ] **Bug fix:** burn-target line in calorie chart renders per-day (varies with actual logged exercise), not flat average
- [ ] All 3 new charts support tap-to-read: calorie line · balance bars · protein bars
- [ ] Hit-area rects render per day, transparent, on top of chart graphics
- [ ] Tap toggles selection (tap same column twice → clear)
- [ ] Selected element visually highlighted (border on bars, larger dot on line)
- [ ] Detail box renders below chart when a day is selected; format per chart-type table above
- [ ] Range change clears selection
- [ ] Unlogged day tap → "ไม่ได้บันทึก" detail
- [ ] VERSION v1.10.27 → v1.10.28
- [ ] PROJECT_STATE updated

## Test plan

1. Open Reports → tap a bar in energy balance chart → detail appears below
2. Tap same bar again → detail clears
3. Tap calorie line column → detail appears, dot highlighted
4. Tap protein bar → detail appears
5. Change range from 30 → 7 days → selection cleared
6. Workout-day verification: open user with logged exercise day → calorie chart burn line should spike on that day (not flat)

## Rollback plan

`git revert <T-010 commit>` removes the helper changes + handler + spec. Reports goes back to v1.10.27 state.

## Open questions

- **Weight chart tap-to-read?** Deferred to Phase 2 (different data shape).
- **Persist selection across navigation?** No — `go()` resets `state.tmp`. Selection is per-session.
- **Long-press for "compare 2 days"?** Out of scope; could be future.
