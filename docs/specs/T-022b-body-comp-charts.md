# T-022b — Body composition trend charts (BPC + Reports)

**Status:** approved
**Owner:** Execution Agent
**Depends on:** T-022a (v1.10.48 — the `muscleMass_kg?` / `bodyFat_pct?` fields this task visualizes)
**Related:** T-022c (Recomp Insight — separate) · T-017 (tappable-chart pattern this extends) · T-013d.3 (BPC range window)

> Read-only consumer of the T-022a data. **No writes** — does not touch `setWeight`, the `save-weight` handler, or the data model. Renders trends only.

---

## 1. Goal

Visualize **muscle mass (kg)** and **body-fat (%)** trends from the optional fields on `u.weights[]`, in **two places**:
1. **Body Progress Center** (`renderBodyProgressCenter`) — new trend card, uses the existing BPC range window.
2. **Reports** (`renderReports`) — additional tappable chart(s), extending the existing tappable-chart pattern, honoring the 7/14/30/90/custom range.

Presentation is **neutral trend only** — no deltas, no good/bad coloring (see §5).

## 2. Two series, two charts (not one)

Muscle mass is **kg**, body-fat is **%** — incompatible units. They **cannot** share a Y-axis without a dual-axis, and dual-axis line charts are inherently misleading (arbitrary scaling makes lines cross anywhere) — that violates the neutral-honesty invariant (§5). They are also **independent**: an entry may carry muscle, fat, both, or neither.

**Decision:** render **two separate charts** — one for muscle, one for fat — each independently gated and tappable. (The task brief says "an additional tappable chart"; this became two for the unit/independence reasons above. Flagged for review.)

## 3. Data selection + sparse handling (the crux)

Muscle/fat are optional per entry, so **gaps are the norm** — points may be days or weeks apart. Every series is derived by **filtering** the weight log down to entries that actually carry the field:

```js
// Reports (range = rStart..rEnd already computed at renderReports:6089)
const rangeMuscle = rangeWeights.filter(w => w.muscleMass_kg != null);
const rangeFat    = rangeWeights.filter(w => w.bodyFat_pct   != null);
// BPC (window from resolveInsightWindow(bpcRange, u))
const bpcMuscle = (u.weights||[]).filter(w => w.muscleMass_kg != null && w.date >= window.startDate && w.date <= window.endDate);
const bpcFat    = (u.weights||[]).filter(w => w.bodyFat_pct   != null && w.date >= window.startDate && w.date <= window.endDate);
```

**Why filter first (hard requirement):** `svgLineChart` reads `p[valueKey]`; an entry lacking the key yields `undefined` → `NaN` in the min/max scan → a broken chart. Filtering to field-bearing entries is what makes sparse data safe.

### Gap rendering
- `svgLineChart`'s X-axis is **date-proportional** (`daysBetween(series[0].date, pt.date)/spanDays`), so a reading three weeks later sits three weeks to the right — **the sparsity is visually legible**. Dots mark the actual readings; tap any dot for its exact date.
- **Gaps > 7 days render dashed + faded** (v1.10.49 update): a segment whose two endpoints are more than 7 days apart is drawn `stroke-dasharray="3,3" opacity="0.5"` instead of solid, so a long gap does **not** imply continuous data. 7 days is chosen to match the smoothing window — a gap wider than the window means the two points' 7-day windows don't overlap, i.e. genuinely disconnected. Implemented as an **opt-in** `svgLineChart` option `gapDashDays: 7`, passed only by the 4 body-comp charts; **existing weight/waist/cal/bal/prot charts pass nothing and render byte-identical** (default path unchanged).

### <2 points → neutral empty state (never a broken chart)
- A chart renders **only when its series has ≥ 2 points in range**.
- Visibility is gated on **ever having recorded that field** so non-BIA users never see empty scaffolding:
  - `everMuscle = (u.weights||[]).some(w => w.muscleMass_kg != null)` (same for `everFat`).
  - Card shows iff `everMuscle`. Inside: `rangeMuscle.length >= 2` → chart; else neutral empty text `ยังไม่มีข้อมูลมวลกล้ามในช่วงที่เลือก`.
- If the user never recorded a field → that chart/card is **omitted entirely** (no clutter).

## 4. Smoothing — mirror `effectiveBodyWeight`, NOT `movingAverage`

The task requires "same smoothing pattern as `effectiveBodyWeight` … do not fork a new smoothing approach." `effectiveBodyWeight` ([index.html:1203](../../index.html)) uses a **7-DAY trailing-DATE window** mean (`cutoff = latest − 6 days; mean of points ≥ cutoff`).

