# T-017 — Extend chart tap-to-read to Weight + Waist charts in Reports

**Status:** approved
**Owner:** Execution Agent
**Related:** T-010 (Reports chart interactivity · v1.10.28 · added tap-to-read to 3 daily charts) · T-012 (waist chart added)

---

## 1. Goal

User feedback: "ในหน้ารายงานกราฟแต่ละอัน ทำให้กดจิ้มดูและขึ้น ค่าตัวเลขและวันที่ที่วัดค่านั้นด้วย" (Make every Reports graph tappable to show value + measurement date).

Currently in Reports (v1.10.42):
- ✅ Calorie chart (T-010) — has tap-to-read
- ✅ Balance chart (T-010) — has tap-to-read
- ✅ Protein chart (T-010) — has tap-to-read
- ❌ **Weight chart** (T-009/T-012) — **NO tap-to-read** (uses `svgLineChart`, not `svgDailyLineChart`)
- ❌ **Waist chart** (T-012) — **NO tap-to-read** (uses `svgLineChart`)

This task extends the T-010 tap-to-read pattern to the 2 remaining charts.

## 2. Non-goals

- ❌ Schema changes to `u.weights` / `u.waist`
- ❌ Charts outside Reports (BPC charts are scope of T-013 series)
- ❌ Changes to existing 3 tap-to-read charts (no regression)
- ❌ Chart styling overhaul — only adding interactivity
- ❌ Adding tap-to-read to body-log view's weight/waist charts (separate task if requested)

## 3. Design

### `svgLineChart` extension (backward compatible)

Currently `svgLineChart(series, avgSeries, w, h, opts)` renders dots but has no hit areas. Add optional `opts.chartId` + `opts.selectedIdx` (mirrors `svgDailyLineChart`):

- When `chartId` provided → emit per-point hit-area `<rect>` with `data-act="show-chart-point" data-chart-id="..." data-day-idx="i"`
- When `selectedIdx === i` → render that dot with ring + larger radius (matches T-010 visual)
- Existing call sites that don't pass `chartId` continue to work identically (no hit areas, no selection ring)

### Two new detail-box renderers

```js
function chartDetailWeight(point, avgPoint) {
  // Shows: 📅 {date} · น้ำหนัก 70.5 kg · เฉลี่ย 7 วัน 70.8 kg (if avgPoint)
}
function chartDetailWaist(point, avgPoint) {
  // Shows: 📅 {date} · รอบเอว 82.0 cm · เฉลี่ย 7 วัน 82.3 cm (if avgPoint)
}
```

### Reports view wiring

Update existing 2 chart sites to:
1. Pass `chartId: 'weight'` / `'waist'` and `selectedIdx`
2. Render detail box below chart via the new helpers
3. Update hint text from generic "กราฟ" mention to "แตะจุดเพื่อดูค่า" (consistent with the 3 existing charts)

### Handler / listener — NO changes needed

- `show-chart-point` already handles arbitrary `chartId` (just stores `{chartId, idx}`); no chart-type-specific logic
- `set-range-days` / `set-range-mode` / custom-date input listener already clear `state.tmp.chartSelection` — same clear-on-range-change behavior carries through

## 4. Affected files

| File | Change |
|---|---|
| `index.html` | (1) `svgLineChart` accepts `chartId` + `selectedIdx` in opts · (2) `chartDetailWeight` + `chartDetailWaist` helpers · (3) Reports view wires `chartId`/`selectedIdx` + renders detail boxes · (4) Hint text updated to "แตะจุดเพื่อดูค่า" · (5) VERSION |
| `service-worker.js` | VERSION → v1.10.43 |
| `docs/specs/reports-weight-waist-chart-interactivity.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-017 entry |

## 5. Hard guardrails

- No data file changes (`meals.json`, `branded_products.json`, `audit-meals.js` byte-identical)
- VERSION sync between `index.html` and `service-worker.js`
- Existing 3 chart tap-to-read flows unchanged (no regression)
- Backward-compat: `svgLineChart` calls WITHOUT chartId render identically to today
- `state.tmp.chartSelection` shape unchanged: `{chartId, idx}` — accepts 'weight' / 'waist' as new chartId values
- No new handlers — reuses existing `show-chart-point`
- No new event listeners

## 6. Definition of Done

- [ ] `svgLineChart` opts gain `chartId` + `selectedIdx` (backward-compatible)
- [ ] Hit-area `<rect>` emitted per series point when `chartId` provided
- [ ] Selected point renders with ring + larger radius (matches T-010 visual)
- [ ] `chartDetailWeight(point, avgPoint)` helper added
- [ ] `chartDetailWaist(point, avgPoint)` helper added
- [ ] Weight chart call site: `chartId: 'weight'`, `selectedIdx` from chartSelection, detail box below
- [ ] Waist chart call site: `chartId: 'waist'`, same wiring
- [ ] Hint text added "แตะจุดเพื่อดูค่า"
- [ ] No regression on existing 3 charts (calorie / balance / protein)
- [ ] VERSION v1.10.42 → v1.10.43 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## 7. Test plan

1. Reports with 30d range + weight history → tap a weight dot → detail box shows date + weight + 7-day avg
2. Tap same dot again → detail clears
3. Tap a different dot → detail updates to new point
4. Switch range 30d→7d → selection clears (existing behavior preserved)
5. Switch to custom date range → selection clears
6. Same flow on waist chart
7. Existing calorie/balance/protein tap-to-read still works (regression check)
8. Tap area is generous enough for finger tap on mobile (column-wide hit area like T-010)

## 8. Rollback plan

`git revert <T-017 commit>` removes the chartId/selectedIdx parameters and the 2 detail renderers. Existing 3 chart interactivity untouched.

## Open questions

- **Hit-area density**: weight history can be sparse (e.g., 7 logged points over 30 days). Hit area per-point is fine (gaps between points aren't tappable). Different from daily charts where every-day hit-area makes sense.
- **Moving-average tap?**: user taps a data point (raw), not the 7-day average line. Detail shows the avg value alongside the raw for context.
