# T-013d.3 — BPC Date Range + Insight Window Controls

**Status:** approved (renumbered from user-supplied "T-013d.2" per ID-immutability rule · T-013d.2 was the Reports consolidation shipped as v1.10.37)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-013d.3 · T-013d.2 (done · v1.10.37) · T-013d (done · v1.10.35) · Rule 16

> **Refinement scope:** Add explicit date-range controls + window labels to BPC. Refactor `computeBodyProgressInsight` to accept optional `{ startDate, endDate }` without duplicating the classifier. Timeline + Compare filter by selected range. Reports uses Reports' existing range. All tone discipline from T-013d preserved.

---

## Why

User feedback: "Body Progress Center does not show what date range the insight is using, and there is no way to select the analysis period manually." Currently `computeBodyProgressInsight` uses a fixed 21-day window with no UI control or display. Users want:
1. To see exactly which dates feed the analysis
2. To shift the window (7d / 14d / 30d / 90d / all / custom) and watch the status change
3. Same affordance on Reports

## Non-goals (forbidden in this sub-task · audited at gate)

- ❌ T-014 features (ghost overlay · slider · auto-suggest · video frame · timer · `getUserMedia`)
- ❌ T-015 features (PIN · face crop · pose-match)
- ❌ Schema changes (NO new fields on `u.*`)
- ❌ Workout performance tracking schema
- ❌ Duplicate classifier — `classifyBodyProgressStatus` / `getInsightConfidence` / `computeBodyProgressInsight` stay at exactly 1 definition each
- ❌ Muscle gain confirmed / performance improvement / strength progress claims
- ❌ Shame/value-judgment language (ดีขึ้น / แย่ลง / ล้มเหลว / กล้ามขึ้นแน่นอน / etc.)
- ❌ Removing T-013d's `ไม่ได้แปลว่ากล้ามเพิ่ม` caveat — must still appear when possible-recomp triggers

## Design

### State shape

Add to root `state` object (persists via existing `persist()`; survives reloads + view navigation):

```js
state.bpcRange = {
  preset: '7d' | '14d' | '30d' | '90d' | 'all' | 'custom',  // default: '30d'
  startDate?: 'YYYY-MM-DD',  // only when preset === 'custom'
  endDate?: 'YYYY-MM-DD'     // only when preset === 'custom'
}
```

**Migration:** none required. Defensive read pattern: `const range = state.bpcRange || { preset: '30d' }`. On first run after upgrade, the field doesn't exist, code defaults to 30d, no crash.

**Reports' range:** Reports already has its own range selector (`state.tmp.rangeDays`, `state.tmp.rangeMode`, `state.tmp.customStart`, `state.tmp.customEnd`). Reports' insight uses Reports' range (NOT `state.bpcRange`). This keeps each surface's range independent — they're separate views with separate UX intents.

### Range → window resolution (new helper)

```js
function resolveInsightWindow(rangeSpec, user) {
  // rangeSpec = { preset, startDate?, endDate? }
  // user is needed for 'all' preset (earliest data point lookup)
  // returns { startDate, endDate, windowDays, label }
}
```

- `7d` → end = today, start = today − 6 → windowDays = 7
- `14d` / `30d` / `90d` → similar
- `all` → end = today, start = earliest of (first weight · first waist · first check-in · first activity), windowDays computed
- `custom` → end = clamp(rangeSpec.endDate, today), start = rangeSpec.startDate, windowDays computed
  - Validation: if start > end OR either missing → fall back to 30d with a non-crashing console warn + neutral UI error message
- Label is the human-readable Thai range, e.g. "30 วันล่าสุด" or "1 พ.ค. 2569 – 24 พ.ค. 2569"

### `computeBodyProgressInsight` refactor (no classifier duplication)

Current signature:
```js
computeBodyProgressInsight(user, endDate = todayKey(), windowDays = DEFAULT_INSIGHT_WINDOW_DAYS)
```

New signature (back-compat preserved):
```js
computeBodyProgressInsight(user, options = {})
// options = { startDate, endDate, windowDays }
//   - If startDate + endDate given → use them; windowDays = daysBetween(start,end) + 1
//   - If only endDate + windowDays given → existing behavior (start = end - (windowDays-1))
//   - If nothing given → 21-day from today (existing default)
```