The existing weight/waist **charts** instead pass `movingAverage(series, 7[, key])` — an **index-based 7-POINT** mean. For *dense daily* weight data those coincide, so it's fine there. But on **sparse** body-comp data a 7-point mean would average readings **weeks apart**, lagging and distorting the trend — misleading, and a tone-invariant violation.

**Decision:** add one helper that is `effectiveBodyWeight`'s exact logic, **generalized** to (a) any `valueKey` and (b) evaluated **per-point** to draw a line. This is a *mirror*, not a new approach:

```js
// v1.10.49 — T-022b: 7-day trailing-DATE-window mean — the same smoothing effectiveBodyWeight
// (index.html:1203) uses, generalized per-point + per valueKey. NOT the index-based movingAverage:
// on sparse fields a 7-POINT mean blends readings weeks apart; a 7-DAY window smooths only
// same-week readings and degrades to raw points when data is sparse (the honest behavior).
// `series` MUST be pre-filtered to entries carrying `valueKey`. Returns [{date,[valueKey]:mean}] 1:1.
function dateWindowMean(series, valueKey, windowDays = 7) {
  const sorted = series.slice().sort((a, b) => a.date.localeCompare(b.date));
  return sorted.map(pt => {
    const cutoff = dateToKey(addDays(keyToDate(pt.date), -(windowDays - 1)));
    const win = sorted.filter(x => x.date >= cutoff && x.date <= pt.date);
    return { date: pt.date, [valueKey]: win.reduce((s, x) => s + x[valueKey], 0) / win.length };
  });
}
```

`svgLineChart` draws the faint raw line + the bold smoothed (`avgSeries`) line + dots. For sparse data the two coincide → visually one line through the dots; for dense data the bold line smooths. Identical presentation model to the weight chart.

## 5. Tone invariants (HARD requirements)
- **No deltas displayed.** No "เปลี่ยนแปลง ±X" row, no start-vs-latest framing that implies subtraction. (The existing weight/waist cards *do* show a colored change row — body-comp must **not** copy that part.)
- **No good/bad coloring.** No `var(--green)`/`var(--red)`, no ⬆️/⬇️ arrows, no "ผ่าน/ขาด". Chart line/dot colors are **valence-neutral** hues (muscle ≠ green; fat ≠ red): proposed muscle `#0891b2` (cyan-600), fat `#9333ea` (purple-600) — both distinct from weight(amber)/waist(indigo) and neither reads as good/bad.
- **Neutral trend presentation only.** Card shows: title, latest reading (neutral, uncolored), point-count, the chart. Tap a point → `📅 {date} · มวลกล้าม {v} กก. · เฉลี่ย 7 วัน {avg} กก.` (neutral; no color, no judgment). Mirrors `chartDetailWeight` minus any valence.
- Consistent with the whole BPC tone doctrine ("no color-coded good/bad on deltas").

## 6. Reports integration (extend, don't rewrite)

**Current Reports tappable charts = 5:** `cal`, `bal`, `prot` (daily) + `weight`, `waist` (line). This task **adds 2** (`muscle`, `fat`) → **7**. No change to the existing 5 beyond inserting the new cards.

- Placement: directly after the waist card (`renderReports` ~6292), before the Insight card.
- Reuse `svgLineChart` + the generic `show-chart-point` handler (already chart-agnostic — **no handler change**). New `chartId`s: `'muscle'`, `'fat'`.
- Add `selPointIdx`-driven detail helpers `chartDetailMuscle(idx)` / `chartDetailFat(idx)` alongside the existing ones (~6211-6228), reading `rangeMuscle`/`rangeFat` + `dateWindowMean`.
- Range: uses the already-computed `rStart`/`rEnd` (7/14/30/90/custom) — nothing new to thread.

## 7. BPC integration

