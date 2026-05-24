# T-013c — Timeline + Viewer + Side-by-side Compare

**Status:** approved (3 of 4 split sub-tasks for BPC Phase 1 MVP)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-013c · T-013a (done · v1.10.31) · T-013b (done · v1.10.32) · T-013b.1 (done · v1.10.33)

> **Split discipline:** This task wires the *viewer + timeline + simple side-by-side compare* only. Insight/status logic → T-013d. Ghost overlay / slider / video frame / auto-suggest → Phase 2 (T-014).

---

## Goal

Let users **view** saved check-in photos (one at a time, by angle) and **compare** two check-ins side-by-side. Provide a **timeline** of all check-ins as an organized list, replacing the up-to-3 cards on the BPC home with a richer navigation surface.

## Non-goals (forbidden in this sub-task · audited at gate)

- ❌ T-013d Recomp Insight Card · status labels · "weight loss confirmed" / "muscle gain confirmed" / "you're failing" — none of this
- ❌ Ghost overlay · Slider compare (Phase 2; only **side-by-side** is approved here)
- ❌ Auto-suggest comparison · "Best Lean Week" · "Same Weight Different Shape"
- ❌ Video Frame Mode · Timer Mode · `getUserMedia`
- ❌ Any "muscle gain confirmed" or "fat loss confirmed" claims
- ❌ Value-judgment language on weight/waist deltas ("ดีขึ้น"/"แย่ลง"/"ลดได้แล้ว"/"อ้วนขึ้น")
- ❌ PIN lock · face crop · pose-match (Phase 3)
- ❌ Auto-displaying body photos on dashboard or any view outside BPC

## Views

### 1. `bpc-timeline` — full check-in list

```
← 📅 Timeline · ทั้งหมด N รายการ
[🔒 รูปเก็บบนเครื่องนี้เท่านั้น]

[Month group: พฤษภาคม 2026]
  [Card · latest · bordered]
  [Card 2]

[Month group: เมษายน 2026]
  [Card 3]
  [Card 4]
  ...
```

Sort: newest first within each month group. Groups themselves also descend (newest month first).

Each card shows:
- Date (formatted via existing `formatDateTH` — Thai short month + Buddhist year)
- Weight (kg) or "—"
- Waist (cm) or "—"
- Photo chips: `[Front ✓] [Side ✓] [Back ✓/—]` (gray when missing)
- Note preview (max 80 chars; show "…" if truncated)
- Action row: **👁️ ดู** (view) · **✏️ แก้ไข** (edit · routes to T-013b.1 edit flow) · **🗑️ ลบ** (delete)

### 2. `bpc-viewer` — single check-in detail

```
← Check-in {formatDateTH(date)}
[🔒 รูปเก็บบนเครื่องนี้เท่านั้น]

[Angle tabs: 👤 Front ✓ | 🚶 Side ✓ | 🔙 Back — ]

[Big photo OR neutral missing-state]

[Metadata card]
  📅 วันที่      {formatDateTH}
  ⚖️ น้ำหนัก     70.5 kg   (or "—")
  📐 รอบเอว      82 cm     (or "—")
  📝 หมายเหตุ    (if present)

[Actions]
  [✏️ แก้ไข check-in]    [🗑️ ลบ check-in]
  [← กลับ Timeline]
```

Missing states (clearly separated, no crashes):
- **Angle was never captured** (`photoIds[angle]` is null): "ยังไม่มีรูปสำหรับมุมนี้"
- **Blob missing from IndexedDB** (`photoIds[angle]` set but `getPhotoBlob` returns null): "รูปนี้ไม่พบในเครื่องนี้" — covers data corruption / blob orphaned / private-mode IDB nuked

No raw blob ids in UI (only used internally as keys for fetch).

### 3. `bpc-compare` — side-by-side comparison