The internal sub-helpers (`computeWeightTrend`, `computeWaistTrend`, etc.) stay identical signature — they already accept `(user, endDate, windowDays)`. The refactor only changes the top-level bundle to compute `endDate`/`windowDays` from `{ startDate, endDate }` first.

**Back-compat verification:** existing BPC home call `computeBodyProgressInsight(u)` continues to work. Existing Reports call (T-013d.2) `computeBodyProgressInsight(u)` continues to work. Both will be updated in this task to pass an `options` object, but the no-options path remains safe.

### BPC home: range controls

Add new section above the insight card (and below the privacy banner):

```
🗓️ ช่วงเวลาที่ดู
[ 7 วัน ] [ 14 วัน ] [ 30 วัน ✓ ] [ 90 วัน ] [ ทั้งหมด ] [ กำหนดเอง ]

(when preset === 'custom':)
[ตั้งแต่: <date>] [ถึง: <date>]
```

The active preset gets a filled button style; others are outline. Tapping a preset:
- Updates `state.bpcRange.preset` to that key (clearing `startDate`/`endDate` if not custom)
- Re-renders BPC (the insight card recomputes from new range)

The "custom" preset reveals two `<input type="date">` controls. Live input updates `state.bpcRange.startDate` / `endDate` and re-renders (debounced 200ms).

### Insight card: analysis window label + data counts

`renderInsightCard` extended to show, **above** the status badge:

```
🗓️ วิเคราะห์ช่วง: 1 พ.ค. 2569 – 24 พ.ค. 2569 (24 วัน)
📊 น้ำหนัก 21 จุด · รอบเอว 3 จุด · Check-in 2 ครั้ง
   · บันทึกอาหาร 18 วัน · Training 12 ครั้ง
```

These are derived from the already-existing bundle fields:
- `weightTrend.data_points` → "น้ำหนัก N จุด"
- `waistTrend.data_points` → "รอบเอว N จุด" (or "ไม่มีข้อมูล" if zero)
- `checkinSnap.checkin_count` → "Check-in N ครั้ง"
- `predictedLoss.days_logged` → "บันทึกอาหาร N วัน"
- `training.training_count` → "Training N ครั้ง"

The bundle also gets two new fields surfaced for the renderer:
- `window_start_date` (ISO key)
- `window_end_date` (ISO key)
- `window_label` (Thai human label)

`computeBodyProgressInsight` includes these in its return object.

### Timeline: filter by selected range

`renderBpcTimeline` already takes all check-ins. Add filtering:
- Resolve `state.bpcRange` → `{ startDate, endDate }`
- Filter `checkIns` to those where `date >= startDate && date <= endDate`
- Header label shows the range explicitly: "📅 Timeline · ช่วง 1 พ.ค. – 24 พ.ค. · N รายการ"
- Empty state when filtered list is empty: "ไม่มี check-in ในช่วงนี้ — ลองเลือกช่วงที่กว้างขึ้น หรือเริ่ม check-in ใหม่"

### Compare: default candidates from selected range

`nav-bpc-compare` handler currently calls `pickCompareDefaults(u.checkIns, 'start-latest')`. Change to:
```js
const inRange = (u.checkIns || []).filter(c => c.date >= startDate && c.date <= endDate);
const defaults = pickCompareDefaults(inRange, mode);
```

- If `inRange.length < 2` → show the existing "ต้องมี check-in อย่างน้อย 2 รายการ" empty state with extra hint mentioning the range
- "Custom mode" select dropdowns continue to show ALL check-ins (so user can hand-pick outside the range if they want); only the default pre-selection respects the range

### Reports: use Reports' own range

In Reports' insight call:
```js
// Reports range -> insight options
const opts = (t.rangeMode === 'custom' && t.customStart && t.customEnd)
  ? { startDate: t.customStart, endDate: t.customEnd }
  : { startDate: dateToKey(addDays(keyToDate(todayKey()), -((t.rangeDays || 30) - 1))), endDate: todayKey() };
const insight = computeBodyProgressInsight(u, opts);
```