- Extracted to a top-level helper **`renderBpcBodyCompCard(u, win)`** (returns `''` when no body-comp exists). Called in **both** branches of `renderBodyProgressCenter` — the has-check-ins branch (after the insight card) **and** the empty/no-check-ins branch (after the empty card, before the roadmap). So the card **always shows whenever the user has ≥1 body-comp reading** — a BIA user needs no photo check-in to see their trends (v1.10.49 update).
- Uses the `window` from `resolveInsightWindow(bpcRange, u)` → honors 7d/14d/30d/90d/all/custom. (In the empty branch the range chips aren't rendered, so it uses the default 30d window there — acceptable; range controls in the empty state are a possible follow-up.)
- Same two charts, same `dateWindowMean`, same neutral tone, `gapDashDays: 7`. `chartId`s `'bpcMuscle'`/`'bpcFat'` (distinct from Reports' ids; `state.tmp.chartSelection` is view-scoped so this is belt-and-suspenders).
- Tappable via the same `show-chart-point` handler.

## 8. DO NOT TOUCH (verified at gate)
- Existing Reports charts' logic — only the **new** chart entry points are added (existing 5 untouched; current count **5** stated above). `svgLineChart` gains one **opt-in** option (`gapDashDays`); with it unset the render path is byte-identical, so weight/waist/cal/bal/prot are visually unchanged (verified: default branch produces the original path strings).
- Recomp Insight card (T-022c) · `computeBodyProgressInsight` / `renderInsightCard` — untouched.
- `setWeight` / `save-weight` handler / T-022a data model — **read-only** consumer, no writes.
- `calcBMR` / `calcTDEE` / `calorieFloor` / `proteinTarget` / `goalZoneEval` / `effectiveBodyWeight` — untouched (grep unchanged).
- `movingAverage` — **not modified** (we add `dateWindowMean` beside it; existing callers unaffected).
- `meals.json` / `branded_products.json` / `tools/audit-meals.js` — byte-identical.

## 9. Affected files
| File | Change |
|---|---|
| `index.html` | +`dateWindowMean` helper · `svgLineChart` +opt-in `gapDashDays` (dashed gaps) · `renderReports` +2 chart cards +2 detail helpers +2 series filters · +`renderBpcBodyCompCard` helper (shown in both BPC branches) · VERSION |
| `service-worker.js` | VERSION → v1.10.49 |
| `docs/specs/T-022b-body-comp-charts.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-022b entry · Reports chart count 5 → 7 |

## 10. Definition of Done
- [ ] `dateWindowMean(series, valueKey, windowDays=7)` added — mirrors `effectiveBodyWeight`; `movingAverage` untouched
- [ ] Reports: `muscle` + `fat` tappable charts after waist; existing 5 charts unchanged; detail-on-tap neutral
- [ ] BPC: body-comp trend card (muscle + fat) using the BPC window
- [ ] Series filtered to field-bearing entries (sparse-safe); `<2` in range → neutral empty; never-recorded → omitted
- [ ] Charts gated ≥2 points; one-series-only handled (either may exist alone)
- [ ] Tone: no deltas, no good/bad color, no arrows; neutral hues (muscle≠green, fat≠red)
- [ ] `show-chart-point` handler reused unchanged
- [ ] Guardrails + `effectiveBodyWeight` + T-022a write path untouched (grep)
- [ ] VERSION v1.10.48 → v1.10.49 (both files) · data hashes unchanged
- [ ] PROJECT_STATE + TASK_BOARD updated (chart count 5→7)

## 11. Test plan (live, seeded, torn down — as in T-022a)
1. Entries with muscle+fat on scattered dates (e.g. day 0, 9, 25) → both charts render; dots at date-proportional positions; line connects across gaps ✓
2. Only muscle recorded (no fat ever) → muscle chart shows, fat card omitted ✓
3. Only 1 muscle point in range → neutral empty text, no broken chart ✓
4. Tap a point → neutral detail (date + value + 7-day-window value), no color; tap again → deselect ✓
5. Dense daily body-comp (7+ consecutive days) → smoothed line visibly smooths vs raw ✓
6. Sparse (points 2+ weeks apart) → smoothed ≈ raw (7-day windows each contain 1 point); no cross-week blending ✓
7. Range switch 7/14/30/90/custom (Reports) and 7d/14d/30d/90d/all/custom (BPC) → series re-filter correctly ✓
8. Old pre-T-022a entries (no fields) present → excluded from body-comp series; weight/waist charts unaffected ✓
9. No green/red anywhere on body-comp; existing weight/waist change-row coloring still intact (untouched) ✓
10. Grep: guardrails + effectiveBodyWeight + setWeight/save-weight byte-identical

## 12. Rollback
`git revert <T-022b commit>` removes `dateWindowMean`, the 2 Reports cards/helpers, and the BPC card. No data touched (read-only feature); T-022a fields remain intact.

## Open questions (locked unless user says otherwise)
- **One chart or two?** → **Two** (kg vs % incompatible axes; independent series). Confirmed at review.
- **Gap-breaking vs connect-the-dots?** → **Resolved (user, v1.10.49): dash + fade segments > 7 days** so gaps don't imply continuous data. Opt-in `gapDashDays` on body-comp charts only; existing charts untouched.
- **BPC card without any check-ins?** → **Resolved (user, v1.10.49): always show when the user has ≥1 body-comp reading**, independent of photo check-ins. Extracted to `renderBpcBodyCompCard`, called in both BPC branches.
- **Also add to `renderWeightLog` (📊 บันทึกร่างกาย)?** Out of scope — task named BPC + Reports only. Natural future addition since the inputs live there.
