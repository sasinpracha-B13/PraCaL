# T-013a — Body Progress Foundation + Schema + IndexedDB

**Status:** approved (split-scope · 1 of 4 sub-tasks for Body Progress Center Phase 1 MVP)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-013 (parent · split) · `docs/specs/waist-tracking.md` (T-012 builds on this) · Rule 16

> **Split rationale:** parent T-013 (~1,300 lines as single commit) was too risky for a single review gate. User locked direction (IndexedDB, locked schema, locked entry, no-shame tone) and asked for 4 gated sub-tasks. This is sub-task 1: pure foundation, no capture flow yet.

---

## Goal

Lay the **foundation** for Body Progress Center: photo storage (IndexedDB), schema (`u.checkIns[]`), helper functions, and a placeholder Body Progress Center view with empty state + privacy banner. No capture flow, no comparison, no insight card — those land in T-013b/c/d.

## Non-goals (this sub-task only)

- ❌ Weekly check-in capture flow (T-013b)
- ❌ Timeline/gallery beyond empty state (T-013c)
- ❌ Comparison views (T-013c)
- ❌ Recomp Insight Card (T-013d)
- ❌ Back photo Timer/Video Frame (T-013b/T-014)
- ❌ Ghost overlay / slider compare / advanced features (Phase 2/3)

## Schema

### `u.checkIns[]` (localStorage, alongside other user data)

```js
{
  id: 'checkin_<uid>',
  date: 'YYYY-MM-DD',
  photoIds: { front?: 'photo_<uid>', side?: 'photo_<uid>', back?: 'photo_<uid>' },
  weight_kg: 70.5,                  // snapshot at check-in
  weight_7day_avg: 70.8,             // derived
  waist_cm: 82,                       // snapshot
  deficit_7day_avg: -350,            // avg energyDelta over preceding 7 days
  protein_pass_rate: 5,              // days hitting protein target / 7
  training_count: 6,                 // total activities preceding 7 days
  strength_count: 4,                 // type === 'weights' count
  cardio_count: 4,                   // non-weights count
  note: '',                          // optional
  addedAt: 1730000000000
}
```

### IndexedDB `photos` store

Database: `PraCaLBodyProgress` (v1)
Store: `photos` (keyPath: `id`)
Record shape: `{ id, blob, addedAt }`

Photos live ONLY in IndexedDB (never in localStorage — too large). Photo IDs in `u.checkIns[].photoIds` reference them.

## Helpers to add

### IndexedDB wrapper (5 fns)
```js
openPhotoDb()                    // → Promise<IDBDatabase>
savePhotoBlob(id, blob)           // → Promise<id>
getPhotoBlob(id)                  // → Promise<Blob | null>
deletePhotoBlob(id)               // → Promise<void>
listPhotoBlobIds()                // → Promise<string[]>
getPhotoUrl(id)                   // → Promise<string | null>  (helper: blob → object URL)
```

### Photo compression (1 fn)
```js
compressPhoto(file, maxDim = 1080, quality = 0.75)  // → Promise<Blob>
```
Canvas-based resize + JPEG re-encode. Target ~150 KB per photo.

### Check-in CRUD (4 fns)
```js
addCheckIn(user, checkIn)                  // assigns id + addedAt, pushes, sorts
getCheckIn(user, id)
deleteCheckIn(user, id)                    // ALSO deletes associated photo blobs
cleanupOrphanPhotos(user)                  // → Promise<number cleaned>
```

### Stats derivation (placeholder for T-013b — minimal stubs in this sub-task)
Will be expanded in T-013b. For now, just expose the shape so the migration + empty-state can reference it.

## UI changes (this sub-task only)

### New view: Body Progress Center (`bpc`)

```
┌─ ← 📊 Body Progress ─────────────────┐
│ 🔒 รูปทั้งหมดเก็บบนเครื่องนี้เท่านั้น   │  ← privacy banner
│    ไม่อัปโหลดที่ไหน                    │
├──────────────────────────────────────┤
│         📸                            │
│   ยังไม่มี check-in                   │  ← empty state
│   เริ่ม check-in รายสัปดาห์เพื่อดู    │
│   การเปลี่ยนแปลงร่างกาย                │
│   [📸 เริ่ม Check-in (T-013b)]        │  ← disabled placeholder
└──────────────────────────────────────┘
```