The Reports insight card displays the same window-label + data-counts row as BPC.

### Not-Enough-Data copy adapted to range

When status === 'not-enough-data', the renderer shows a range-aware copy line:
- "ช่วง 7 วันนี้มีข้อมูลรอบเอวยังไม่พอ ลองเลือก 30 วัน หรือเพิ่มรอบเอวใน check-in ถัดไป"
- Dynamically built from `(insight.window_label)` + which fields are missing

The exact copy is parameterized; not hardcoded per-range.

## New helpers

```js
resolveInsightWindow(rangeSpec, user)
  → { startDate, endDate, windowDays, label }
  // Handles 7d/14d/30d/90d/all/custom presets · validates · defensive on bad input

formatInsightWindowLabel(startDate, endDate)
  → 'DD MMM YYYY – DD MMM YYYY' (Thai short month + Buddhist year)
```

## New handlers

```
set-bpc-range-preset  → updates state.bpcRange.preset · clears custom dates if preset !== 'custom' · render()
```

## New listener

```
input on #bpc-range-start / #bpc-range-end
  → debounced update of state.bpcRange.startDate / endDate · render()
```

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) `state.bpcRange` default init · (2) `resolveInsightWindow` + `formatInsightWindowLabel` helpers · (3) `computeBodyProgressInsight(user, options)` refactor (back-compat preserved) · (4) Bundle gets `window_start_date`/`window_end_date`/`window_label` fields · (5) `renderBpcRangeControls()` component · (6) `renderBodyProgressCenter` wires range controls + passes range to insight · (7) `renderInsightCard` shows window label + data counts · (8) `renderInsightCard` not-enough-data copy adapted to range · (9) `renderBpcTimeline` filters by range · (10) `nav-bpc-compare` defaults filtered by range · (11) Reports insight call updated to pass range options · (12) `set-bpc-range-preset` handler · (13) Custom-date input listener · (14) VERSION |
| `service-worker.js` | VERSION → v1.10.38 |
| `docs/specs/bpc-date-range-insight-window.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-013d.3 entry · status updates |

## Hard guardrails

- `classifyBodyProgressStatus` def = 1 · `getInsightConfidence` def = 1 · `computeBodyProgressInsight` def = 1 · `renderInsightCard` def = 1
- No new schema fields on `u.*`
- No new IndexedDB tables
- New `state.bpcRange` is a UI preference (no schema migration needed; defensive default `|| { preset: '30d' }`)
- VERSION sync between `index.html` and `service-worker.js`
- Data file hashes unchanged
- T-013d's existing "ไม่ได้แปลว่ากล้ามเพิ่ม" caveat remains exactly 1 occurrence in `renderInsightCard`'s possible-recomp branch
- T-013d.1's "ยังไม่ยืนยันว่ากล้ามเพิ่ม" caveat stays at 0 (consolidated by T-013d.2; not re-introduced here)
- Tone discipline: 0 occurrences of `muscle gain confirmed` / `performance improvement` / `strength progress` / `getting stronger` / `กล้ามขึ้น` / `แข็งแรงขึ้น` / `อ้วนขึ้น` / `แย่ลง` / `ผอมลง` / `ล้มเหลว` / `ทำผิด`

## Definition of Done

- [ ] `state.bpcRange` default `{ preset: '30d' }` (defensive read · no migration needed)
- [ ] `resolveInsightWindow(rangeSpec, user)` helper with 6 preset branches (7d / 14d / 30d / 90d / all / custom) + validation
- [ ] `formatInsightWindowLabel(start, end)` helper
- [ ] `computeBodyProgressInsight(user, options?)` accepts `{ startDate, endDate, windowDays }` · back-compat preserved (no-args call still works)
- [ ] Insight bundle includes `window_start_date`, `window_end_date`, `window_label`
- [ ] `renderBpcRangeControls()` component renders 6 chips + optional custom date pickers
- [ ] BPC home wires range controls above insight card
- [ ] `renderInsightCard` shows analysis window label + data-counts row
- [ ] `renderInsightCard` not-enough-data copy mentions selected range + suggests longer range / more data
- [ ] `renderBpcTimeline` filters check-ins by selected range · header shows range label · empty state when filtered list empty
- [ ] `nav-bpc-compare` defaults to check-ins within range · falls back to "ต้องมี check-in อย่างน้อย 2 รายการ" empty state when <2 in range
- [ ] Reports insight call passes `{ startDate, endDate }` derived from Reports' own range (rolling or custom)
- [ ] Reports insight card displays analysis window label (same shape as BPC)
- [ ] `set-bpc-range-preset` handler
- [ ] Input listener for `#bpc-range-start` / `#bpc-range-end`
- [ ] Existing single-source-of-truth preserved (each helper def = 1)
- [ ] Tone audit clean (all forbidden phrases = 0)
- [ ] T-013d's "ไม่ได้แปลว่ากล้ามเพิ่ม" caveat still present in possible-recomp branch
- [ ] VERSION v1.10.37 → v1.10.38 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## Test plan (manual)

