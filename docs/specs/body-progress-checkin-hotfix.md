# T-013b.1 — Capture Source + Edit Check-in (hotfix on T-013b)

**Status:** approved (hotfix before T-013c)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-013b.1 · T-013b (done · v1.10.32) · `body-progress-checkin-flow.md`

> **Split discipline:** This is a hotfix on the capture flow only. Does NOT start T-013c timeline/viewer/compare. Does NOT start T-013d insight/status. Does NOT add ghost overlay / slider compare / video frame / getUserMedia / muscle gain claims.

---

## Two real issues found in T-013b post-ship usability

1. **Capture-only behavior.** `<input type="file" accept="image/*" capture="environment">` is the single path. On mobile this forces the user into the OS camera; they cannot choose an existing gallery/Photos image. This is wrong for the common case of "I have last week's photo I want to use" or "I just took it with the Camera app a minute ago."
2. **No edit on saved check-ins.** Once `addCheckIn(u, final)` lands, the user has no UI to revise weight / waist / note / date / photos. So if waist data wasn't entered at check-in time (because the user hadn't measured yet), it stays missing forever. Also no way to fix a wrong photo selection.

## Goal

- Split each angle's "📷 ถ่าย/อัปโหลดรูป" button into **two** explicit source buttons:
  - **📷 ถ่ายใหม่** (camera) — `<input ... capture="environment">`
  - **🖼️ เลือกรูปจากเครื่อง** (gallery) — `<input ...>` *(no capture attr)*
- Add an **Edit mode** for existing check-ins, reusing the same 4-step flow (Front · Side · Back · Review).
- Add a **BPC latest check-in card** (with Edit button) as the entry point. Full timeline still T-013c.

## Non-goals (forbidden in this sub-task · audited at gate)

