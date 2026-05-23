# T-013b — Weekly Check-in Capture Flow

**Status:** approved (split-scope · 2 of 4 sub-tasks for BPC Phase 1 MVP)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-013b · T-013a (foundation, done) · Rule 16

> **Split discipline:** This task wires the *capture flow* only. Timeline/viewer/compare → T-013c. Insight/status → T-013d. Ghost overlay / slider / video frame → Phase 2.

---

## Goal

Let a user create a weekly body progress check-in using T-013a foundation. Multi-step flow: Front (req) → Side (req) → Back (optional) → Review/Save. Draft persists across reloads; orphans cleaned on discard.

## Non-goals (forbidden in this sub-task)

- ❌ Timeline / gallery view (T-013c)
- ❌ Comparison views (T-013c)
- ❌ Recomp Insight Card / status labels (T-013d)
- ❌ Ghost overlay (Phase 2)
- ❌ Slider compare (Phase 2)
- ❌ Video Frame Mode for Back (Phase 2)
- ❌ Live Timer Mode for Back (deferred — see below)
- ❌ Any "muscle gain confirmed" or performance-improvement claims
- ❌ Auto-pickup of T-013c after this commits (user-gated)

## Back Timer Mode decision

User instruction: *"Add Back Timer Mode only if contained and safe; otherwise implement as placeholder/fallback."*

**Decision: defer Timer Mode → Phase 2.** File picker with `capture="environment"` is the primary path for ALL angles including Back. Reasons:

1. `getUserMedia` + stream lifecycle + countdown overlay + cleanup paths add ~150 LoC of failure surface
2. File picker with `capture="environment"` on mobile opens the OS camera anyway — for *most* users this IS Timer Mode (they tap shutter when ready)
3. The user-pain Timer solves (tripod self-shot without anyone around) is a refinement, not core flow
4. Phase 2 already plans Video Frame Mode for Back; Timer fits cleanly alongside

**Placeholder UI:** Back step shows a disabled "📷 Timer/Video — มาใน Phase 2" hint. File picker is the active path.

## State machine

```
state.tmp.checkin = {
  step: 'front' | 'side' | 'back' | 'review',
  date: 'YYYY-MM-DD',
  photoIds: { front?, side?, back? },
  weight_kg: number | null,        // editable in Review
  waist_cm: number | null,         // editable in Review
  note: string,
  startedAt: number
}
```

Persisted to `localStorage` under key `pracal_checkin_draft_<userId>` after every step transition and photo capture (so refresh mid-flow can resume).

**Photo blobs** saved to IndexedDB **immediately on capture** (not deferred to final save). This means:
- Even if user closes browser mid-flow, captured photos persist (resume-friendly)
- If user discards draft, blobs become orphans → must be deleted explicitly

## New helpers

### `compute7DayCheckinStats(user, endDate = todayKey())`
Returns the auto-fill metadata bundle:
```js
{
  weight_kg,           // latest weight entry (null if none)
  weight_7day_avg,     // avg over last 7 days (null if <1 entry)
  waist_cm,            // latest waist entry (null if none)
  deficit_7day_avg,    // avg energyDelta over logged days in last 7 (null if no logs)
  protein_pass_rate,   // count of days hitting protein target (0-7, null if no logs)
  training_count,      // total activities in last 7 days
  strength_count,      // type==='weights' count
  cardio_count         // running/cycling/swimming/walking/sports/fitness count
}
```

### Draft helpers
- `getCheckinDraft(userId)` — read from localStorage, return parsed or null
- `setCheckinDraft(userId, draft)` — write JSON, catch quota errors
- `clearCheckinDraft(userId)` — remove
- `discardCheckinDraftWithCleanup(user)` — delete photo blobs referenced in draft, then clear

## New view: `renderCheckinFlow()`

Routed via `state.view = 'checkin'`.

### Layout per step

**Step 1 (Front) — required:**
```
← 📸 Check-in สัปดาห์นี้
[Progress: ●○○○]   Step 1/4: Front (จำเป็น)

Tip: ยืนเต็มตัว · แสงเท่าเดิมทุกครั้ง

[ Photo preview OR upload prompt ]
[📷 ถ่าย/อัปโหลดรูปหน้า]    ← file input button

[← ยกเลิก]                  [→ ถัดไป (Side)]
```

**Step 2 (Side) — required:** same shape, "Side" prompt
**Step 3 (Back) — optional:**
```
Step 3/4: Back (ไม่บังคับ)

📷 Timer/Video — มาใน Phase 2 (file picker คือทางหลักตอนนี้)

[📷 ถ่าย/อัปโหลดรูปหลัง]
หรือ
[⏭️ ข้าม Back photo]

[← ย้อนกลับ]                [→ ถัดไป (Review)]
```

**Step 4 (Review/Save):**
```
Step 4/4: ตรวจสอบและบันทึก

📸 Photos:
[Front thumb] [Side thumb] [Back thumb or —]
(tap to retake)

📊 ข้อมูลร่างกาย (auto-filled, edit ได้):
⚖️ น้ำหนัก:  [70.5] kg
📐 รอบเอว:   [82.0] cm   (or "ยังไม่มีข้อมูล")

📈 7-day stats (auto):
น้ำหนักเฉลี่ย:    70.8 kg
ขาดดุลเฉลี่ย:    -350 kcal/วัน   (or "ไม่พอข้อมูล")
โปรตีนผ่านเป้า:  5/7 วัน
Training:        6 ครั้ง (strength 4 · cardio 2)

📝 หมายเหตุ: [textarea]

🔒 ทั้งหมดอยู่บนเครื่องนี้เท่านั้น

[💾 บันทึก check-in]
[← ย้อนกลับ]
```

### Resume banner in BPC