1. **First-time user with no `state.bpcRange`** → BPC defaults to 30d, no crash
2. **Tap 7d / 14d / 30d / 90d / ทั้งหมด** → status badge + window label update accordingly; chip highlight moves
3. **Tap "กำหนดเอง"** → date inputs appear; pick start = 2024-01-01, end = 2024-12-31 → window label updates to that span
4. **Invalid custom range (start > end)** → neutral inline message + insight gracefully falls back to 30d default (no crash, no overclaim)
5. **Custom range with empty inputs** → defensive fallback to 30d
6. **Switch range from 30d to 7d on data-rich user** → status may legitimately change (e.g., 30d shows fat-loss-confirmed, 7d shows water-noise-likely); window label changes; counts shrink
7. **Range with very little data** → not-enough-data status + range-aware copy: "ช่วง X วันนี้มี... ลองเลือก..."
8. **Timeline with 30d range** → only check-ins in range shown; header shows range label
9. **Timeline with range that has 0 check-ins** → empty state with "ลองเลือกช่วงที่กว้างขึ้น" hint
10. **Compare from a range with <2 check-ins** → existing "ต้องมี 2 check-in" empty state with hint mentioning range
11. **Compare from range with ≥2 check-ins** → defaults to first + last check-in within range
12. **Reports tab range = 14d** → Reports insight window label = "14 วันล่าสุด"
13. **Reports tab custom range** → Reports insight window label = "DD MMM – DD MMM"
14. **BPC range = 30d, Reports range = 30d (same calendar window)** → both surfaces show identical status + confidence (gate #12)
15. **Existing users (with `u.weights`/`u.waist`/`u.checkIns`) load without `state.bpcRange`** → defensive default; first interaction creates the key
16. **Possible-Recomp under any range** → `ไม่ได้แปลว่ากล้ามเพิ่ม` caveat still renders
17. **Missing waist under any range** → confidence downgraded one tier (same as v1.10.35)
18. **Tone audit at gate** → all forbidden phrases = 0

## Rollback plan

`git revert <T-013d.3 commit>` removes range controls + window labels + range filtering. BPC reverts to the fixed 21-day window. Reports reverts to its independent fixed window. `state.bpcRange` becomes stale-but-harmless data (next reload just ignores it).

## Open questions (locked)

- **Should range selection on BPC affect Reports' range too?** Spec locks: **NO** — each surface has its own range state. BPC uses `state.bpcRange`; Reports uses `state.tmp.rangeDays`/`state.tmp.customStart`/`state.tmp.customEnd`. They're independent.
- **Should Compare custom-mode dropdowns respect range too?** Spec locks: **NO** — Custom dropdowns show ALL check-ins. Only the default pre-selection (when entering compare or switching to start-latest/prev-latest mode) is filtered by range. This lets users hand-pick across any date.
- **Should the 'all' preset have an upper cap?** Spec locks: **NO upper cap** — user with 2 years of data sees 2-year window. Performance: helpers are linear over data; trivial.
- **Should window label persist in localStorage so survives reloads?** Spec locks: **YES** — `state.bpcRange` lives at root `state` and gets persisted by the existing `persist()` mechanism. No new code needed. (Reports range already persists too.)