- ❌ Timeline / gallery view (T-013c)
- ❌ Comparison views — start vs latest / week-over-week / lowest-waist vs latest (T-013c)
- ❌ Recomp Insight Card / status labels (T-013d)
- ❌ Ghost overlay (Phase 2)
- ❌ Slider compare (Phase 2)
- ❌ Video Frame Mode for Back (Phase 2)
- ❌ Live Timer Mode for Back (Phase 2)
- ❌ `getUserMedia` (anywhere)
- ❌ Any "muscle gain confirmed" or performance-improvement claims
- ❌ T-013c full timeline (the "show last 3" optional card is **not** a timeline — it's just three plain cards with date/weight/waist/chips and an Edit button each, no comparison/scrubbing/grouping/viewer)

## Design

### 1. Two-button capture source (per angle)

Each photo step (Front · Side · Back) renders **two labels + two hidden file inputs**:

```html
<label for="checkin-photo-{angle}-camera" class="btn green ...">📷 ถ่ายใหม่</label>
<input id="checkin-photo-{angle}-camera" type="file" accept="image/*" capture="environment" hidden>

<label for="checkin-photo-{angle}-gallery" class="btn secondary ...">🖼️ เลือกรูปจากเครื่อง</label>
<input id="checkin-photo-{angle}-gallery" type="file" accept="image/*" hidden>
```

**Critical:** gallery input has **no `capture` attribute**. The presence of `capture` is what tells browsers "open camera"; absence lets the user pick from their library.

Listener regex changes from
```js
/^checkin-photo-(front|side|back)$/
```
to
```js
/^checkin-photo-(front|side|back)-(camera|gallery)$/
```
(angle extracted from group 1; source is logged-but-not-stored — both paths feed `handleCheckinPhotoUpload(angle, file)`).

### 2. Edit mode state machine

Single draft key per user (`pracal_checkin_draft_<userId>`) — extended with new fields:

```js
state.tmp.checkin = {
  // existing fields unchanged:
  step, date, photoIds, weight_kg, waist_cm, note, startedAt,

  // new in T-013b.1:
  mode: 'new' | 'edit',           // default 'new' for back-compat
  editingId: string | null,       // check-in id being edited (mode='edit' only)
  originalPhotoIds: { front, side, back? } | null  // snapshot at edit start
}
```

**Why `originalPhotoIds`:** In edit mode, when the user replaces a photo mid-flow, we must **not** delete the original blob until save lands — because if they cancel the edit, the saved check-in still references that original. So:
- `handleCheckinPhotoUpload` becomes mode-aware: if `mode==='edit'` AND `oldId ∈ originalPhotoIds`, **do not** delete `oldId`. The new blob is added (replacing the draft's photoId), but the original survives until save commits.
- `handleCheckinPhotoUpload` for `mode==='edit'` AND `oldId ∉ originalPhotoIds`: safe to delete (that `oldId` was a transient upload from this edit session).
- `handleCheckinPhotoUpload` for `mode==='new'` (or undefined): delete old immediately as today (backward-compat with T-013b).

### 3. Cancel/discard semantics by mode

`discardCheckinDraftWithCleanup(user)` becomes mode-aware:
- `mode==='new'` (or undefined) → delete **all** blobs in draft's photoIds (current behavior; T-013b preserved).
- `mode==='edit'` → delete only blobs in current `photoIds` that are **not** in `originalPhotoIds` (those were uploaded during this edit session and will be discarded; the originals stay because the saved check-in still references them).

### 4. Save semantics by mode

`checkin-save` handler branches:
- `mode==='new'` → `addCheckIn(u, final)` (today's path).
- `mode==='edit'`:
  1. Build the patched check-in (same shape as new but with `id === editingId`).
  2. `updateCheckIn(u, editingId, patch)` (new helper — replaces fields in-place; preserves `id` and `addedAt`).
  3. After successful update, delete blobs that were **in `originalPhotoIds` but not in final `photoIds`** (i.e., replaced or removed — only the user explicitly chose this; safe).
  4. Recompute derived stats? **NO** — keep the original snapshot (`weight_7day_avg`, `deficit_7day_avg`, etc.) because those were the 7-day window at check-in time; recomputing now would silently change history. Only the user-editable fields (date, weight_kg, waist_cm, note, photoIds) get updated. Spec lock: editing does NOT alter the snapshot fields.

   ⚠️ **Date edit caveat:** if the user changes `date`, the snapshot fields still reflect the original window. This is acceptable for v1 — documented in the Review step with a small hint: "หมายเหตุ: 7-day stats เป็น snapshot ของวันที่บันทึกครั้งแรก · ไม่คำนวณใหม่"

### 5. New helper: `updateCheckIn(user, id, patch)`

```js
function updateCheckIn(user, id, patch) {
  const ci = (user.checkIns || []).find(c => c.id === id);
  if (!ci) return null;
  // Preserve immutable fields
  const { id: _id, addedAt: _addedAt, ...editable } = patch;
  Object.assign(ci, editable);
  ci.updatedAt = Date.now();
  // Re-sort in case date changed
  user.checkIns.sort((a, b) => a.date.localeCompare(b.date));
  return ci;
}
```

Schema add: optional `updatedAt` field on check-in entries. No migration needed (absence is fine for older entries).

### 6. BPC latest check-in card (replacing T-013b's "timeline viewer มาใน T-013c" placeholder)

When `checkIns.length > 0`, render the latest check-in card with:
- Date (large)
- Weight (kg) or "—"
- Waist (cm) or "—"
- Photo availability chips: `[Front ✓] [Side ✓] [Back ✓/—]`
- **Edit button** → `edit-checkin` handler with `data-checkin-id="..."`
- **Delete button** → `delete-checkin` handler (existing `deleteCheckIn` helper)

**Optional last-3 cards** (only if `checkIns.length > 1`): show up to 2 more older cards (same shape, smaller). Cap at 3 total. Each has its own Edit + Delete button.

**No comparison. No ghost overlay. No timeline scrubbing. No gallery viewer.** Just plain cards with Edit.

The "T-013c · Timeline · viewer · side-by-side compare" roadmap text stays informational.

### 7. New handler: `edit-checkin`

```
edit-checkin (data-checkin-id="X")
  → load saved check-in
  → snapshot originalPhotoIds
  → create edit draft: { mode:'edit', editingId:X, ...existing fields, originalPhotoIds, step:'review', startedAt:now() }
  → setCheckinDraft(u.id, draft)
  → pre-fetch photo URLs
  → go('checkin', { checkin, checkinPhotoUrls })
```

**Why `step:'review'`** by default: most edits will be data-only (add waist, fix note, change date). Starting on Review lets the user finish in one tap. They can navigate back to Front/Side/Back via the existing prev/back buttons to replace photos. If user only wants to replace a photo, the Review step's "← แก้ไขรูป" path is one click.

### 8. New handler: `checkin-remove-back` (edit mode only)

The Back step in **edit mode** gains a small "🗑️ ลบรูปหลัง" button (only shown when `mode==='edit'` AND `photoIds.back` exists). Sets `photoIds.back = null` in draft. On save, the missing back propagates and the original back blob (in `originalPhotoIds.back`) gets cleaned up.

In **new mode**, this button is hidden — users just don't take a back photo or use "⏭️ ข้าม Back photo" which already exists.

### 9. Resume banner copy (mode-aware)

BPC resume banner copy varies:
- `mode==='new'`: "📝 มี check-in ค้างอยู่" (unchanged)
- `mode==='edit'`: "✏️ กำลังแก้ไข check-in วันที่ X" (new — references the editing date so user knows what they're returning to)

### 10. Privacy + tone copy locked

- Each step's footer: "🔒 รูปเก็บบนเครื่องนี้เท่านั้น"
- BPC banner: "🔒 รูปทั้งหมดเก็บบนเครื่องนี้เท่านั้น · ไม่อัปโหลดที่ไหน"
- No "fatter / worse / failed / ล้มเหลว / แย่กว่า / อ้วนกว่า"
- No "muscle gain / performance improvement / กล้ามขึ้น"

## Validation

| Mode | Required to save | Notes |
|---|---|---|
| `new` | Front + Side photoIds | Same as T-013b |
| `edit` | Front + Side photoIds (either original or replaced) | Re-checked at save; if either is missing after edit, save blocked |
| both | `date` exists | Always present (defaults to `todayKey()`) |
| both | `weight_kg` nullable | OK to be blank |
| both | `waist_cm` nullable | OK to be blank |

## Error / fallback handling (unchanged from T-013b)

- Compression failure → toast "ลองรูปอื่น" · draft uncorrupted
- IndexedDB save failure → toast "บันทึกรูปไม่สำเร็จ · ลองอีกครั้ง" · draft unchanged
- Missing derived stats → graceful "ยังไม่มีข้อมูล" / nulls in saved check-in
- localStorage quota → warn-and-continue (degraded persistence)
- **New:** if user navigates to `edit-checkin` on an id that no longer exists (rare race), toast "ไม่พบ check-in" and stay on BPC

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) `updateCheckIn` helper (new) · (2) `handleCheckinPhotoUpload` mode-aware · (3) `discardCheckinDraftWithCleanup` mode-aware · (4) `renderCheckinStepPhoto` two-button capture · (5) `renderCheckinStepBack` two-button + remove-back (edit only) · (6) `renderCheckinReview` edit copy + snapshot note · (7) `renderBodyProgressCenter` latest check-in card with Edit/Delete buttons (replaces placeholder line) · (8) `edit-checkin` handler (new) · (9) `delete-checkin` handler (new wrapper around existing `deleteCheckIn` helper) · (10) `checkin-remove-back` handler (new) · (11) `checkin-save` branches on mode · (12) `nav-checkin` ensures `mode='new'` on new drafts · (13) change listener regex update · (14) VERSION |
| `service-worker.js` | VERSION → v1.10.33 |
| `docs/specs/body-progress-checkin-hotfix.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | status updates |

## Hard guardrails

- No data file changes (`meals.json`, `branded_products.json`, `audit-meals.js` byte-identical)
- VERSION sync between `index.html` and `service-worker.js`
- IndexedDB schema unchanged (still just `photos` store from T-013a)
- `u.checkIns[]` shape: only new field is optional `updatedAt: number` — no migration required (absent on old entries is fine)
- T-013c/d features stay deferred — verified by file-grep at audit time (`timeline`, `compare`, `ghost`, `slider`, `video frame`, `getUserMedia`, muscle/performance claims all = 0 new occurrences)
- The roadmap text in the BPC view that mentions "T-013c — Timeline · viewer · side-by-side compare" is **informational placeholder only** (carried over from T-013b) — not a feature implementation

## Definition of Done

- [ ] Two-button capture source for all 3 angles (Front · Side · Back)
- [ ] Gallery picker `<input>` does NOT have `capture` attribute (verified by grep)
- [ ] Camera picker `<input>` retains `capture="environment"`
- [ ] `updateCheckIn(user, id, patch)` helper added
- [ ] Edit mode wired: draft has `mode`/`editingId`/`originalPhotoIds`; flow respects mode at every transition
- [ ] BPC latest check-in card with Edit + Delete buttons (and optional up-to-2 older cards)
- [ ] `edit-checkin` handler loads saved check-in into edit draft and routes to flow at step:'review'
- [ ] `checkin-remove-back` handler (edit mode only) clears `photoIds.back`
- [ ] `handleCheckinPhotoUpload` preserves original blob in edit mode until save lands
- [ ] `discardCheckinDraftWithCleanup` preserves original blobs in edit mode (only deletes new transient uploads)
- [ ] `checkin-save` branches on mode: new → addCheckIn (unchanged); edit → updateCheckIn + cleanup replaced blobs
- [ ] Cancel/discard during edit does NOT mutate saved check-in (verified manually + by reading code)
- [ ] Validation: Front + Side required for save in both modes
- [ ] Snapshot fields (`weight_7day_avg`, `deficit_7day_avg`, etc.) preserved on edit (not recomputed)
- [ ] Review step copy includes snapshot-preserved note for edit mode
- [ ] Resume banner copy adapts: "📝 มี check-in ค้างอยู่" vs "✏️ กำลังแก้ไข check-in วันที่ X"
- [ ] Privacy copy on every step
- [ ] Neutral tone throughout
- [ ] VERSION v1.10.32 → v1.10.33 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged
- [ ] Scope-lock audit: 0 new occurrences of forbidden features

## Test plan (manual)

1. **Mobile camera**: tap "📷 ถ่ายใหม่" → OS camera opens (capture="environment" present)
2. **Mobile gallery**: tap "🖼️ เลือกรูปจากเครื่อง" → OS photo picker opens (no capture attribute)
3. **Desktop**: both buttons open the regular file picker (browser ignores capture without a camera) — both work, no error
4. **New check-in save flow** (regression): Front + Side via gallery → Back skipped → Review → save · should produce identical `u.checkIns[]` entry shape as T-013b
5. **Edit waist later**: existing check-in (saved without waist) → tap Edit → Review opens with empty waist field → type value → save → check-in `waist_cm` updated; snapshot fields unchanged
6. **Edit photo replace**: existing check-in → Edit → prev to Side step → tap "🖼️ เลือกรูปจากเครื่อง" → pick new photo → next to Review → save · check-in `photoIds.side` is the new id; **old Side blob deleted** from IndexedDB; Front blob untouched
7. **Cancel edit preserves saved data**: existing check-in → Edit → replace Side photo with a new gallery pick → cancel → check-in's `photoIds.side` is STILL the original; the transient new blob is deleted from IndexedDB; original Side blob still present
8. **Add Back later**: existing check-in saved without Back → Edit → go to Back step → tap "📷 ถ่ายใหม่" or gallery → next → save · check-in now has `photoIds.back`
9. **Remove Back**: existing check-in with Back → Edit → Back step → tap "🗑️ ลบรูปหลัง" → next → save · check-in no longer has `photoIds.back`; old Back blob deleted from IndexedDB
10. **Multiple edits sequentially**: edit check-in A → save → edit check-in B → save · no draft conflict, each completes cleanly
11. **Edit then start new during edit**: start editing check-in → back to BPC → resume banner shows "✏️ กำลังแก้ไข check-in วันที่ X" (not the new-draft banner) · tap "ทำต่อ" → resumes correctly
12. **Delete check-in**: tap Delete on a card → confirm → check-in removed, all its photo blobs deleted from IndexedDB
13. **Edit non-existent id** (race): trigger by deleting from DevTools then tapping Edit on stale card → toast "ไม่พบ check-in" · no crash
14. **DevTools IndexedDB after each test**: orphan count = 0

## Rollback plan

`git revert <T-013b.1 commit>` removes the two-button pattern + edit mode + BPC card. T-013b capture flow stays intact (single button, no edit). Any edit drafts in localStorage become harmless dead data (won't be read by reverted code; `mode` field ignored). Saved check-ins are unaffected.

## Open questions

- **Should editing re-run derived stats?** Spec locks: **NO**. Snapshot stays. Editing date changes the displayed `checkin.date` but not the 7-day window's source data. If user wants a fresh snapshot, they should create a new check-in. Documented in Review step.
- **Multiple drafts (new + edit)?** Spec locks: **NO**. Single draft per user. If a draft exists, BPC banner forces user to resume/discard before starting a new one. Trying to edit while a new draft exists shows the same banner (resume the existing draft first).
- **Photo source signal stored?** Spec locks: **NO**. We don't record whether a photo came from camera or gallery; immaterial to the data model.