### Dashboard chip (new)
Below existing chips (มื้อต่อไป / สร้างแผน):
```
┌──────────────────────────────────────┐
│ 📊 Body Progress                  →  │  ← only shows if user has weights/waist
│ ยังไม่มี check-in · เริ่มได้ตอนนี้   │
└──────────────────────────────────────┘
```

Or compact: "📸 Body Progress" small chip · navigates to BPC view.

### Body-log view link
Add a chip/link from "📊 บันทึกร่างกาย" view: "📸 Body Progress Center →"

## Schema migration

In existing `migrateData()` function:
```js
if (!u.checkIns) { u.checkIns = []; changed = true; }
```

## Backup/export compatibility

- Existing CSV export uses `buildCSV(userId, startKey, endKey)` — exports log entries only. **Unaffected.**
- No JSON export feature today. If we add one later, photos won't fit — would need separate photo-export.
- localStorage shape: `u.checkIns = []` adds tiny field. No bloat.
- IndexedDB is browser-scoped same as localStorage; data clearing affects both, but that's user-initiated.

## Workflow audit

1. **First-load by existing user** → `migrateData()` adds `u.checkIns = []` · IndexedDB opened on first `savePhotoBlob` call only (lazy init) ✓
2. **Photo orphan cleanup** — `deleteCheckIn` removes both metadata + photo blobs · `cleanupOrphanPhotos` scans for blobs not referenced ✓
3. **BPC empty-state nav** → currently shows disabled "Check-in" button (placeholder) — T-013b will wire it up ✓
4. **Existing flows** (Dashboard, Library, Reports, Weight Log, etc.) — unaffected. Only Dashboard gets a new chip, Weight Log gets a link ✓
5. **Reload safety** — IndexedDB persists across reloads · checkIns persist in localStorage · no async race conditions in T-013a (no capture yet) ✓
6. **iOS Safari** — IndexedDB supported · should work, but private browsing has quota issues — out of scope for T-013a ✓

## Hard guardrails

- VERSION sync (sw + index)
- No data file changes (`meals.json` etc.)
- No existing schema field renames
- Privacy banner copy is the user's wording: "Photos are stored locally on this device by default." (Thai version: "🔒 รูปทั้งหมดเก็บบนเครื่องนี้เท่านั้น · ไม่อัปโหลดที่ไหน")

## Definition of Done

- [ ] IndexedDB wrapper: 6 helpers (open / save / get / delete / list / getUrl)
- [ ] `compressPhoto(file, maxDim, quality)` helper added
- [ ] Schema migration: `u.checkIns = []` for existing users
- [ ] Check-in CRUD helpers (add / get / delete with photo cleanup / cleanupOrphans)
- [ ] BPC view defined + routed (`state.view = 'bpc'`)
- [ ] BPC empty state with privacy banner
- [ ] Dashboard chip → BPC (visible only when user has any weight or waist data, to avoid noise for empty profiles)
- [ ] Body-log view gets link/button → BPC
- [ ] VERSION v1.10.30 → v1.10.31 (sw + index)
- [ ] Data file hashes unchanged
- [ ] PROJECT_STATE updated
- [ ] Reload safe (manual verify on existing user with old data)

## Test plan

1. Existing user reload → `u.checkIns = []` migrated cleanly, no errors
2. Navigate to BPC via dashboard chip → empty state shows · privacy banner visible
3. Navigate to BPC via Body Log link → same empty state
4. Open `chrome://inspect → IndexedDB` after first photo save (T-013b) — verify schema (we won't trigger this in T-013a, but the helpers are testable individually)
5. Old user data untouched (weight/waist/logs all intact)

## Rollback plan

`git revert <T-013a commit>` removes helpers + BPC view + chip + link. `u.checkIns` arrays remain in user data (harmless — inert).
IndexedDB database `PraCaLBodyProgress` remains created but empty if nothing was saved. No corruption.

## Open questions

- **Dashboard chip visibility:** show only when user has weight OR waist data (avoid noise for empty profiles)? **Yes — locked.**
- **First-time BPC visit:** show a "what is this?" explainer card on first visit? **Defer to T-013b** — when there's actual content to explain.
- **Backup feature for photos?** Out of scope T-013a. User can manually save to gallery in T-013c.