```
← เปรียบเทียบ progress
[🔒 รูปเก็บบนเครื่องนี้เท่านั้น]

[Mode tabs]
  [🥇 Start vs Latest]  [⏮ Previous vs Latest]  [🎯 เลือกเอง]

[Angle tabs: Front | Side | Back]

(if custom mode)
[Left  picker:  <select>{check-in dates list}</select>]
[Right picker:  <select>{check-in dates list}</select>]

┌─────────────────┬─────────────────┐
│ Left (older)    │ Right (newer)   │
│ {date}          │ {date}          │
│ [photo or       │ [photo or       │
│  missing-state] │  missing-state] │
│ ⚖️ Weight       │ ⚖️ Weight       │
│ 📐 Waist        │ 📐 Waist        │
└─────────────────┴─────────────────┘

[Δ Diff card — neutral numbers only]
  ⏱️ ช่วงเวลา     21 วัน
  ⚖️ น้ำหนัก      70.5 → 68.2  (Δ -2.3 kg)
  📐 รอบเอว       82.0 → 80.5  (Δ -1.5 cm)

  💬 ตัวเลขเปรียบเทียบเฉยๆ · ไม่ใช่การประเมินผล
  📌 การประเมิน progress แบบครบจะมาใน T-013d
```

**Mode defaults:**
- "Start vs Latest" — `leftId` = first check-in (oldest), `rightId` = last (newest)
- "Previous vs Latest" — `leftId` = 2nd-newest, `rightId` = newest
- "เลือกเอง" — both default to last; user picks via `<select>`

**Angle missing state:** if left or right has no photoId for the selected angle, that side's photo slot shows "ยังไม่มีรูปมุมนี้". Other side still renders.

**Delta sign rules:**
- Show explicit "+" or "-" in front of numbers
- **No color coding** (no green for ↓weight, no red for ↑waist) — that implies value judgment
- **No emoji indicator** of "good/bad"
- All numbers rendered in plain text · the Δ label is the only visual cue

**Tone enforcement (audited at gate):**
- Text "ตัวเลขเปรียบเทียบเฉยๆ · ไม่ใช่การประเมินผล"
- No "ดีขึ้น"/"แย่ลง"/"สำเร็จ"/"ล้มเหลว"/"อ้วนขึ้น"/"ผอมลง"
- Explicit pointer to T-013d for interpretation: "การประเมิน progress แบบครบจะมาใน T-013d"

## BPC home integration

Update `renderBodyProgressCenter`:

**When `checkIns.length > 0`:**
- Show **latest** check-in card (full width, bordered · same shape as T-013b.1 `renderBpcCheckinCards` but with **View** button added alongside Edit + Delete)
- Show **up to 1** older check-in card (compact · or omit if >0 — encourage Timeline for the rest)
- Show **Timeline button**: "📅 ดู Timeline ทั้งหมด (N รายการ)" → `nav-bpc-timeline`
- Show **Compare button** (only when `checkIns.length >= 2`): "🆚 เปรียบเทียบ progress" → `nav-bpc-compare`
- If `checkIns.length === 1` show a **disabled-state Compare card** instead: "🆚 เปรียบเทียบ progress · ต้องมีอย่างน้อย 2 check-in"

Keep:
- Privacy banner at top
- Resume banner (when draft exists)
- "📸 เริ่ม Check-in ใหม่" button
- Roadmap card (update T-013c line to ✓ once shipped)

## New helpers

```js
// Group check-ins by Thai month-year label. Returns array of { label, items }
// sorted newest month first; items within group are also newest-first.
function groupCheckInsByMonth(checkIns)

// "พฤษภาคม 2026" (Buddhist year). Used in Timeline group headers.
function formatThaiMonthYear(dateKey)

// Pre-fetch object URLs for all angles of a check-in. Returns { [pid]: url } map.
// Failures are silent (null url for missing blobs — UI shows "รูปนี้ไม่พบ").
async function fetchCheckinPhotoUrls(checkIn)

// Revoke all URLs in a url-map and clear it. Idempotent.
function revokeUrlMap(urlMap)

// Compute deltas for compare. Null-safe (returns null for missing inputs).
// Returns { days, weight_delta, waist_delta }
function computeCheckinDelta(left, right)

// Pick default IDs for compare mode. Returns { leftId, rightId } or null if insufficient.
function pickCompareDefaults(sortedCheckIns, mode)
```

## New handlers

```
nav-bpc-timeline   → go('bpc-timeline')
nav-bpc-viewer     → opens viewer for data-checkin-id (data-angle optional, defaults 'front')
nav-bpc-compare    → opens compare view with default mode 'start-latest'
viewer-set-angle   → switches viewer's angle (data-angle)
compare-set-mode   → switches compare mode (data-mode)
compare-set-angle  → switches compare angle (data-angle)
```