If a draft exists when user lands on BPC:
```
┌────────────────────────────────────────┐
│ 📝 มี check-in ค้างอยู่ (เริ่มเมื่อ X) │
│ [▶️ ทำต่อ]  [🗑️ ทิ้ง draft]            │
└────────────────────────────────────────┘
```

### "เริ่ม Check-in" button enabled

Was disabled placeholder in T-013a. Now active — calls `nav-checkin`.

## Handlers (new)

```
nav-checkin          → start new (or resume existing draft if present)
checkin-resume       → restore draft, go to its step
checkin-discard      → discardCheckinDraftWithCleanup + back to BPC
checkin-cancel       → confirm dialog · same effect as discard
checkin-prev         → step--
checkin-next         → step++
checkin-skip-back    → step jumps to 'review' (back photoId not set)
checkin-retake       → clear current photoId · let user re-pick
checkin-save         → addCheckIn(user, {...}) · clear draft · goto BPC
```

## Listeners (new)

```js
'change' on input[type=file] with id starting 'checkin-photo-' — capture pipeline
'input' on #checkin-weight / #checkin-waist / #checkin-note — update draft live
```

## Validation

- Cannot proceed from Step 1 without Front photoId
- Cannot proceed from Step 2 without Side photoId
- Step 3 can proceed via either "ถัดไป" (if Back captured) OR "ข้าม"
- Step 4 (Save): must have Front + Side photoIds (re-checked); weight/waist editable, can be null
- Weight: if entered, 20-300 kg
- Waist: if entered, 40-200 cm
- All other auto-fill fields: nullable (handle gracefully)

## Error / fallback handling

- **Compression failure** (e.g., file is corrupted image, too large image causes OOM): toast "ลองรูปอื่น" · do not corrupt draft · existing photoId for that step (if any) stays
- **IndexedDB save failure**: toast "บันทึกรูปไม่สำเร็จ · ลองอีกครั้ง" · do not advance step · do not update draft
- **No camera permission** (file input opens fine; this isn't really an issue with file input): N/A
- **Missing derived stats** (e.g., no weight history): show "ยังไม่มีข้อมูล" gracefully; field is null in saved check-in
- **localStorage quota exceeded** on draft save: toast warning, but mid-flow capture continues with in-memory state.tmp (degraded persistence)

## Privacy copy locked

- Step 1/2/3 footer: small "🔒 รูปเก็บบนเครื่องนี้เท่านั้น"
- Step 4 (review): full copy "🔒 รูปและข้อมูลทั้งหมดอยู่บนเครื่องนี้เท่านั้น · ไม่อัปโหลดที่ไหน"
- Tone throughout: neutral, supportive · no "fatter / worse / failed" · no shame

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) 5 helpers (compute7DayCheckinStats + 4 draft helpers) · (2) renderCheckinFlow view · (3) BPC view: enable button + resume banner · (4) 9 new handlers · (5) `change`/`input` listeners for capture inputs · (6) VERSION |
| `service-worker.js` | VERSION → v1.10.32 |
| `docs/specs/body-progress-checkin-flow.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | status updates |

## Hard guardrails

- No data file changes
- VERSION sync
- IndexedDB schema unchanged (still just `photos` store from T-013a)
- `u.checkIns[]` shape matches T-013a schema (no new fields added in T-013b)
- T-013c/d features stay deferred — verified by file-grep at audit time

## Definition of Done

- [ ] 5 new helpers (compute7DayCheckinStats + draft I/O + discard-with-cleanup)
- [ ] renderCheckinFlow with 4-step state machine
- [ ] BPC view: "เริ่ม Check-in" button enabled · resume banner when draft exists
- [ ] File picker `capture="environment"` for all 3 angles
- [ ] Back step: "ข้าม" button + Timer/Video Phase 2 placeholder text
- [ ] Photos compress + save to IndexedDB immediately
- [ ] Draft persists across reloads · resume works · discard cleans up orphans
- [ ] Step 4 auto-fills derived stats from compute7DayCheckinStats
- [ ] Step 4 weight/waist editable; can be empty
- [ ] Validation: Front + Side required to save
- [ ] Compression failure → recoverable error · draft uncorrupted
- [ ] Missing data → graceful "ยังไม่มีข้อมูล"
- [ ] Privacy copy on every step
- [ ] Neutral tone throughout
- [ ] VERSION v1.10.31 → v1.10.32 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## Test plan (manual)

1. Existing user with check-ins empty → "เริ่ม Check-in" enabled
2. Tap → Step 1, no draft yet
3. Pick Front photo → preview shows, draft created in localStorage
4. Refresh page → BPC shows resume banner, tap "ทำต่อ" → back at Step 1 with photo
5. Continue: Side photo → next step
6. Step 3 Back: tap "ข้าม" → goes to Step 4
7. Step 4: auto-filled stats present (if user has data) OR shown as "ยังไม่มีข้อมูล"
8. Tap "บันทึก" → u.checkIns gets 1 entry, draft cleared, BPC shows 1 check-in
9. Open Application tab in DevTools → IndexedDB has 2 photo records, no orphans
10. Restart flow, mid-way "ทิ้ง draft" → photos in IDB get deleted, draft removed
11. Compression edge: pick a 50MB photo → compress to ~150KB → save works

## Rollback plan

`git revert <T-013b commit>` removes capture flow + handlers + view. T-013a foundation stays intact. Any in-progress drafts in localStorage become harmless dead data (won't be read by reverted code).

## Open questions

- **Resume across-device?** No — drafts are localStorage scoped to origin/profile. No cloud.
- **Timeout on draft?** No auto-expiry. User must explicitly discard. (Could add "stale > 30 days" cleanup later.)
- **Multiple drafts per user?** No. One active draft per userId. Starting a new check-in while a draft exists → resume banner.