Plus 1 input listener for compare custom-mode `<select>` dropdowns (`compare-left-select`, `compare-right-select`).

## Reused handlers (unchanged)

- `edit-checkin` from T-013b.1 — works as-is from Timeline cards and Viewer
- `delete-checkin` from T-013b.1 — works as-is; after delete:
  - From Timeline: refresh in place (UI just re-renders smaller list)
  - From Viewer: `go('bpc-timeline')` (don't stay on a deleted check-in)
- `nav-bpc` already exists from T-013a

## State shapes

```js
// Viewer
state.tmp = {
  checkInId: string,
  angle: 'front' | 'side' | 'back',
  viewerPhotoUrls: { [photoId]: string }  // Object URLs (created on entry, revoked on exit)
}

// Compare
state.tmp = {
  compareMode: 'start-latest' | 'prev-latest' | 'custom',
  leftId: string,
  rightId: string,
  angle: 'front' | 'side' | 'back',
  comparePhotoUrls: { [photoId]: string }
}
```

## Blob lifecycle

- **On entering viewer/compare:** `fetchCheckinPhotoUrls` for the relevant check-in(s) populates the URL map.
- **On switching angle within same check-in:** URLs already cached, no re-fetch.
- **On switching custom-mode left/right:** re-fetch URLs for new check-in (revoke old).
- **On exiting viewer/compare** (`back`, `nav-bpc`, navigation to any other view): `revokeUrlMap` clears the cache · calls `URL.revokeObjectURL` for each entry.
- **Photo blob missing** (`getPhotoUrl` returns null): URL map entry stays absent; render falls through to "รูปนี้ไม่พบในเครื่องนี้".

## Privacy + tone copy (audited)

- Privacy banner present on **all three** new views (timeline · viewer · compare)
- Dashboard does **NOT** auto-load body photos (no change — already the case in T-013a/b/b.1; verified)
- Compare diff card includes the literal:
  - "ตัวเลขเปรียบเทียบเฉยๆ · ไม่ใช่การประเมินผล"
  - "การประเมิน progress แบบครบจะมาใน T-013d"
- No shame language anywhere — grep audit at gate

## Error / fallback handling

- **No check-ins, route directly to timeline** (e.g., via direct URL or stale stack) → empty state + back button
- **Viewer with non-existent checkInId** (race after delete) → toast "ไม่พบ check-in" + `go('bpc-timeline')`
- **Compare with non-existent leftId/rightId** → same recovery
- **Missing blob in viewer** → friendly fallback per-angle, doesn't prevent metadata/other-angles render
- **Missing blob in compare** → per-side fallback, other side still renders, diff still computes from metadata
- **IndexedDB unavailable** (private mode after first use) → `getPhotoUrl` returns null gracefully → "รูปนี้ไม่พบ" message everywhere

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) 6 new helpers · (2) 3 new view renderers (`renderBpcTimeline`, `renderBpcViewer`, `renderBpcCompare`) · (3) Updated `renderBodyProgressCenter` (Timeline + Compare buttons; latest card gets View button) · (4) Updated `renderBpcCheckinCards` to include View button · (5) 6 new handlers · (6) 1 new `change` listener for compare-side selects (or input listener) · (7) 3 new route dispatches · (8) URL revocation on exit from each view · (9) VERSION |
| `service-worker.js` | VERSION → v1.10.34 |
| `docs/specs/body-progress-timeline-viewer-compare.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | status updates |

## Hard guardrails

- No data file changes (`meals.json`, `branded_products.json`, `audit-meals.js` byte-identical)
- VERSION sync between `index.html` and `service-worker.js`
- IndexedDB schema unchanged (still just `photos` store from T-013a)
- `u.checkIns[]` shape unchanged
- No new `localStorage` keys (timeline/viewer/compare are read-only views)
- T-013d features stay deferred — verified by file-grep at audit (`status label`, `insight card`, "yes" claim wordings) all = 0
- Phase 2 features stay deferred — `ghost`, `slider`, `video frame`, `getUserMedia` = 0

## Definition of Done

- [ ] `groupCheckInsByMonth(checkIns)` helper added
- [ ] `formatThaiMonthYear(dateKey)` helper added
- [ ] `fetchCheckinPhotoUrls(checkIn)` async helper added
- [ ] `revokeUrlMap(urlMap)` helper added
- [ ] `computeCheckinDelta(left, right)` helper added
- [ ] `pickCompareDefaults(sortedCheckIns, mode)` helper added
- [ ] `renderBpcTimeline` view rendered at `state.view = 'bpc-timeline'`
- [ ] `renderBpcViewer` view rendered at `state.view = 'bpc-viewer'`
- [ ] `renderBpcCompare` view rendered at `state.view = 'bpc-compare'`
- [ ] BPC home updated: Timeline button always shown when checkIns ≥ 1, Compare button shown when checkIns ≥ 2 (disabled-card when 1)
- [ ] `renderBpcCheckinCards` updated to include View button
- [ ] `nav-bpc-timeline`, `nav-bpc-viewer`, `nav-bpc-compare` handlers
- [ ] `viewer-set-angle`, `compare-set-mode`, `compare-set-angle` handlers
- [ ] Custom-mode select listener (`compare-left-select` / `compare-right-select`)
- [ ] Route dispatch in `render()` for 3 new views
- [ ] URL revocation called on exit from viewer + compare
- [ ] Viewer with non-existent id → toast + go('bpc-timeline')
- [ ] Compare with non-existent leftId/rightId → recovery same as above
- [ ] Missing blob → "รูปนี้ไม่พบในเครื่องนี้" (per-angle / per-side, doesn't kill other content)
- [ ] Missing photoId (angle never captured) → "ยังไม่มีรูปสำหรับมุมนี้"
- [ ] No T-013d insight/status labels (grep clean)
- [ ] No ghost/slider/video/getUserMedia (grep clean)
- [ ] No muscle-gain / performance-improvement claims
- [ ] No shame language (Thai grep clean)
- [ ] Privacy banner on all 3 new views
- [ ] Delete from viewer routes back to timeline
- [ ] Edit from any card routes to T-013b.1 edit flow (unchanged behavior)
- [ ] VERSION v1.10.33 → v1.10.34 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## Test plan (manual)

1. **0 check-ins** → BPC shows empty state · "ดู Timeline" button hidden or empty-state · "เปรียบเทียบ" hidden
2. **1 check-in** → Timeline shows 1 card · Viewer works (front/side/back tabs) · Compare shows disabled card "ต้องมีอย่างน้อย 2 check-in"
3. **2+ check-ins · Start vs Latest** → renders both photos side-by-side · diff card shows days/weight/waist deltas with signs
4. **Compare · Previous vs Latest** → second-newest + newest correctly selected
5. **Compare · เลือกเอง** → two select dropdowns work · changing either side re-renders
6. **Viewer angle missing (Back never captured)** → Back tab shows "ยังไม่มีรูปสำหรับมุมนี้" · Front and Side still work
7. **Compare with one side missing Back angle** → shows missing state on that side only · other side renders · diff still computes
8. **Delete from viewer** → confirms → blob deleted → routes to timeline → timeline shows N-1
9. **Edit from Timeline card** → routes to T-013b.1 edit draft + flow (no regression)
10. **Refresh mid-viewer** → state lost · viewer state.tmp not localStorage-persistent · returning hits BPC home cleanly
11. **DevTools IndexedDB after viewer exit** → no orphan Object URLs (verified by manual check of memory tab, or trust the revoke path)
12. **Open viewer, switch angles 5x** → 1 fetch per angle blob, no re-fetch on tab switch
13. **Photo blob manually deleted from DevTools** → viewer/compare shows "รูปนี้ไม่พบในเครื่องนี้" gracefully

## Rollback plan

`git revert <T-013c commit>` removes the 3 views + helpers + handlers + BPC button additions. BPC home falls back to T-013b.1 layout (latest cards + Edit/Delete). T-013b.1 edit flow stays intact. No data shape changes to revert.

## Open questions

- **Compare diff sign coloring?** Spec locks: **NO color**. Numbers in plain text. T-013d will introduce the interpretation/status layer with carefully calibrated language.
- **Timeline pagination?** Spec locks: **NO**. Even 100 check-ins (2 years weekly) render fine as a flat list with month groups. Add lazy-load only if perf actually matters later.
- **Custom-mode lock to A.date < B.date?** Spec locks: **NO enforcement** — user can pick A as newer than B; the diff card just shows the math literally. Avoids over-engineering.
- **Show photo size / IDs in viewer?** Spec locks: **NO** — no blob IDs surfaced in UI. Date is the user-facing identifier.
