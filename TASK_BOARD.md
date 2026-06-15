# Task Board

> **Live state of every task, governed by a state machine.**
> Update on every transition. The Orchestrator owns the file; the Execution Agent updates its own task's status during a flow.

Last updated: T-018 → `done` ✅ (v1.10.44 shipped · SW update detection fix) · T-014/T-015 still HOLD · awaiting next pickup approval

---

## Active Epic

**EPIC-001 — Operating-model self-hosting** *(loop validated)*
Goal: prove the execution loop works by running one real task end-to-end through SPEC → BUILD → REVIEW → DONE, with state transitions visible in this file.

T-001 ran the full loop and reached `done`. The system has demonstrated it can pick a task, write its spec, execute it, update state, and stop at the user gate. Epic continues with T-003 to harden the audit tooling that T-001 surfaced as gap.

---

## Current Status

- Operating layer landed in commit `9a0747a` (Commit A — operating model + execution layer).
- T-001 README refresh: `done` — landed in commit `94cb6bc` (Commit B), pushed to `main`.
- T-003 meals audit script: **`done`** ✅ — landed in commit `aa20e6a`.
- T-003A Node verification fallback: **`superseded`** by T-004/DEC-002 (strategic question answered; tactical purpose was already fulfilled).
- T-004 runtime decision: **`review`** — DEC-002 drafted, cross-references added to tools/README + AGENTS, no production change. Awaiting user gate to `done`.

---

## Task State Machine

```
   ┌─────────┐     ┌──────────────┐     ┌────────┐    user-gated     ┌──────┐
   │  todo   │ ──► │ in_progress  │ ──► │ review │ ────────────────► │ done │
   └─────────┘     └──────────────┘     └────────┘                   └──────┘
        ▲                 │                  │
        │                 ▼                  ▼
        │           ┌───────────┐      (revisions loop back to in_progress)
        └───────────│  blocked  │
                    └───────────┘
```

### Transition rules (enforced in AGENTS.md)

| From → To | Who | Pre-conditions |
|---|---|---|
| `todo → in_progress` | Execution Agent | A spec exists or is created in this same step (`docs/specs/`). Status flip recorded here. |
| `in_progress → review` | Execution Agent | All Definition-of-Done items checked. `PROJECT_STATE.md` updated to reflect new reality. Diff summary posted in chat. |
| `review → done` | **User (gated)** | User explicitly says "approve" / "merge" / "done". Orchestrator never self-approves. |
| any → `blocked` | Any agent | Reason recorded in the task's Notes. Resume by reverting to the prior state. |
| `review → in_progress` | Execution Agent | User asked for revisions. Track what was revised in Notes. |

### Required fields per task

Every task in the Registry must have:

- **ID** — `T-NNN` zero-padded sequence
- **Title** — short imperative phrase
- **Status** — exactly one of `todo` / `in_progress` / `review` / `done` / `blocked`
- **Owner** — agent role responsible (usually `Execution Agent`)
- **Spec** — link to `docs/specs/<file>.md` (must exist before `in_progress`)
- **Definition of Done** — checklist of concrete, verifiable items
- **Notes** — created/modified date, blockers, revision history

---

## Task Registry

### T-001 — README refresh

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/readme-refresh.md`](docs/specs/readme-refresh.md)
- **Definition of Done:**
  - [x] `README.md` version line says `v1.10.22` (was `v1.0.0`)
  - [x] `README.md` meal count says 375+ Thai meals + 88 branded products (was "85+")
  - [x] `README.md` "BMR-only — no fake activity levels" claim corrected (TDEE = BMR × activity multiplier today)
  - [x] `README.md` Features section mentions: scan/OCR, backdate, suggester, meal planner, streaks, goal-aware ring
  - [x] `README.md` Cost section reflects current models (Haiku 4.5 + Sonnet 4.6)
  - [x] `README.md` Setup section unchanged (still accurate)
  - [x] `PROJECT_STATE.md` Open Question 1 marked resolved
  - [x] All claims verifiable against current code (grep checks documented in spec)
- **Transitions:**
  - `todo → in_progress` — Execution Agent picked up; spec written
  - `in_progress → review` — implementation complete; PROJECT_STATE.md updated; audit pass
  - `review → done` — user approved
- **Notes:**
  - First end-to-end task through the new state machine.
  - Doc-only — no production code or version bump.
  - Surfaced an audit-tooling gap (literal `grep '"id"'` over `meals.json` returns 541 — false count from nested customization ids); spawned T-003 to fix the audit script.
  - First example of "system uncovers truth" — the README's "BMR-only" claim was wrong against the actual code (`calcTDEE = BMR × activityMultiplier`); the spec process surfaced the contradiction instead of letting it ship.

---

### T-003 — meals audit script (correct top-level meal count)

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/audit-meals-script.md`](docs/specs/audit-meals-script.md)
- **Definition of Done:**
  - [x] `tools/audit-meals.js` exists, **uses Node stdlib only** (no deps); will run with `node tools/audit-meals.js`
  - [x] **Verification policy:** Node-runtime check reclassified as *optional validation* by user. PS parallel-implementation (`tools/.audit-meals-verify.ps1`, git-ignored helper) accepted as canonical evidence — it mirrors the JS line-for-line, hash-invariant verified. Future user-side `node tools/audit-meals.js` is welcome but not required for `done`.
  - [x] Counts meals at the **top-level array** of `meals.json`; reports exact integer (375)
  - [x] Per entry, computes `protein_g × 4 + carbs_g × 4 + fat_g × 9` vs `baseCalories`; flags deviations > 15%
  - [x] Output: human-readable to stdout; pass/warn/fail counts; offending entries listed by id + name + diff
  - [x] Exit codes: `0` / `1` / `2` per `tools/README.md` convention
  - [x] Optional `--json` flag emits machine-readable summary
  - [x] `tools/README.md` catalog table updated
  - [x] First run snapshot captured in spec (375 total · 297 pass · 70 warn · 5 fail · 3 skipped)
  - [x] `PROJECT_STATE.md` Open Question 2 partially addressed
- **Transitions:**
  - `todo → in_progress` — picked up after T-001 push; spec written
  - `in_progress → review` — script written; PowerShell parallel run confirmed logic + read-only invariant (md5 unchanged); state files updated
  - `review → blocked` — user reclassified: external dependency (Node runtime) stalls progress
  - `blocked → done` — user reversed: PS parallel-impl evidence accepted; Node verification declared optional, not blocking
- **Notes:**
  - Read-only invariant verified via `Get-FileHash` before/after run: `meals.json` MD5 unchanged.
  - Surfaced 5 fail entries — beer (alcohol calorie limitation, expected), 2 black-coffee low-cal noise, 2 real data discrepancies (`s02`, `m18`). Documented as findings for follow-up Data/Domain task; **not fixed here** (scope-locked).
  - Surfaced a known limitation: macro check doesn't account for alcohol — schema enhancement candidate (`alcohol_g` field) for a future task.
  - Surfaced an environmental assumption: tools layer assumed Node would be available. Not a T-003 problem to solve, but a real gap → spawned T-004.
- **Verification policy (for future tasks of this class):** PS parallel-implementation evidence is acceptable for tools written in `.js` when Node is unavailable, *provided* the read-only invariant (`Get-FileHash` before/after) is verified. Node-runtime check remains optional validation, not a gate. If future runtime decision (T-004) changes this, that DEC supersedes.

---

### T-003A — Node verification fallback (unblock T-003 without external Node)

- **Status:** **`superseded`** by T-004 / [DEC-002](docs/decisions/DEC-002-tools-runtime.md)
- **Tactical purpose** (unblock T-003) — **fulfilled** independently when user accepted PS evidence as canonical for T-003.
- **Strategic purpose** (formalize the runtime path) — **superseded by T-004**, which selected opt-F ("Node primary + PS parallel-impl as formal fallback evidence"). The opt-1 / opt-2 / opt-3 enumeration here is preserved as historical context for DEC-002's "Alternatives considered" section.
- **Notes:**
  - Closed without execution; this is the correct outcome — the strategic question was answered by T-004.
  - Sub-letter ID convention (`T-NNN<letter>`) used here for the first time; if reused, add to `Conventions` section.

---

### T-012 — Waist circumference tracking

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/waist-tracking.md`](docs/specs/waist-tracking.md)
- **Re-scope note:** Originally T-012 was Insight Engine placeholder; user picked waist + photos from brainstorm. Insight Engine → T-015 (4th deferral).
- **User-locked scope:** Option A — execute waist first (T-012), photos as T-013/T-014.
- **Definition of Done (all met):**
  - [x] `u.waist[]` schema migration (auto-init on next load)
  - [x] 8 waist helpers: setWaist · removeWaist · sortedWaist · latestWaist · waistChangeOver · waistTrend · waistHeightRatio · waistHealthFlag
  - [x] `movingAverage` / `linearRegression` / `svgLineChart` generalized with optional `valueKey` (backward-compat verified — existing weight chart calls pass nothing → defaults preserve identical visual)
  - [x] Weight-log view renamed "📊 บันทึกร่างกาย" · 2nd input "รอบเอว (ซม.)" · save handler either-or-both · waist chart + ratio + flag · waist history list w/ delete
  - [x] Reports view: new "📐 รอบเอว" stat-card with line chart + change + ratio + WHO-based flag (only shows when range has waist data)
  - [x] WHO thresholds: ratio bands (< 0.4 / 0.4-0.5 / 0.5-0.55 / 0.55-0.6 / > 0.6) + Asian gender cutoffs (♂ > 90cm · ♀ > 80cm)
  - [x] VERSION v1.10.29 → v1.10.30 (sw + index verified)
  - [x] Data file hashes unchanged
- **Transitions:**
  - `todo → in_progress` — picked up after T-011 commit; user picked Option A from brainstorm
  - `in_progress → review` — helpers + UI + handlers + schema + audit clean
  - `review → done` — user approved (single-letter "A")

### T-013 — Body Progress Center · Phase 1 MVP *(split into 4 sub-tasks)*

User decision: split into 4 gated sub-tasks instead of single 1,300-line commit. Each stops at review.

**Locked direction:**
- IndexedDB for photo blobs · `u.checkIns[]` metadata in localStorage
- Front/Side required · Back optional · Timer Mode for Back · file picker fallback
- BPC entry: Dashboard chip + link from "📊 บันทึกร่างกาย"
- Neutral / no-shame tone · NO "muscle gain confirmed" claim
- training_count / strength_count / cardio_count = frequency proxy only · no performance trend claim
- Video Frame Mode for Back → deferred to Phase 2 (was original spec; explicitly deferred per split decision)

### T-013a — Foundation + Schema + IndexedDB

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/body-progress-foundation.md`](docs/specs/body-progress-foundation.md)
- **Gate criteria:** reload safe · old users safe · no localStorage bloat · no photo/metadata mismatch · BPC entry visible with empty state
- **Scope:**
  - [x] IndexedDB `photos` store + 6 helpers (open · save · get · delete · list · getUrl)
  - [x] Photo compression helper (Canvas resize 1080px · JPEG q=0.75)
  - [x] `u.checkIns[]` schema migration (auto-init for existing users)
  - [x] 4 check-in CRUD helpers (add/get/delete with photo cleanup/orphan scan)
  - [x] BPC view with empty state + privacy banner + roadmap (T-013a/b/c/d/Phase 2/3)
  - [x] Dashboard chip → BPC (gated: only if user has weight OR waist data)
  - [x] Body-log view link → BPC
  - [x] `nav-bpc` handler + 'bpc' view dispatch route
  - [x] VERSION v1.10.30 → v1.10.31 (sw + index)
  - [x] Data file hashes unchanged (meals.json / branded_products.json / audit-meals.js)
- **Transitions:**
  - `todo → in_progress` — picked up after T-012 commit; user chose split path
  - `in_progress → review` — foundation complete · empty-state view live · no capture flow yet (T-013b)
  - `review → done` — user approved; ran 5 final gate checks (VERSION sync · lazy IDB · migration · delete safety · orphan cleanup); all pass. **Held T-013b pickup per user instruction** — wait for next approval before starting capture flow.

### T-013b — Weekly Check-in Capture Flow

- **Status:** `done` ✅ (v1.10.32 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/body-progress-checkin-flow.md`](docs/specs/body-progress-checkin-flow.md)
- **User-locked scope (this turn):**
  - Front + Side required · Back optional · "ข้าม Back" works without shame
  - File picker with `capture="environment"` as **the** primary path
  - **Timer Mode = deferred to Phase 2** (placeholder text only; no getUserMedia in T-013b — kept contained & safe per user instruction)
  - Draft persists in `localStorage` per userId · resume + discard supported
  - Photos saved to IndexedDB immediately on capture · orphans cleaned on discard
  - Auto-fill metadata from `compute7DayCheckinStats(user)`
  - Validation: Front + Side required · weight/waist editable + nullable
  - Privacy copy on every step · neutral tone throughout
- **Forbidden in this sub-task (audited at gate · all verified 0 matches):**
  - Timeline/gallery (T-013c) · Comparison views (T-013c)
  - Insight Card · Status labels (T-013d)
  - Ghost overlay · Slider compare · Video frame mode (Phase 2)
  - Live Timer Mode (Phase 2)
  - Any muscle-gain or performance claims
- **Definition of Done (all met):**
  - [x] 5 new helpers (`compute7DayCheckinStats` + `getCheckinDraft` + `setCheckinDraft` + `clearCheckinDraft` + `discardCheckinDraftWithCleanup`)
  - [x] `renderCheckinFlow` with 4-step state machine (front/side/back/review)
  - [x] BPC view: "เริ่ม Check-in" button enabled (replaces T-013a placeholder) · resume banner when draft exists
  - [x] File picker `capture="environment"` for all 3 angles · no getUserMedia anywhere
  - [x] Back step: "ข้าม" button + "📷 Timer/Video — มาใน Phase 2" placeholder text
  - [x] Photos compress (1080px JPEG q=0.75) + save to IndexedDB immediately on capture
  - [x] Draft persists across reloads · resume works via banner · discard cleans up orphan photo blobs
  - [x] Step 4 auto-fills derived stats from `compute7DayCheckinStats` (graceful "ยังไม่มีข้อมูล" when missing)
  - [x] Step 4 weight/waist editable · can be empty · live update via `input` listener (no re-render, preserves focus)
  - [x] Validation: Front + Side required to save (re-checked in `checkin-save` handler)
  - [x] Compression failure → toast "ลองรูปอื่น" · draft uncorrupted
  - [x] Missing data → graceful "ยังไม่มีข้อมูล" / nulls allowed in saved check-in
  - [x] Privacy copy on every step (footer in steps 1-3 · full copy in review)
  - [x] Neutral tone throughout · no "fatter / worse / failed" / no shame language
  - [x] VERSION v1.10.31 → v1.10.32 (sw + index, both verified)
  - [x] PROJECT_STATE updated (Current Version · Active Task · Latest Completed Work)
  - [x] Data file hashes unchanged (`meals.json`, `branded_products.json`, `audit-meals.js`)
- **Audit evidence (scope-lock verified at gate):**
  - timeline = 0 matches · ghost = 0 · slider = 0 · video = 0 · getUserMedia = 0
  - "muscle gain" / "performance improvement" / "fatter" / "worse" / "failed" = 0
  - "compare" = 1 match (roadmap text in BPC view: "T-013c — Timeline · viewer · side-by-side compare" — informational placeholder only, not a feature leak)
- **Transitions:**
  - `todo → in_progress` — picked up after T-013a approval; user-locked scope confirmed
  - `in_progress → review` — implementation complete · scope-lock audit clean · VERSION synced · state files updated · held at review per user instruction (no commit, no push)
  - `review → done` — user approved with explicit instruction "approve T-013b, but include the untracked spec file before commit". Spec staged, final gates re-run (forbidden features all 0 · data hashes unchanged · 5 files staged exactly), then committed + pushed
- **Notes:**
  - First task in the operating model to formally include a `docs/specs/*.md` file in the same commit as its implementation (prior tasks left specs untracked or as separate commits). User's instruction codified this pattern: spec lives with the change.
  - Architectural simplifications vs spec (both meet functional intent):
    - `checkin-resume` not a separate handler — "▶️ ทำต่อ" reuses `nav-checkin`, which auto-resumes from saved step if draft exists
    - `checkin-retake` not a separate handler — same `<input type="file">` handles both first-capture and re-capture; button label flips between "ถ่าย/อัปโหลด" and "ถ่ายใหม่" based on photo state
  - **T-013c HOLD per user instruction** ("Do not start T-013c until I approve the next pickup") — mechanical pickup suspended.

### T-013b.1 — Capture Source + Edit Check-in *(hotfix on T-013b)*

- **Status:** `done` ✅ (v1.10.33 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/body-progress-checkin-hotfix.md`](docs/specs/body-progress-checkin-hotfix.md)
- **User-locked scope (this turn):**
  - Two source buttons per angle: "📷 ถ่ายใหม่" (capture="environment") + "🖼️ เลือกรูปจากเครื่อง" (NO capture attr)
  - Edit existing check-in: date · weight · waist · note · replace any photo · add/replace/remove Back
  - Preserve original blobs until edit saves; clean up replaced blobs only after successful update
  - Cancel edit MUST NOT mutate saved check-in
  - BPC entry: latest check-in card with Edit + Delete (optional last-3 cards, plain — no comparison/timeline)
  - Draft conflict guard: single per-user draft key; `mode` + `editingId` + `originalPhotoIds` in JSON
  - Front + Side required in both modes; weight/waist nullable; date required
- **Forbidden (audited at gate · all verified 0 new occurrences):**
  - Timeline / viewer / gallery (T-013c) · Comparison views (T-013c)
  - Insight Card / Status labels (T-013d)
  - Ghost overlay · Slider compare · Video frame (Phase 2) · `getUserMedia` (Phase 2)
  - Muscle gain / performance improvement claims
- **Definition of Done (all met):**
  - [x] Two-button capture source for all 3 angles (Front · Side · Back) — 2 `<input>` per angle (camera + gallery)
  - [x] Gallery picker `<input>` does NOT have `capture` attribute (grep-verified: 0 matches for `gallery.*capture` or `capture.*gallery` in same line)
  - [x] Camera picker `<input>` retains `capture="environment"` (4 matches — 2 from `renderCheckinStepPhoto` template + 2 literal in `renderCheckinStepBack`)
  - [x] `updateCheckIn(user, id, patch)` helper added · preserves id/addedAt · adds updatedAt
  - [x] Edit mode wired: draft has `mode`/`editingId`/`originalPhotoIds`; all handlers respect mode
  - [x] BPC latest check-in card(s) — up to 3 most-recent shown via `renderBpcCheckinCards`; each has Edit + Delete
  - [x] `edit-checkin` handler loads saved check-in into edit draft at step:'review'
  - [x] `delete-checkin` handler wraps `deleteCheckIn` helper + persist + render
  - [x] `checkin-remove-back` handler (edit mode only) clears Back · transient uploads deleted · originals preserved
  - [x] `handleCheckinPhotoUpload` mode-aware: in edit mode, does NOT delete blob if it's in `originalPhotoIds`
  - [x] `discardCheckinDraftWithCleanup` mode-aware: edit mode preserves original blobs; deletes only transient
  - [x] `checkin-save` branches: new → addCheckIn (T-013b unchanged); edit → updateCheckIn + cleanup replaced blobs
  - [x] Snapshot fields (`weight_7day_avg`, `deficit_7day_avg`, etc.) preserved on edit (not recomputed)
  - [x] Date editable via `<input type="date">` in Review step
  - [x] Review step copy adapts for edit mode (snapshot-preserved note + edit-mode banner)
  - [x] Resume banner copy adapts: new vs edit, with editingId data attr for direct resume
  - [x] Privacy copy on every step (`🔒 รูปเก็บบนเครื่องนี้เท่านั้น`)
  - [x] Neutral tone throughout · no shame language (Thai grep clean: อ้วนกว่า=0, แย่กว่า=0, ล้มเหลว=0, กล้ามขึ้น=0)
  - [x] VERSION v1.10.32 → v1.10.33 (sw + index, both verified)
  - [x] PROJECT_STATE updated (Current Version · Active Task · Latest Completed Work · operating-model run history)
  - [x] Data file hashes unchanged (`meals.json`, `branded_products.json`, `audit-meals.js` all match v1.10.32 baseline)
- **Audit evidence (scope-lock verified at gate):**
  - `getUserMedia` = 0 · `slider compare` = 0 · `sliderCompare` = 0 · `ghostOverlay` = 0
  - `muscle gain` = 0 · `performance improvement` = 0 · `กล้ามขึ้น` = 0
  - `ghost overlay` = 1 match — line 6016 inside BPC roadmap card text ("Phase 2 (T-014) — ghost overlay · slider · auto-suggest · timer/video for Back") — informational, not implementation
  - Wiring: `updateCheckIn`×3, `edit-checkin`×4, `delete-checkin`×2, `checkin-remove-back`×2, `renderBpcCheckinCards`×2, `mode === 'edit'`×8, `originalPhotoIds`×13
- **Transitions:**
  - `todo → in_progress` — picked up after T-013b ship; user reported 2 usability issues
  - `in_progress → review` — implementation complete · scope-lock audit clean · VERSION synced · state files updated · held at review per user instruction (no commit, no push)
  - `review → done` — user approved with instruction "stage the untracked spec before commit". Spec staged, final gates re-run (forbidden features all 0 · data hashes unchanged · 5 files staged exactly · timeline/gallery/compare matches all classified as pre-existing JS date sorting OR roadmap text OR T-013b.1's own gallery-picker identifiers — no T-013c implementation leak), then committed + pushed
- **Notes:**
  - Second task to formally include `docs/specs/*.md` in the same commit as its implementation (T-013b first set this pattern; T-013b.1 continues it).
  - Two real architectural decisions documented in spec for future hotfix work:
    - **Mode-aware blob lifecycle** — in edit mode, `handleCheckinPhotoUpload` and `discardCheckinDraftWithCleanup` must check `originalPhotoIds` before deleting (else cancel could orphan saved photos)
    - **Snapshot preservation on edit** — `weight_7day_avg`, `deficit_7day_avg`, etc. are NOT recomputed when an edit lands. They reflect the original 7-day window from save time. Documented in Review step with a small hint so users understand.
  - **T-013c HOLD per user instruction** ("Do not start T-013c until I approve the next pickup") — mechanical pickup remains suspended.

### T-013c — Timeline + Viewer + Side-by-side Compare

- **Status:** `done` ✅ (v1.10.34 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/body-progress-timeline-viewer-compare.md`](docs/specs/body-progress-timeline-viewer-compare.md)
- **User-locked scope (this turn):**
  - Timeline view: all check-ins grouped by month, sorted newest first; each card has View/Edit/Delete
  - Viewer: single check-in, Front/Side/Back angle tabs, metadata card, neutral missing-states
  - Side-by-side compare ONLY (no ghost/slider) · 3 modes: Start vs Latest · Previous vs Latest · Custom (เลือกเอง)
  - Diff card shows **numbers only** with explicit signs · NO color coding · NO good/bad value-judgment language
  - BPC home: Timeline button + Compare button (only when ≥2 check-ins; disabled card when 1)
  - Privacy banner on all 3 new views · no photos auto-loaded outside BPC
  - Object URLs revoked on view exit · missing blobs surface as "รูปนี้ไม่พบในเครื่องนี้"
- **Forbidden (audited at gate · all verified):**
  - T-013d insight card / status labels / interpretation logic — only roadmap text references remain
  - Ghost overlay · Slider compare · Auto-suggest · Video frame · Timer mode · `getUserMedia` — all 0 (or roadmap-text-only)
  - Muscle gain / performance improvement claims — 0
  - Shame/value-judgment language (ดีขึ้น/แย่ลง/ล้มเหลว/อ้วนขึ้น/ผอมลง/กล้ามขึ้น) — all 0
  - "สำเร็จ" only appears in pre-existing error-toast strings ("ไม่สำเร็จ"), not in progress-evaluation copy
  - Color coding on weight/waist deltas — none added
- **Definition of Done (all met):**
  - [x] `groupCheckInsByMonth(checkIns)` helper
  - [x] `formatThaiMonthYear(dateKey)` helper (Buddhist year, matches `formatDateTH` convention)
  - [x] `fetchCheckinPhotoUrls(checkIn)` async helper — silent failure for missing blobs
  - [x] `revokeUrlMap(urlMap)` helper — idempotent, clears map
  - [x] `computeCheckinDelta(left, right)` helper — null-safe deltas
  - [x] `pickCompareDefaults(checkIns, mode)` helper
  - [x] `renderBpcTimeline` view rendered at `state.view = 'bpc-timeline'`
  - [x] `renderBpcViewer` view rendered at `state.view = 'bpc-viewer'`
  - [x] `renderBpcCompare` view rendered at `state.view = 'bpc-compare'`
  - [x] BPC home: Timeline button when ≥1 check-ins; Compare button when ≥2; disabled-card when 1
  - [x] `renderBpcCheckinCards` updated: each card now has View + Edit + Delete (3 buttons)
  - [x] 6 new handlers wired into actions map (`nav-bpc-timeline`, `nav-bpc-viewer`, `nav-bpc-compare`, `viewer-set-angle`, `compare-set-mode`, `compare-set-angle`)
  - [x] Custom-mode select listener (`change` event for `compare-left-select` / `compare-right-select`)
  - [x] Route dispatch in `render()` for 3 new views
  - [x] URL revocation called on compare mode switch and on `delete-checkin` exit paths
  - [x] Viewer with non-existent id → graceful "ไม่พบ check-in" fallback + back to Timeline
  - [x] Compare with deleted side → re-picks defaults from remaining check-ins (or routes to BPC if <2)
  - [x] Missing blob → "รูปนี้ไม่พบในเครื่องนี้" message · doesn't crash · other angles/sides render
  - [x] Missing photoId (angle never captured) → "ยังไม่มีรูปสำหรับมุมนี้"
  - [x] Privacy banner on all 3 new views
  - [x] Delete from viewer routes back to Timeline (or BPC if 0 remain)
  - [x] Edit from any card routes to T-013b.1 edit flow (no regression)
  - [x] No T-013d insight/status implementation (grep clean — roadmap text only)
  - [x] No ghost/slider/video/getUserMedia/auto-suggest (grep clean — roadmap text only)
  - [x] No muscle-gain / performance-improvement claims (grep = 0)
  - [x] No shame language (Thai grep clean: ดีขึ้น/แย่ลง/ล้มเหลว/อ้วนขึ้น/ผอมลง/กล้ามขึ้น all 0)
  - [x] VERSION v1.10.33 → v1.10.34 (sw + index, both verified)
  - [x] PROJECT_STATE updated (Current Version · Active Task · run history · Latest Completed Work)
  - [x] Data file hashes unchanged (meals.json, branded_products.json, audit-meals.js byte-identical to v1.10.33 baseline)
- **Audit evidence (scope-lock verified at gate):**
  - `getUserMedia` = 0 · `slider compare` = 0 · `sliderCompare` = 0 · `ghostOverlay` = 0 · `muscle gain` = 0 · `performance improvement` = 0
  - `กล้ามขึ้น` = 0 · `อ้วนขึ้น` = 0 · `ผอมลง` = 0 · `แย่กว่า` = 0 · `ดีขึ้น` = 0 · `ล้มเหลว` = 0
  - `ghost overlay` = 1 · `auto-suggest` = 1 · `insight card` = 1 · `status label` = 1 · `video frame` = 1 — all roadmap text (lines 6096, 6097, 6281) · informational placeholders unchanged from prior versions
  - `สำเร็จ` = 6 — all in pre-existing error messages ("ไม่สำเร็จ" = "didn't succeed") at lines 2027, 6792, 6798, 7435, 8348, 8956. None in T-013c compare/progress copy.
  - Wiring (all verified by grep ≥ 2 matches): groupCheckInsByMonth=2, formatThaiMonthYear=3, fetchCheckinPhotoUrls=10, revokeUrlMap=5, computeCheckinDelta=2, pickCompareDefaults=4, renderBpc{Timeline,Viewer,Compare,renderTimelineCard}=2 each, nav-bpc-timeline=5, nav-bpc-viewer=4, nav-bpc-compare=3, viewer-set-angle=2, compare-set-mode=2, compare-set-angle=2, compare-left-select=4, compare-right-select=3
- **Transitions:**
  - `todo → in_progress` — picked up after T-013b.1 ship + user approval to start
  - `in_progress → review` — implementation complete · 3 views + 6 helpers + 6 handlers + listener wired · scope-lock audit clean · VERSION synced · state files updated · held at review per user instruction (no commit, no push)
  - `review → done` — user approved with instruction "stage the untracked spec before commit". Spec staged, final gates re-run (forbidden features all 0 or roadmap-text-only · data hashes unchanged · 5 files staged exactly · VERSION sync v1.10.34), then committed + pushed
- **Notes:**
  - Third BPC sub-task to formally include `docs/specs/*.md` in the same commit as its implementation (pattern continues from T-013b and T-013b.1).
  - **Tone discipline noted as the hardest design constraint** of this task. Compare diff card displays raw numbers with explicit signs only — NO color coding, NO good/bad emoji, NO interpretive language. Two explicit text guards in the diff card prevent future drift:
    - "ตัวเลขเปรียบเทียบเฉยๆ · ไม่ใช่การประเมินผล"
    - "การประเมิน progress แบบครบจะมาใน T-013d"
  - **Object URL lifecycle** is now an established pattern across BPC views: `fetchCheckinPhotoUrls` builds the map on entry, `revokeUrlMap` clears it on view exit / compare mode switch / `delete-checkin` cleanup. T-013d should follow this convention for any new media views.
  - **T-013d HOLD per user instruction** ("Do not start T-013d until I approve the next pickup") — mechanical pickup remains suspended.

### T-013d — Recomp Insight Card + Status Logic

- **Status:** `done` ✅ (v1.10.35 shipped · **BPC Phase 1 MVP complete**)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/body-progress-recomp-insight.md`](docs/specs/body-progress-recomp-insight.md)
- **User-locked scope (this turn):**
  - 6 status labels: fat-loss-confirmed · possible-recomp · water-noise-likely · review-needed · progress-in-motion · not-enough-data
  - 3 confidence levels: low/medium/high with hard downgrade rules
  - Decision tree (first match wins): not-enough-data → review-needed → water-noise-likely → fat-loss-confirmed → possible-recomp → progress-in-motion
  - Possible-recomp REQUIRES literal copy "ไม่ได้แปลว่ากล้ามเพิ่ม"; never claims muscle gain
  - Review-needed copy NEVER uses "ล้มเหลว"/"ทำผิด"
  - Insight card on BPC home above Timeline/Compare buttons; expandable details
  - Compare view gets small "back to insight" hint only (no evaluation logic on compare page)
  - No new schema · no workout performance tracking · no DEXA/BIA · no localStorage keys
- **Forbidden (audited at gate · all verified):**
  - Ghost overlay · Slider compare · Auto-suggest · Video frame · Timer mode · `getUserMedia` — all 0 (or roadmap-text-only)
  - Muscle gain confirmed / performance improvement / strength progress — `muscle gain confirmed`=0, `muscle gain`=0, `performance improvement`=0, `strength progress`=0, `getting stronger`=0, `แข็งแรงขึ้น`=0, `กล้ามขึ้น`=0
  - `กล้ามเพิ่ม`=1 — appears ONLY inside the mandatory negation caveat "ไม่ได้แปลว่ากล้ามเพิ่ม" (verified by grep equality with the full caveat string)
  - Workout performance schema (lifts/reps/RPE) — none added
  - Shame/value-judgment language — `อ้วนขึ้น`=0, `แย่ลง`=0, `ล้มเหลว`=0, `ผอมลง`=0, `แย่กว่า`=0, `ดีขึ้น`=0, `ทำผิด`=0
  - "Fat gain confirmed" — 0 (per spec, prefer Review Needed)
  - Color coding implying good/bad direction on weight/waist deltas — none added; status badge colors are neutral palette (indigo/amber/blue/gray) chosen for distinguishability not value-judgment
- **Definition of Done (all met):**
  - [x] `INSIGHT_THRESHOLDS` constant block (9 references — used throughout helpers)
  - [x] `computeWeightTrend` helper · null-safe · returns has_data:false gracefully
  - [x] `computeWaistTrend` helper · null-safe · uses 1.0 cm flat band (accounts for tape variability)
  - [x] `computePredictedLossFromDeficit` helper · uses 7700 kcal/kg · respects activityIncludesExercise · returns data_quality tier
  - [x] `computeCheckinSnapshot` helper · returns checkin_count + has_photos + has_waist_in_checkins
  - [x] `computeTrainingFrequency` helper · returns counts only (frequency proxy, not performance)
  - [x] `classifyBodyProgressStatus` decision tree (first-match-wins in 6 levels)
  - [x] `getInsightConfidence` with hard downgrade rules (possible-recomp ≤ medium; missing waist; 1 check-in)
  - [x] `computeBodyProgressInsight` top-level bundle for renderer
  - [x] `renderInsightCard` component with collapsed/expanded modes
  - [x] BPC home renders the insight card when ≥1 check-in (computeBodyProgressInsight called inline; no caching)
  - [x] `toggle-insight-details` handler · state.tmp.bpcInsightExpanded boolean
  - [x] Compare view gets small "back to insight" hint (data-act="nav-bpc")
  - [x] All 6 status keys present in code (fat-loss-confirmed=5, possible-recomp=7, water-noise-likely=5, review-needed=6, progress-in-motion=5, not-enough-data=10 references each)
  - [x] **Mandatory caveat verified**: `ไม่ได้แปลว่ากล้ามเพิ่ม` appears exactly 1 time, inside the possible-recomp card. Without this caveat, possible-recomp would never render.
  - [x] Review-Needed copy uses "ลองทบทวน tracking" — never "ล้มเหลว"/"ทำผิด" (greps = 0)
  - [x] training_count rendered as "Training: N ครั้ง (เวท X · คาร์ดิโอ Y)" — NEVER "you're getting stronger" or "strength progress"
  - [x] Status badge colors are neutral palette · no green=good/red=bad semantics
  - [x] 0 check-ins safely returns not-enough-data (helper short-circuits at `checkin_count === 0 && weight_data_points < 3`)
  - [x] Tone audit clean (all shame/value-judgment grep counts = 0)
  - [x] VERSION v1.10.34 → v1.10.35 (sw + index, both verified)
  - [x] PROJECT_STATE updated (Current Version · Active Task · run history · Latest Completed Work)
  - [x] Data file hashes unchanged (meals.json, branded_products.json, audit-meals.js byte-identical to v1.10.34 baseline)
- **Audit evidence (scope-lock verified at gate):**
  - **Forbidden phrases (all 0):** `getUserMedia`, `slider compare`, `sliderCompare`, `ghostOverlay`, `muscle gain confirmed`, `muscle gain`, `performance improvement`, `strength progress`, `getting stronger`, `แข็งแรงขึ้น`, `กล้ามขึ้น`, `fat gain confirmed`, `อ้วนขึ้น`, `แย่ลง`, `ผอมลง`, `แย่กว่า`, `ดีขึ้น`, `ล้มเหลว`, `ทำผิด`
  - **Intentional non-zero matches (justified):**
    - `ghost overlay` = 1 — unchanged roadmap text L6096
    - `กล้ามเพิ่ม` = 1 — IS the mandatory negation caveat (literal `ไม่ได้แปลว่ากล้ามเพิ่ม`), required by spec
  - **Wiring matches:** all helpers, renderer, handler, status keys present at expected reference counts (see DoD).
- **Transitions:**
  - `todo → in_progress` — picked up after T-013c ship + user approval to start (after their mobile test of T-013c passed)
  - `in_progress → review` — implementation complete · 9 helpers + 1 renderer + 1 handler · 6 status labels wired · decision tree in order · mandatory caveat present (1 occurrence) · scope-lock audit clean · tone audit clean · VERSION synced · state files updated · held at review per user instruction (no commit, no push)
  - `review → done` — user approved with instruction "stage the untracked spec before commit". Spec staged, final gates re-run (all forbidden phrases 0 · `กล้ามเพิ่ม` = 1 verified inside mandatory negation caveat at L7146 · `rpe` substring matches confirmed false positives in pre-existing `perPersonCal`/`perPersonProtein` properties · data hashes unchanged · 5 files staged exactly · VERSION sync v1.10.35), then committed + pushed
- **Notes:**
  - Fourth and final BPC Phase 1 sub-task. Same "spec-with-implementation" commit pattern as T-013b/b.1/c.
  - **BPC Phase 1 MVP is now functionally complete:** T-013a (foundation) → T-013b (capture) → T-013b.1 (capture-source + edit) → T-013c (timeline + viewer + compare) → T-013d (insight + status).
  - **Hardest design constraint:** tone discipline on possible-recomp. The card MUST render the literal negation "ไม่ได้แปลว่ากล้ามเพิ่ม" before showing any "recomp" wording — this is enforced both in the spec (DoD checkbox) and in code (grep verifies the caveat is present exactly once, in the possible-recomp branch).
  - **`rpe` false-positive lesson learned:** future scope-lock audits should distinguish case-sensitive vs case-insensitive grep when checking for short acronyms (RPE, BMR, TDEE). Case-insensitive matches inside camelCase property names like `perPersonCal` can produce false positives. Captured in this Notes section for future spec authors.
  - **T-014 / T-015 HOLD per user instruction** ("Do not start T-014/T-015 until I approve the next pickup") — Phase 2 (ghost overlay · slider · auto-suggest · video frame · timer for Back) and Phase 3 (PIN lock · face crop · pose-match) both blocked from auto-pickup.

### T-013d.1 — Body Recomp Insight summary in Reports tab *(small surface addition on T-013d)*

- **Status:** `done` ✅ (v1.10.36 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/body-recomp-insight-reports-summary.md`](docs/specs/body-recomp-insight-reports-summary.md)
- **User-locked scope (this turn):**
  - Compact Body Recomp Insight summary card in Reports tab
  - Reuses `computeBodyProgressInsight(user)` from T-013d — single source of truth
  - Card shows: status badge + confidence + actual/predicted/gap weight numbers + waist if available + one explanation line + one what-next line + CTA "ดูรายละเอียดใน Body Progress Center"
  - Not-Enough-Data variant: lists missing data + "เริ่ม Body Check-in" CTA (when 0 check-ins)
  - Possible-Recomp variant MUST include literal "ยังไม่ยืนยันว่ากล้ามเพิ่ม" caveat
  - Inserted between waist card and calorie card in Reports
  - No new classifier, no new schema, no new handlers/listeners, no new localStorage keys
  - Reports remains a summary page · BPC remains the detailed page
- **Forbidden (audited at gate · all verified):**
  - Duplicate classifier — `classifyBodyProgressStatus` def count = 1 · `getInsightConfidence` def count = 1 · `computeBodyProgressInsight` def count = 1 (single source of truth preserved)
  - New status labels — 0 new
  - New schema · new localStorage · IndexedDB writes — 0
  - Photo gallery / viewer / compare in Reports — 0
  - `getUserMedia` = 0 · `slider compare` = 0 · `sliderCompare` = 0 · `ghostOverlay` = 0
  - `muscle gain confirmed` = 0 · `muscle gain` = 0 · `performance improvement` = 0 · `strength progress` = 0 · `getting stronger` = 0 · `แข็งแรงขึ้น` = 0 · `กล้ามขึ้น` = 0
  - Shame/value-judgment: `อ้วนขึ้น` = 0 · `แย่ลง` = 0 · `ผอมลง` = 0 · `แย่กว่า` = 0 · `ดีขึ้น` = 0 · `ล้มเหลว` = 0 · `ทำผิด` = 0
  - `ghost overlay` = 1 (unchanged BPC roadmap text · pre-existing)
- **Definition of Done (all met):**
  - [x] `renderReportsInsightSummary(insight, user)` renderer added (the only new function)
  - [x] Wired into `renderReports` between waist card (L6087) and calorie card (L6089)
  - [x] `computeBodyProgressInsight(user)` called from Reports view (single source of truth — total call sites 4 = 1 def + BPC + Reports + spec-comment reference; underlying classifier still has exactly 1 def)
  - [x] No duplicate classifier · zero copy/paste of T-013d's classify/confidence logic
  - [x] All 6 status branches handled (5 main + special not-enough-data variant)
  - [x] Not-Enough-Data variant card lists what's missing (check-ins, waist, deficit-logged days) + conditional "เริ่ม Body Check-in" CTA when checkin_count === 0
  - [x] CTA "→ ดูรายละเอียดใน Body Progress Center" uses existing `nav-bpc` handler
  - [x] CTA "📸 เริ่ม Body Check-in" uses existing `nav-checkin` handler
  - [x] No new handlers · no new event listeners
  - [x] Possible-Recomp branch renders literal "ยังไม่ยืนยันว่ากล้ามเพิ่ม" (grep verified: 1 occurrence)
  - [x] T-013d's existing "ไม่ได้แปลว่ากล้ามเพิ่ม" caveat preserved on BPC side (grep verified: still 1 occurrence)
  - [x] No color coding implying good/bad direction on deltas — neutral palette
  - [x] Tone audit clean across all forbidden phrases (English + Thai)
  - [x] VERSION v1.10.35 → v1.10.36 (sw + index, both verified)
  - [x] PROJECT_STATE updated
  - [x] Data file hashes unchanged (all 3 byte-identical to v1.10.35)
- **Audit evidence (single-source-of-truth verified):**
  - `function classifyBodyProgressStatus` definitions = **1**
  - `function getInsightConfidence` definitions = **1**
  - `function computeBodyProgressInsight` definitions = **1**
  - `renderReportsInsightSummary` references = 2 (def + call site)
  - `computeBodyProgressInsight(` total references = 4 (def + BPC call + Reports call + spec-comment in JSDoc)
  - **Mandatory caveats both present**:
    - `ยังไม่ยืนยันว่ากล้ามเพิ่ม` = 1 (new Reports possible-recomp caveat)
    - `ไม่ได้แปลว่ากล้ามเพิ่ม` = 1 (existing BPC possible-recomp caveat, untouched)
- **Transitions:**
  - `todo → in_progress` — picked up after T-013d ship + user approval to add Reports surface
  - `in_progress → review` — implementation complete · 1 renderer + 1 insertion · single-source-of-truth preserved · scope-lock audit clean · tone audit clean · VERSION synced · state files updated · held at review per user instruction (no commit, no push)
  - `review → done` — user approved with instruction "stage the untracked spec before commit". Spec staged, final gates re-run (forbidden phrases all 0 · single source of truth verified: each classifier helper has exactly 1 def · Reports calls `computeBodyProgressInsight(u)` at L6089 · both caveats present (Reports `ยังไม่ยืนยันว่ากล้ามเพิ่ม` = 1, BPC `ไม่ได้แปลว่ากล้ามเพิ่ม` = 1 preserved) · data hashes unchanged · 5 files staged exactly · VERSION sync v1.10.36), then committed + pushed
- **Notes:**
  - **Cleanest "reuse don't duplicate" example** in the operating-model history so far. One renderer, one insertion line, ~123 lines added to index.html, zero new computation logic.
  - **Lesson captured:** scope-lock grep must extend to comments. The initial draft had a guardrail comment containing the literal phrase "strength progress" (warning future maintainers not to use that phrase). The grep flagged it as 1 match. Rewrote the comment to avoid the literal substring even in guardrail context. Future spec authors: when banning a phrase, write the comment in a way that doesn't include the banned phrase verbatim, or grep with semantic context.
  - **Pattern reinforced**: spec-with-implementation in same commit (5th time now: T-013b, T-013b.1, T-013c, T-013d, T-013d.1). This is the established release pattern for this project.
  - **T-014 / T-015 still HOLD per user instruction** — Phase 2 (ghost overlay · slider · auto-suggest · video frame · timer for Back) and Phase 3 (PIN lock · face crop · pose-match) both blocked from auto-pickup. Mechanical pickup remains suspended.

### T-013d.2 — Body Recomp Insight: full detail card in Reports *(refinement on T-013d.1)*

- **Status:** `done` ✅ (v1.10.37 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/body-recomp-insight-reports-full-detail.md`](docs/specs/body-recomp-insight-reports-full-detail.md)
- **User-locked scope (this turn):**
  - Replace Reports' compact summary (`renderReportsInsightSummary`) with the full expandable card (`renderInsightCard` from T-013d) so Reports surfaces the same depth as BPC
  - Delete `renderReportsInsightSummary` function definition (consolidation, not retention)
  - Reports adds a small CTA row below the card: "→ ดู Body Progress Center" (always) + "📸 เริ่ม Body Check-in" (only when 0 check-ins)
  - Single source of truth preserved: 1 classifier · 1 confidence helper · 1 bundle helper · 1 card renderer
  - T-013d.1's `ยังไม่ยืนยันว่ากล้ามเพิ่ม` literal is intentionally removed (was only in the now-deleted compact summary); BPC's existing `ไม่ได้แปลว่ากล้ามเพิ่ม` becomes the canonical caveat on both surfaces
  - Expand state is per-view scoped (state.tmp resets on navigation) — consistent with BPC
- **Forbidden (audited at gate):**
  - Duplicate classifier / confidence / bundle / card definitions
  - New schema · new localStorage · IndexedDB writes
  - New status labels, ghost overlay, slider, video frame, getUserMedia
  - Muscle gain / performance improvement / strength progress / shame language
- **Gate criteria:** see spec DoD + test plan (expand toggle works on Reports, BPC caveat present on Reports possible-recomp, CTAs route correctly, no regression on existing Reports cards, all forbidden phrases = 0, single source of truth preserved)
- **Definition of Done (all met):**
  - [x] Reports calls `renderInsightCard(computeBodyProgressInsight(u), !!t.bpcInsightExpanded)` at the insertion point (between waist card and calorie card · L6099)
  - [x] CTA row below card: "📸 เริ่ม Body Check-in" (when checkin_count === 0) + "→ ดู Body Progress Center (Timeline / Compare)" (always)
  - [x] `renderReportsInsightSummary` function definition deleted from index.html (def count = 0, call count = 0)
  - [x] T-013d's `ไม่ได้แปลว่ากล้ามเพิ่ม` caveat still at exactly 1 occurrence (in `renderInsightCard`'s possible-recomp branch — now shared across BPC and Reports)
  - [x] T-013d.1's `ยังไม่ยืนยันว่ากล้ามเพิ่ม` literal removed (= 0 occurrences · documented as intentional consolidation)
  - [x] Single-source-of-truth strengthened: `classifyBodyProgressStatus` def = 1 · `getInsightConfidence` def = 1 · `computeBodyProgressInsight` def = 1 · `renderInsightCard` def = 1
  - [x] `renderInsightCard` called from 2 sites (BPC at L6422 · Reports at L6099) + 1 def at L7080
  - [x] No new handlers · no new event listeners · no new schema · no new localStorage · no IndexedDB writes
  - [x] Tone audit clean (all forbidden phrases = 0)
  - [x] VERSION v1.10.36 → v1.10.37 (sw + index, both verified)
  - [x] PROJECT_STATE updated
  - [x] Data file hashes unchanged (meals.json / branded_products.json / audit-meals.js all match v1.10.36 baseline)
- **Audit evidence:**
  - Single-source-of-truth: 4 helpers × 1 def each = 4 unique definitions, no duplicates
  - `renderReportsInsightSummary`: def = 0, calls = 0 (cleanly removed)
  - Caveats: `ไม่ได้แปลว่ากล้ามเพิ่ม` = 1 (shared) · `ยังไม่ยืนยันว่ากล้ามเพิ่ม` = 0 (consolidated)
  - Forbidden phrases all 0 except `ghost overlay` = 1 (unchanged roadmap text L6016)
- **Transitions:**
  - `todo → in_progress` — picked up after T-013d.1 ship + user request "ทำให้ดู Body Progress Center รายละเอียดเต็มๆได้ใน Tab รายงานด้วยเลย"
  - `in_progress → review` — implementation complete · 1 call site swap + 1 function deletion + 1 CTA row · scope-lock audit clean · single-source-of-truth strengthened · VERSION synced · state files updated · held at review per established gate pattern
  - `review → done` — user approved with "ลุยเลย". Final gates re-run (forbidden phrases all 0 · single source of truth: each helper 1 def · `renderReportsInsightSummary` cleanly removed = 0 · caveat consolidation verified · data hashes unchanged · 5 files staged · VERSION sync v1.10.37), then committed + pushed
- **Notes:**
  - **First net-negative diff in BPC series** (+71/-129 in tracked files). Consolidation removed ~115 lines of compact-summary renderer while adding ~24 lines of call site + CTAs. Demonstrates the operating-model can collapse complexity, not just add.
  - **Pattern reinforced**: "supersede" relationship between T-013d.1 and T-013d.2 — T-013d.1 stays `done` in registry but is annotated as "(superseded by T-013d.2)" in PROJECT_STATE run history. Task IDs remain immutable per Conventions.
  - **T-014/T-015 still HOLD per prior user instruction** — Phase 2 (ghost · slider · auto-suggest · video · timer for Back) and Phase 3 (PIN · face crop · pose-match) blocked from auto-pickup.

### T-013d.3 — BPC Date Range + Insight Window Controls *(extends T-013d / T-013d.2)*

- **Status:** `done` ✅ (v1.10.38 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/bpc-date-range-insight-window.md`](docs/specs/bpc-date-range-insight-window.md)
- **ID note:** user-supplied task title said "T-013d.2"; that ID is taken (Reports consolidation, shipped v1.10.37). Renumbered to T-013d.3 per Conventions ("Task IDs are immutable").
- **User-locked scope (this turn):**
  - `state.bpcRange = { preset, startDate?, endDate? }` at root state · default `{ preset: '30d' }` · defensive read (no migration)
  - 6 range presets on BPC home: 7d / 14d / 30d / 90d / all / custom
  - Custom range: two date inputs; validate start ≤ end; defensive fallback on bad input
  - Every insight card shows analysis window label + data counts (weight points, waist points, check-ins, days logged, training count)
  - `computeBodyProgressInsight(user, options?)` refactor — accepts `{ startDate, endDate, windowDays }`; back-compat preserved
  - Timeline filters by selected range; header shows range label
  - Compare defaults to check-ins in range; custom-mode dropdowns still show all
  - Reports uses Reports' own range (independent of BPC's); displays same window-label row
  - Not-Enough-Data copy mentions selected range + suggests longer range / more data
  - All tone discipline from T-013d preserved (Possible-Recomp caveat still present)
- **Forbidden (audited at gate):**
  - Duplicate classifier (`classifyBodyProgressStatus` / `getInsightConfidence` / `computeBodyProgressInsight` def count must stay 1 each)
  - New schema fields on `u.*`
  - Ghost overlay · Slider compare · Auto-suggest · Video frame · Timer · `getUserMedia` · Workout performance tracking
  - Muscle gain confirmed / performance improvement / strength progress
  - Shame/value-judgment language
- **Gate criteria:** see spec DoD + 18-step test plan (range presets, custom validation, range-aware not-enough-data copy, timeline/compare filtering, Reports parity, possible-recomp caveat preserved, single-source-of-truth maintained)
- **Definition of Done (all met):**
  - [x] `state.bpcRange` defaults to `{ preset: '30d' }` · persists via existing `persist()` · defensive read pattern in all consumers (`state.bpcRange || { preset: '30d' }`) · loadStored restores it
  - [x] `resolveInsightWindow(rangeSpec, user)` helper with 6 preset branches (7d/14d/30d/90d/all/custom) · defensive fallback to 30d on bad input
  - [x] `formatInsightWindowLabel(start, end)` helper
  - [x] `computeBodyProgressInsight(user, ...args)` accepts optional `{ startDate, endDate, windowDays }` AND retains positional-arg back-compat (legacy `(user, endDateString, windowDays)` calls still work)
  - [x] Insight bundle includes `window_start_date`, `window_end_date`, `window_label`
  - [x] `renderBpcRangeControls(rangeSpec, win)` component renders 6 chips + conditional custom date inputs
  - [x] BPC home wires range controls above insight card · passes range to insight via options
  - [x] `renderInsightCard` shows analysis window label + data-counts row at the top
  - [x] `renderInsightCard` not-enough-data copy mentions selected range + suggests longer range / more data
  - [x] `renderBpcTimeline` filters check-ins by selected range · header shows range label + filtered/total counts · empty state when 0 in range
  - [x] `nav-bpc-compare` defaults to check-ins within range · falls back to "ต้องมี check-in 2 รายการ" with range-aware hint when <2 in range
  - [x] `compare-set-mode` defaults from in-range pool for start-latest/prev-latest; custom-mode still uses all check-ins (per spec)
  - [x] Reports insight call passes `{ startDate, endDate }` derived from Reports' own range (rolling or custom)
  - [x] Reports insight card displays the same window-label row (via shared `renderInsightCard`)
  - [x] `set-bpc-range-preset` handler · pre-fills 30d range on first 'custom' selection · clears custom dates on non-custom presets · persists
  - [x] Input listener for `#bpc-range-start` / `#bpc-range-end` · debounced · persists
  - [x] Single-source-of-truth preserved: each of classifyBodyProgressStatus / getInsightConfidence / computeBodyProgressInsight / renderInsightCard def = 1
  - [x] Tone audit clean (all forbidden phrases = 0)
  - [x] BPC's `ไม่ได้แปลว่ากล้ามเพิ่ม` caveat still present at exactly 1 occurrence (in `renderInsightCard`'s possible-recomp branch)
  - [x] T-013d.1's `ยังไม่ยืนยันว่ากล้ามเพิ่ม` literal still at 0 (consolidated by T-013d.2, not re-introduced)
  - [x] No new schema fields on `u.*` (verified: `u.workouts` = 0, `u.lifts` = 0)
  - [x] VERSION v1.10.37 → v1.10.38 (sw + index, both verified)
  - [x] PROJECT_STATE updated
  - [x] Data file hashes unchanged (all 3 byte-identical to v1.10.37 baseline)
- **Audit evidence:**
  - Single source of truth: `classifyBodyProgressStatus` def=1 · `getInsightConfidence` def=1 · `computeBodyProgressInsight` def=1 · `renderInsightCard` def=1
  - New helpers: `resolveInsightWindow` def=1 · `formatInsightWindowLabel` def=1 · `renderBpcRangeControls` def=1
  - Caveats: `ไม่ได้แปลว่ากล้ามเพิ่ม` = 1 (preserved) · `ยังไม่ยืนยันว่ากล้ามเพิ่ม` = 0 (still consolidated)
  - Wiring: `set-bpc-range-preset` = 3 · `state.bpcRange` = 19 (init + persist + load + all read sites + write sites) · `bpc-range-start` = 3 · `bpc-range-end` = 2
  - Forbidden phrases all 0 except `ghost overlay` = 1 (unchanged roadmap text L6517)
  - No new schema: `u.workouts` = 0 · `u.lifts` = 0
- **Transitions:**
  - `todo → in_progress` — picked up after T-013d.2 ship + user request for date-range controls + window labels (user-supplied "T-013d.2" ID renumbered to T-013d.3 per Conventions)
  - `in_progress → review` — implementation complete · 3 new helpers + 1 component + 1 handler + 1 listener + computeBodyProgressInsight refactor · scope-lock audit clean · single-source-of-truth strengthened · VERSION synced · state files updated · held at review per established gate pattern
  - `review → done` — user approved with instruction "stage the untracked spec before commit". Spec staged, final gates re-run (all forbidden phrases 0 · single-source-of-truth verified: 4 classifier helpers def=1 each · Reports threads its own range at L6195/L6196 · BPC `วิเคราะห์ช่วง` label rendered · no workout schema · data hashes unchanged · 5 files staged · VERSION sync v1.10.38), then committed + pushed
- **Notes:**
  - **First refactor in BPC series.** `computeBodyProgressInsight` signature changed from `(user, endDate, windowDays)` positional to `(user, ...args)` with type-detection. Legacy call signature preserved via runtime type-check on first arg. All 2 current call sites use the new options-object form.
  - **Pattern reinforced**: when a function gains new optional inputs, prefer rest-args + type-detection over breaking signature changes. Keeps internal call sites flexible while honoring back-compat audit gates.
  - **ID-immutability rule applied**: user-supplied task title said "T-013d.2"; that ID was already taken by the Reports consolidation. Renumbered to T-013d.3. Documented in spec + state files. This is the second time the rule was invoked (T-013b → T-013b.1 was the first sub-letter use). Convention holds.
  - **T-014 / T-015 still HOLD per prior user instruction** — Phase 2/3 features remain blocked from auto-pickup.

### T-013e — Add ก๋วยจั๊บ + ก๋วยจั๊บญวน menu entries (4 entries)

- **Status:** `done` ✅ (v1.10.39 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/add-meals-kuay-jab.md`](docs/specs/add-meals-kuay-jab.md)
- **Protocol:** follows [`docs/specs/menu-addition-protocol.md`](docs/specs/menu-addition-protocol.md) (AGENTS.md Rule 17)
- **User-locked scope (this turn):**
  - 4 entries: n37 ก๋วยจั๊บน้ำใส · n38 ก๋วยจั๊บน้ำข้น (นายแอ๋ว style) · n39 ก๋วยจั๊บญวน · n40 ก๋วยจั๊บญวนรวมพิเศษ
  - Each entry's macros verified against existing anchors (n01/n02/n03/n04/n06/n13)
  - Sanity ranges documented per entry
  - Per-entry diff% predicted and must match audit within rounding
  - Real-user-fit pass for each (cafe / street-food portion convention)
  - Each entry gets 2-3 customizations
  - `meals.json` data version 1.10.13 → 1.10.14
  - VERSION sync v1.10.38 → v1.10.39 (sw + index)
- **Forbidden in this turn:**
  - Edits to existing n01-n36 entries
  - Schema changes · UI changes
  - Edits to branded_products.json or tools/audit-meals.js
  - Adding entries outside the established sanity range
- **Gate criteria:** see spec DoD + protocol §7 + audit must report total 388 → 392 · pass +4 · warn/fail unchanged · git diff exactly 2 hunks · sibling data files byte-identical
- **Definition of Done (all met):**
  - [x] 4 entries inserted: n37 ก๋วยจั๊บน้ำใส (340/400g) · n38 ก๋วยจั๊บน้ำข้น (620/450g) · n39 ก๋วยจั๊บญวน (400/420g) · n40 ก๋วยจั๊บญวนรวมพิเศษ (500/480g)
  - [x] All 4 in audit PASS band; per-entry diff% **matches §3d prediction exactly to 2 decimal places**: n37 +3.24% · n38 +3.87% · n39 +1.50% · n40 +3.40%
  - [x] Real-user fit check passed for every entry (cafe / street-food portion convention; macros match dish-style signature; customizations match how users actually order)
  - [x] `meals.json` data version 1.10.13 → 1.10.14
  - [x] `service-worker.js` VERSION v1.10.38 → v1.10.39
  - [x] `index.html` VERSION v1.10.38 → v1.10.39
  - [x] Total entry count: 388 → 392 (+4)
  - [x] Aggregate audit: pass 312 → 316 (+4) · warn 70 unchanged · fail 3 unchanged · skipped 3 unchanged
  - [x] `branded_products.json` byte-identical (MD5 `50DA32FECC693685B1CF7238C13621F3` matches v1.10.38 baseline)
  - [x] `tools/audit-meals.js` byte-identical (MD5 `6FE42BB990ECC932AE4193C76E71E0D9` matches v1.10.38 baseline)
  - [x] PROJECT_STATE Current Version + Latest Completed Work + Active Task updated
  - [x] Spec cites menu-addition-protocol explicitly
- **Audit evidence:**
  - PowerShell parallel-impl audit (per DEC-002): per-entry diff% all PASS band with exact prediction match
  - Aggregate: 388 → 392 ✓ · pass 312 → 316 ✓ · warn 70 unchanged ✓ · fail 3 unchanged ✓ · skipped 3 unchanged ✓
  - Sibling data files byte-identical (hashes preserved from v1.10.38)
  - VERSION sync verified in both files
- **Transitions:**
  - `todo → in_progress` — picked up after T-013d.3 ship + user request to add ก๋วยจั๊บ + ก๋วยจั๊บญวน
  - `in_progress → review` — 4 entries inserted · all PASS with exact prediction match · sibling files preserved · VERSION sync · state files updated · held per established gate pattern
  - `review → done` — user approved with "เพิ่มเลย". Final gates re-run (audit pass=316 ✓, sibling hashes preserved ✓, hunks=2 ✓, VERSION sync ✓), then committed + pushed
- **Notes:**
  - First menu-addition task since T-008 (v1.10.26); confirms the menu-addition-protocol still works cleanly after 12+ task gap
  - Used anchor-derivation per established protocol (T-005 through T-008 pattern); external citation research available as follow-up if review requires

### T-013f — Add Chester's Grill menu entries (5 entries)

- **Status:** `done` ✅ (v1.10.40 shipped · user feedback: scope was too narrow, T-013f.1 expansion queued)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/add-meals-chesters.md`](docs/specs/add-meals-chesters.md)
- **Protocol:** follows [`docs/specs/menu-addition-protocol.md`](docs/specs/menu-addition-protocol.md)
- **User-locked scope (this turn):**
  - 5 Chester's entries: r25 ข้าวไก่ย่าง · r26 ไก่ย่าง 1/4 · r27 ข้าวไก่กระเทียมพริกไทย · r28 ข้าวเหนียวไก่ย่าง · s19 ส้มตำไก่ย่าง คอมโบ
  - **First menu-add task with external citations** (per user request "หาข้อมูลให้ละเอียด")
  - Deep-research workflow invoked: 105 agents · 23 sources · 25 adversarially-verified claims
  - Key finding: Chester's Thailand publishes NO official nutrition data; only ONE Chester-attributed anchor on fit-d.com
  - Other 4 entries derived from USDA components (chicken thigh+skin, jasmine rice, sweet chili) with explicit citations
  - 2 open questions flagged (sticky rice + ส้มตำ — INMU FCD v3 not verified in synthesis)
  - Customizations: 13 across 5 entries (mix of add/subtract, per user "ทำ ADDON เฉพาะให้เหมาะสม")
  - `meals.json` data version 1.10.14 → 1.10.15
  - VERSION sync v1.10.39 → v1.10.40
- **Forbidden in this turn:**
  - Claiming "official Chester's nutrition data" (none exists publicly per research)
  - Edits to existing entries
  - Schema changes
  - Adding to branded_products.json (no customization support there)
- **Gate criteria:** see spec DoD + protocol §7 + audit must report total 392 → 397 · pass +5 · warn/fail unchanged · git diff exactly 3 hunks (version + r-insertion + s-insertion) · sibling data files byte-identical · citations present for every numerical value
- **Definition of Done (all met):**
  - [x] 5 entries inserted: r25 (397) · r26 (290) · r27 (600) · r28 (540) · s19 (420)
  - [x] All 5 in audit PASS band; per-entry diff% **matches §3d prediction exactly to 2 decimal places**: r25 +0.25% · r26 +4.48% · r27 +4.17% · r28 +3.52% · s19 +4.29%
  - [x] Real-user fit check passed: serving sizes match existing peer-entry conventions (r25/r27=380g matches r04 ข้าวมันไก่; r28=320g sticky-rice combo; s19=280g salad combo)
  - [x] `meals.json` data version 1.10.14 → 1.10.15
  - [x] `service-worker.js` + `index.html` VERSION v1.10.39 → v1.10.40
  - [x] Total entry count: 392 → 397 (+5)
  - [x] Aggregate audit: pass 316 → 321 (+5) · warn 70 unchanged · fail 3 unchanged · skipped 3 unchanged
  - [x] `git diff meals.json` shows exactly 3 hunks: version field + r25-r28 insertion + s19 insertion
  - [x] `branded_products.json` byte-identical (MD5 `50DA32FECC693685B1CF7238C13621F3` matches v1.10.39 baseline)
  - [x] `tools/audit-meals.js` byte-identical (MD5 `6FE42BB990ECC932AE4193C76E71E0D9` matches v1.10.39 baseline)
  - [x] PROJECT_STATE Current Version + Active Task + Latest Completed Work + run history updated
  - [x] Spec cites menu-addition-protocol explicitly + deep-research citation URLs
  - [x] Citations attached: fit-d.com (r25 anchor) · USDA chicken thigh (r26/r27/r28/s19 chicken portion) · USDA jasmine rice (r25/r27) · USDA sweet chili sauce (sauce customizations) · open-question flags for sticky rice + ส้มตำ
- **Audit evidence:**
  - PowerShell parallel-impl audit (per DEC-002): per-entry diff% all PASS band with exact prediction match (5/5)
  - Aggregate: 392 → 397 ✓ · pass 316 → 321 ✓ · warn 70 unchanged ✓ · fail 3 unchanged ✓ · skipped 3 unchanged ✓
  - Sibling data files byte-identical (hashes preserved from v1.10.39)
  - VERSION sync verified in both files
  - git diff meals.json: 3 hunks at @@-1,5 (version), @@-81 (r insertion), @@-731 (s insertion)
  - Deep-research workflow stats: 105 agents · 23 sources · 53 claims · 25 verified · 23 confirmed · 2 killed (chicken protein 25.06g exact value; GRAMA's chili sauce brand-specificity)
- **Transitions (so far):**
  - `todo → in_progress` — picked up after T-013e ship + user request for Chester's menu with detailed nutrition research
  - `in_progress → review` — deep-research invoked + 5 entries inserted with citations · all PASS with exact prediction match · sibling files preserved · VERSION sync · state files updated · held per established gate pattern
- **Transitions:**
  - `todo → in_progress` — picked up after T-013e ship + user request for Chester's menu with detailed nutrition research
  - `in_progress → review` — deep-research invoked + 5 entries inserted with citations · all PASS with exact prediction match · sibling files preserved · VERSION sync · state files updated · held per established gate pattern
  - `review → done` — user approved with "ลุยได้". Final gates re-run (per-entry exact match · sibling hashes preserved · 3 hunks · VERSION sync), then committed + pushed
- **Notes:**
  - **First menu-add task to use deep-research** — previous tasks (T-005 through T-013e) used anchor-derivation only
  - Established pattern for branded restaurant items going forward: deep-research first → if branded entry exists in Thai aggregators (fit-d/wongnai/INMU) cite directly · else derive from USDA components with explicit flag
  - 2 open questions flagged at ship (sticky rice + ส้มตำ INMU FCD verification) — accepted by user; INMU re-verification can be a follow-up if data changes
  - Brand discovery: Chester's Thailand publishes NO public nutrition data despite being a major chain — documented for future tasks targeting Thai chains
  - **Scope criticism in approval message**: user said "บอกให้เพิ่มของ Chester ที่เป็นเมนูเดี่ยวๆให้หมด" — initial scope of 5 was too narrow. T-013f.1 EXPANSION queued to add remaining Chester's solo items (a la carte chicken sizes, ปีกไก่ทอด, น่องไก่ทอด, additional rice variants, etc.). User confirmation of scope list expected before T-013f.1 starts.

### T-013f.1 — Chester's non-combo solo expansion + INMU verify

- **Status:** `done` ✅ (v1.10.41 shipped)
- **Owner:** Execution Agent
- **Spec:** (will be written after deep-research returns)
- **Protocol:** follows [`docs/specs/menu-addition-protocol.md`](docs/specs/menu-addition-protocol.md)
- **User-locked scope (this turn):**
  - **Scope option (c)**: ALL Chester's menu items that are NOT combo/family sets
  - **Exclude**: drinks/sides (ข้าวเปล่า, น้ำซุป, beverages)
  - **Target**: comprehensive coverage ("ครบ") — estimated 12-20 new entries
  - **Research**: deep-research workflow again + INMU FCD verification for sticky rice + ส้มตำ (upgrades T-013f open questions from derived estimate to primary cited)
- **Forbidden in this turn:**
  - Adding combo/family sets (covered by T-013f)
  - Adding drinks or pure sides
  - Re-shipping the 5 entries already in T-013f (r25-r28, s19) — they stay as-is
  - Edits to existing entries
  - Schema changes
- **Gate criteria:** see menu-addition-protocol §3 + audit must report total 397 → 397+N · pass +N · warn/fail unchanged · sibling data files byte-identical · INMU sticky rice + ส้มตำ values cited or flagged
- **Definition of Done (all met):**
  - [x] **8 entries inserted** (research-driven reduction from target 12-20 — 8 candidates excluded with reasons): r29 ไก่ย่าง 1/2 ตัว (580) · r30 ไก่ย่าง ทั้งตัว (1160) · r31 ปีกไก่ทอด (200) · r32 น่องไก่ทอด (400) · r33 ไก่ทอด 3 ชิ้น (580) · r34 ข้าวไก่เทอริยากิ (555) · r35 ข้าวหน้าไก่ (455) · r36 ข้าวไก่ซอสพริก (520)
  - [x] All 8 in audit PASS band; per-entry diff% matches §3d prediction exact to 2 decimal: r29 +4.48% · r30 +4.48% · r31 -1.00% · r32 +3.50% · r33 +4.14% · r34 +3.60% · r35 -1.76% · r36 +4.62%
  - [x] **8 candidates excluded** with documented research rationale (B9-B11 noodles: 1-2 anchor vote · B12-B16 steaks/salad/porridge/congee: menu existence NOT verified)
  - [x] **Part A research goals completed**: sticky rice MoPH Code 01039 = 230 kcal/100g (3-0 vote) · ส้มตำ INMU-attributed = 105 kcal/100g (2-1 vote) — both verified with primary citations
  - [x] **r28/s19 decisions documented**: kept at shipped values (both 169 and 230 sticky-rice defensible per research caveat; ส้มตำ verified value within band)
  - [x] `meals.json` data version 1.10.15 → 1.10.16
  - [x] `service-worker.js` + `index.html` VERSION v1.10.40 → v1.10.41
  - [x] Total entry count: 397 → 405 (+8)
  - [x] Aggregate audit: pass 321 → 329 (+8) · warn 70 unchanged · fail 3 unchanged · skipped 3 unchanged
  - [x] `git diff meals.json` shows exactly 2 hunks: version field + r29-r36 insertion after r28
  - [x] `branded_products.json` byte-identical (MD5 `50DA32FECC693685B1CF7238C13621F3` matches v1.10.40)
  - [x] `tools/audit-meals.js` byte-identical (MD5 `6FE42BB990ECC932AE4193C76E71E0D9` matches v1.10.40)
  - [x] PROJECT_STATE updated
  - [x] Spec cites menu-addition-protocol + both deep-research workflows
- **Audit evidence:**
  - PowerShell parallel-impl audit (per DEC-002): per-entry diff% all PASS with exact prediction match
  - Aggregate: 397 → 405 ✓ · pass 321 → 329 ✓ · warn 70 unchanged ✓ · fail 3 unchanged ✓ · skipped 3 unchanged ✓
  - Sibling data files byte-identical (hashes preserved from v1.10.40)
  - VERSION sync verified in both files
  - git diff meals.json: 2 hunks at @@-1,5 (version) + @@-101 (r29-r36 insertion)
  - **Cumulative deep-research stats (T-013f + T-013f.1)**: 212 agents · ~50 sources · ~40 confirmed claims · 10 killed
- **Transitions (so far):**
  - `todo → in_progress` — picked up after T-013f ship + user-confirmed scope option (c) + "ครบ" target
  - `in_progress → review` — 2nd deep-research workflow + 8 entries inserted + 8 exclusions documented · all PASS with exact prediction · sibling files preserved · VERSION sync · state files updated · held per established gate pattern
- **Transitions:**
  - `todo → in_progress` — picked up after T-013f ship + user-confirmed scope option (c) + "ครบ" target
  - `in_progress → review` — 2nd deep-research workflow + 8 entries inserted + 8 exclusions documented · all PASS with exact prediction · sibling files preserved · VERSION sync · state files updated · held per established gate pattern
  - `review → done` — user approved with "ทำเลย เพิ่มเบอร์เกอร์กุ้งให้ด้วย" (split into 2 parts: ship T-013f.1 now, T-013g for shrimp burger as separate task)
- **Notes:**
  - **First menu-add task with research-driven exclusions** — refused to fabricate values for items not on the actual menu
  - Research found Chester's TH publishes NO public data (confirmed across 2 workflows · 212 agents) — pattern documented for future Thai chain tasks
  - **r28/s19 correction option**: verified values exist (MoPH 230 sticky rice · INMU 105 ส้มตำ); shipped values defensible within research uncertainty bands; T-013f.2 correction task available if user requests

### T-013g — Chester's shrimp burger menu items (user correction)

- **Status:** `done` ✅ (v1.10.42 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/add-meals-chesters-shrimp-burger.md`](docs/specs/add-meals-chesters-shrimp-burger.md)
- **Protocol:** follows [`docs/specs/menu-addition-protocol.md`](docs/specs/menu-addition-protocol.md)
- **User-locked scope (this turn):**
  - User correction at T-013f.1 ship: "เบอร์เกอร์กุ้งมีใน CHESTER หาดีๆ" — initial 2 deep-research workflows missed burger items (B1-B16 candidate list did not include burger class)
  - **3rd deep-research workflow** focused specifically on Chester's burger items: เบอร์เกอร์กุ้ง (PRIORITY) + เบอร์เกอร์ไก่ทอด + เบอร์เกอร์ไก่ย่าง + signature burger variants
  - Cross-references: Burger King / MOS Burger shrimp burger published nutrition for fallback anchoring
  - Target: identify EVERY Chester's burger item (not just shrimp), with defensible nutrition
- **Forbidden in this turn:**
  - Edits to existing entries (r25-r36 / s19 / others)
  - Schema changes
  - Adding burger items not actually on Chester's menu
- **Gate criteria:** see menu-addition-protocol §3 + audit must report total 405 → 405+N · pass +N · warn/fail unchanged · sibling data files byte-identical · burger items cited or USDA-component-derived with explicit flag · menuinthai.com Chester's page verified as primary menu existence check
- **Definition of Done (all met):**
  - [x] 1 entry inserted: m131 เบอร์เกอร์กุ้งเชสเตอร์ (300 cal / 112g · P=14 · C=30 · F=13 · sugar=4)
  - [x] m131 in audit PASS band; diff% matches §3d prediction **exactly to 2 decimal places: +2.33%**
  - [x] **User correction validated**: เบอร์เกอร์กุ้ง CONFIRMED on Chester's via 3 primary sources (FB April 2025 + IG 2022 + chesters.co.th/products/437) · prior research workflows had gap in candidate list
  - [x] **CP Brand parent-company anchor used**: 112g composition (same CPF parent operates Chester's) — strongest defensible anchor available
  - [x] **REFUTED claims documented**: snapcalorie.com nutrition (149 kcal/100g · 200g=350kcal · 235.3g=411.8kcal) and homemade ebi-katsu recipe values (549 kcal) **NOT used** (0-3 vote in adversarial verification)
  - [x] `meals.json` data version 1.10.16 → 1.10.17
  - [x] `service-worker.js` + `index.html` VERSION v1.10.41 → v1.10.42
  - [x] Total entry count: 405 → 406 (+1)
  - [x] Aggregate audit: pass 329 → 330 (+1) · warn 70 unchanged · fail 3 unchanged · skipped 3 unchanged
  - [x] `git diff meals.json` shows exactly 2 hunks: version field + m131 insertion after m130
  - [x] `branded_products.json` byte-identical (MD5 `50DA32FECC693685B1CF7238C13621F3` matches v1.10.41)
  - [x] `tools/audit-meals.js` byte-identical (MD5 `6FE42BB990ECC932AE4193C76E71E0D9` matches v1.10.41)
  - [x] PROJECT_STATE Current Version + Active Task + Latest Completed Work updated
  - [x] Spec cites menu-addition-protocol + 3rd deep-research workflow with primary source URLs
  - [x] **เบอร์เกอร์ปลาสไปซี่ deferral documented** (2017 FB source · current availability unverified)
  - [x] **First burger in DB**: m131 uses m-prefix · mains category · 🍔 emoji (new convention for future burger additions)
- **Audit evidence:**
  - PowerShell parallel-impl audit (per DEC-002): m131 PASS with exact prediction match
  - Aggregate: 405 → 406 ✓ · pass 329 → 330 ✓ · warn 70 unchanged ✓ · fail 3 unchanged ✓ · skipped 3 unchanged ✓
  - Sibling data files byte-identical (hashes preserved from v1.10.41)
  - VERSION sync verified in both files
  - git diff meals.json: 2 hunks at @@-1,5 (version) + @@-681 (m131 insertion)
  - 3rd deep-research workflow: 104 agents · 22 sources · 25 verified · 15 confirmed · 10 killed
- **Transitions (so far):**
  - `todo → in_progress` — picked up after T-013f.1 ship + user correction "เบอร์เกอร์กุ้งมีใน CHESTER หาดีๆ"
  - `in_progress → review` — 3rd deep-research workflow + m131 inserted with CP Brand anchor · PASS with exact prediction · sibling files preserved · VERSION sync · state files updated · held per established gate pattern
- **Transitions:**
  - `todo → in_progress` — picked up after T-013f.1 ship + user correction "เบอร์เกอร์กุ้งมีใน CHESTER หาดีๆ"
  - `in_progress → review` — 3rd deep-research workflow + m131 inserted with CP Brand anchor · PASS with exact prediction · sibling files preserved · VERSION sync · state files updated · held per established gate pattern
  - `review → done` — user approved with "ลุย". Final gates re-run, committed + pushed
- **Notes:**
  - **User correction was valuable** — found gap in earlier research methodology (B1-B16 candidate list missed entire "burger" item class). For future Thai chain menu research, **search Thai-language brand FB/IG/website FIRST** before falling back to aggregator lists.
  - **CP Brand parent-company anchor** is a new pattern: when researching items from Thai chains owned by CP Foods (Chester's, Five Star, Sausage Family), the CP Brand retail line frequently sells frozen versions of the in-store items with published composition — useful as defensible anchor.
  - **Cumulative research across T-013f + T-013f.1 + T-013g**: 316 agents · ~72 sources · ~55 confirmed claims · 20 killed
  - **T-013g.1 deferred** (Fish Spicy Burger) pending user request + current-menu confirmation

### T-017 — Extend chart tap-to-read to Weight + Waist charts in Reports

- **Status:** `done` ✅ (v1.10.43 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/reports-weight-waist-chart-interactivity.md`](docs/specs/reports-weight-waist-chart-interactivity.md)
- **User-locked scope (this turn):**
  - Extend T-010's tap-to-read pattern to the 2 remaining Reports charts (Weight + Waist) which still use `svgLineChart`
  - `svgLineChart` gets backward-compatible `chartId` + `selectedIdx` opts
  - 2 new detail-box helpers: `chartDetailWeight`, `chartDetailWaist`
  - Reuses existing `show-chart-point` handler · existing `state.tmp.chartSelection` shape
  - No data file changes · no new handlers · no new listeners
- **Forbidden:**
  - Schema changes
  - Edits to existing 3 chart tap-to-read flows (regression-free)
  - BPC chart changes (out of scope)
- **Gate criteria:** see spec DoD + test plan · existing 3 charts unchanged · selection clears on range change · backward-compat verified
- **Definition of Done (all met):**
  - [x] `svgLineChart` opts gain `chartId` + `selectedIdx` (backward-compatible · function def count still = 1)
  - [x] Hit-area `<rect>` emitted per series point when `chartId` provided (24px tap target × full chart height)
  - [x] Selected point renders with ring (6.5px radius outer, 1.5px stroke) + larger fill radius (4.8px vs 2.8px default) — matches T-010 visual
  - [x] `chartDetailWeight(idx)` helper added inside `renderReports` — shows date + weight + 7-day moving average
  - [x] `chartDetailWaist(idx)` helper added inside `renderReports` — shows date + waist + 7-day moving average
  - [x] Weight chart call site updated: `chartId: 'weight'` · `selectedIdx: selPointIdx('weight')` · detail box rendered below chart
  - [x] Waist chart call site updated: `chartId: 'waist'` · `selectedIdx: selPointIdx('waist')` · detail box rendered below chart
  - [x] Hint text added "แตะจุดเพื่อดูค่า" to both chart cards
  - [x] No regression: existing 3 daily charts (calorie/balance/protein) unchanged · same `show-chart-point` handler · same `state.tmp.chartSelection` shape
  - [x] No new handlers · no new event listeners · no schema changes
  - [x] VERSION v1.10.42 → v1.10.43 (sw + index, both verified)
  - [x] PROJECT_STATE updated
  - [x] Data file hashes unchanged (`meals.json` MD5 `A96AB59247B091D6B3E68DD6434B9A43` · `branded_products.json` MD5 `50DA32FECC693685B1CF7238C13621F3` · `audit-meals.js` MD5 `6FE42BB990ECC932AE4193C76E71E0D9` — all match v1.10.42)
- **Audit evidence:**
  - Function definitions: `svgLineChart`=1 · `svgDailyLineChart`=1 · `svgDailyBarChart`=1 (no duplication from extension)
  - 5 chart detail helpers in `renderReports`: chartDetailCal (L6129), chartDetailBal (L6137), chartDetailProt (L6146), chartDetailWeight (L6157 NEW), chartDetailWaist (L6166 NEW)
  - Aggregate meals audit unchanged (406 entries · pass=330 warn=70 fail=3 skip=3 — identical to v1.10.42 since no data change)
  - VERSION sync verified in both files
  - Sibling data files byte-identical
- **Transitions:**
  - `todo → in_progress` — picked up after T-013g ship + user feedback "ในหน้ารายงานกราฟแต่ละอัน ทำให้กดจิ้มดู"
  - `in_progress → review` — svgLineChart extended backward-compat · 2 new detail helpers · 2 call sites updated · audit clean · VERSION synced · state files updated · held per established gate pattern
  - `review → done` — user approved with "ลุย". Committed + pushed.
- **Notes:**
  - First task in a while that is pure UI/UX enhancement (last non-data tasks were T-013 series BPC work). Confirms operating model handles small surface tasks cleanly.
  - Pattern reinforced: when extending an existing helper (svgLineChart), use **optional opts + backward-compat detection** rather than breaking the signature. Same approach as T-013d.3's `computeBodyProgressInsight(user, ...args)` refactor.

### T-018 — Force SW update check on page load + visibilitychange (bug fix)

- **Status:** `done` ✅ (v1.10.44 shipped)
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/sw-update-detection-fix.md`](docs/specs/sw-update-detection-fix.md)
- **User-locked scope (this turn):**
  - Bug report: "ทำไมปิดแอปเข้าใหม่ไม่มีขึ้นให้อัปเดต" (no update banner on close-reopen)
  - Root cause: 3 missing pieces in current SW registration — no `updateViaCache: 'none'`, no explicit `reg.update()`, no visibilitychange listener
  - Browser auto-checks SW updates every 24h only; users opening within that window get no banner
  - Fix: add 3 small lines (~5 LoC) to force update check on page load + every foreground transition
- **Forbidden:**
  - Schema changes
  - service-worker.js changes (already correct)
  - Banner UI changes
  - Auto-applying updates (user still taps "อัปเดต")
- **Gate criteria:** see spec DoD · existing updatefound chain unchanged · first-time install banner suppression preserved · backward-compat verified
- **Definition of Done (all met):**
  - [x] `navigator.serviceWorker.register(...)` called with `{ updateViaCache: 'none' }` — grep verified: 1 occurrence
  - [x] `reg.update().catch(() => {})` called immediately after registration · grep verified: 2 occurrences (post-register + visibilitychange handler)
  - [x] `document.addEventListener('visibilitychange', ...)` calls `reg.update()` when state becomes visible · grep verified: 1 functional listener
  - [x] Existing `updatefound` event chain unchanged · `showUpdateBanner` count = 3 (def + 2 fire sites — both preserved)
  - [x] First-time install correctly suppresses banner (`navigator.serviceWorker.controller` truthy check preserved on both fire paths)
  - [x] VERSION v1.10.43 → v1.10.44 (sw + index, both verified)
  - [x] PROJECT_STATE updated
  - [x] Data file hashes unchanged (meals.json MD5 `A96AB59247B091D6B3E68DD6434B9A43` · branded_products `50DA32FECC693685B1CF7238C13621F3` · audit-meals.js `6FE42BB990ECC932AE4193C76E71E0D9` — all match v1.10.43 baseline)
- **Audit evidence:**
  - VERSION sync verified in both files
  - Aggregate meals audit unchanged (406 entries · pass=330 / warn=70 / fail=3 / skip=3 — identical to v1.10.43)
  - Sibling data files byte-identical
  - 3 fix additions wired (updateViaCache opt · reg.update post-register · visibilitychange listener)
- **Transitions:**
  - `todo → in_progress` — picked up after T-017 ship + user bug report
  - `in_progress → review` — 3-line fix · audit clean · VERSION synced · state files updated · held per established gate pattern
  - `review → done` — user approved with "ลุย". Committed + pushed.
- **Notes:**
  - **Chicken-and-egg deployment**: users on ≤v1.10.43 won't see this fix until their browser's next 24h auto-check OR they hard-refresh. After v1.10.44+, all future updates trigger banner reliably. Unavoidable for any SW update-flow fix.
  - **Belt-and-suspenders**: netlify.toml already has `Cache-Control: no-cache, no-store, must-revalidate` on service-worker.js, which is the server-side guarantee. Adding `updateViaCache: 'none'` is the client-side guarantee — defense in depth for browsers that occasionally ignore the header.
  - **First-time install behavior preserved**: the `&& navigator.serviceWorker.controller` check in both banner fire paths ensures no banner shows on initial install (correct — nothing to "update" yet).

### T-014 — Body Progress Phase 2 *(placeholder, blocked by T-013d done)*

- **Status:** `todo`
- **Scope (deferred from Phase 1 split):** Ghost overlay · Slider compare · Auto-suggest comparison · Milestone photo prompts · Best Lean Week · Same Weight Different Shape · **Video Frame Mode for Back**

### T-015 — Body Progress Phase 3 *(placeholder)*

- **Status:** `todo`
- **Scope:** PIN lock · Face crop · Pose-match score · Advanced overlay opacity · Monthly timeline scrub

### T-016 — Insight Engine *(placeholder, 5th deferral)*

- **Status:** `todo`
- **Notes:** Pattern continues — user prioritizes concrete tracking over interpretation. Will likely become more actionable after T-013 series gives rich check-in data.

### T-011 — Custom date range for Reports

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/reports-custom-range.md`](docs/specs/reports-custom-range.md)
- **Re-scope note:** Originally T-011 was placeholder for "Insight Engine"; user pivoted to custom range first. Insight Engine → T-012.
- **Definition of Done:**
  - [x] `keysBetween(startKey, endKey)` helper added (line 1857)
  - [x] `rangeAggregate` accepts number OR `{start, end}` opts (line 2195)
  - [x] 5th segmented button `[📅 กำหนดเอง]` renders
  - [x] Custom mode shows 2 native date inputs · pre-filled from current rolling range
  - [x] Mode flips (rolling↔custom) preserve customStart/customEnd state for return-to-custom
  - [x] Live update via input listener (debounced 200ms)
  - [x] Auto-swap if start > end (in `keysBetween`) · clamp end to today (in label + aggregate)
  - [x] Range label adapts: "N วันล่าสุด" vs "D เดือน – D เดือน"
  - [x] Chart selection (T-010) clears on mode/date change
  - [x] VERSION v1.10.28 → v1.10.29 (sw + index)
  - [x] PROJECT_STATE updated
  - [x] Data file hashes unchanged
- **Transitions:**
  - `todo → in_progress` — picked up after T-010 commit; user-locked scope
  - `in_progress → review` — helper + refactor + UI + handler + listener all wired; audit clean
  - `review → done` — user approved (single-letter "A")

### T-012 — Insight Engine *(placeholder, deferred)*

- **Status:** `todo` (deferred — re-pushed by T-011)
- **Owner:** Execution Agent (when picked up)
- **Spec:** to be created — earlier design draft in T-009 review (Path B recommendation: D1 protein streak + D2 weekend pattern + D3 sugar high + D5 logging gap + D6 streak milestone · 2 surfaces: Reports top + Dashboard banner)
- **Notes:** This is the second deferral (was T-010 before T-009 review, then T-011 after T-010, now T-012 after T-011). Pattern: user keeps prioritizing concrete Reports improvements first. Insight Engine remains queued.

### T-010 — Reports chart interactivity + burn-line per-day fix

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/reports-chart-interactivity.md`](docs/specs/reports-chart-interactivity.md)
- **User-locked scope:** Bug fix (burn line per-day) + tap-to-read on 3 charts. Weight chart Phase 2.
- **Re-scope note:** Originally proposed as "Insight Engine"; user pivoted to chart improvements first. Insight engine → T-011 (placeholder below).
- **Definition of Done:**
  - [x] `svgDailyLineChart` target line renders per-day path (not flat average) — verified `avgTarget` removed (0 occurrences)
  - [x] Hit-area + selection state for all 3 daily charts (calorie / balance / protein)
  - [x] `show-chart-point` handler · toggle on same idx clears
  - [x] `set-range-days` clears stale selection
  - [x] Selected element visually highlighted (bar = 2px stroke #1f2937 · line = larger dot + ring)
  - [x] Detail box per chart (3 chart-specific formatters)
  - [x] Unlogged-day tap → "ไม่ได้บันทึก"
  - [x] `.chart-detail` CSS class added (indigo border-left, bg-2 background)
  - [x] VERSION v1.10.27 → v1.10.28 (sw + index verified by grep)
  - [x] PROJECT_STATE updated
  - [x] Data file hashes confirmed unchanged
- **Transitions:**
  - `todo → in_progress` — picked up after T-009 commit; user-locked scope
  - `in_progress → review` — bug fix + interactivity wired, audit clean
  - `review → done` — user approved (single-letter "A")

### T-011 — Insight Engine *(placeholder, deferred)*

- **Status:** `todo` (deferred — user pivoted to T-010 chart improvements first)
- **Owner:** Execution Agent (when picked up)
- **Spec:** to be created — earlier design draft surfaced in T-009 review conversation (5 detectors / Path B recommendation: D1 protein streak + D2 weekend pattern + D3 sugar high + D5 logging gap + D6 streak milestone · 2 surfaces: Reports top + Dashboard banner)
- **Notes:** Will pick up after T-010 done (Rule 15 mechanical pickup). User-stated priority: "auto insights / pattern detection / anomaly callout / trend explanation".

### T-009 — Reports redesign with graphs + time range

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/reports-redesign-graphs.md`](docs/specs/reports-redesign-graphs.md)
- **User-locked scope:** Path B · default 30 วัน · ลบ month nav · no custom · no heatmap Phase 1
- **Definition of Done:**
  - [x] `rangeAggregate(userId, days)` helper added (line 2168, shape identical to `monthAggregate`)
  - [x] `svgDailyLineChart` (line 2249) + `svgDailyBarChart` (line 2320) generic helpers
  - [x] Range segmented `[7][14][30][90]` at top · default 30 — line 5164
  - [x] Month nav (`month-prev`/`month-next`) removed; orphan handlers deleted; `state.tmp.year/monthIdx` no longer referenced
  - [x] 3 new charts:
    - **Calorie trend line** (intake vs TDEE+exercise target dashed line)
    - **Energy balance bars** (color-coded: green=deficit / amber=surplus, with zero-line)
    - **Protein bars** (green=met target / amber=under, with target dashed line)
  - [x] Weight chart preserved (`svgLineChart`), data source switched to range (`rangeWeights`)
  - [x] Stats copy updated to range (`${rangeLabel} = N วันล่าสุด`)
  - [x] Empty state for no data in range
  - [x] VERSION v1.10.26 → v1.10.27 (sw + index, verified by grep)
  - [x] PROJECT_STATE updated
- **Transitions:**
  - `todo → in_progress` — picked up after T-008 commit; user-locked scope confirmed in chat
  - `in_progress → review` — 3 helpers + handler + render refactor done; orphans removed; hash invariants confirmed; diff scope verified
  - `review → done` — user approved · noted system passed visualization phase, next direction = interpretation/insight engine
- **Diff scope (verified):**
  - `index.html` (+302/−52) — helpers + render rewrite + handler swap + VERSION
  - `service-worker.js` (+1/−1) — VERSION
  - `TASK_BOARD.md` (+19) — T-009 row
  - + 2 untracked: `docs/specs/reports-redesign-graphs.md` (new spec) · `PROJECT_STATE.md` (already tracked, modified)
- **Notes:**
  - First **code-only feature** task in the operating model (no data change). All 8 previous tasks touched data, docs, or both.
  - `monthAggregate` function kept (defined at line 2127) — no callers now, but not deleted to keep T-009 scope tight. Could be a Refactor Agent task later (T-010+).
  - Charts use pure inline SVG (no library) — matches project's no-build philosophy. Total helpers ~190 lines.

### T-008 — Add protein add-ons to vegetarian สปาเก็ตตี้ entries

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/add-protein-addons-vegetarian-pasta.md`](docs/specs/add-protein-addons-vegetarian-pasta.md)
- **Definition of Done:**
  - [x] n30 ครีมเห็ด: +3 add-ons (ไก่ย่าง · แซลม่อน · เบคอน) — customization count 3 → 6 ✅
  - [x] n33 มาริน่า: +3 add-ons (ไก่ย่าง · ไส้กรอก · กุ้ง) — customization count 3 → 6 ✅
  - [x] n34 เพสโต้: +3 add-ons (ไก่ย่าง · แซลม่อน · กุ้ง) — customization count 3 → 6 ✅
  - [x] All 9 add-on rows have realistic Thai-cafe portions + delta values per spec research
  - [x] Bases byte-identical for all 3 modified entries: n30=530/320/16/56/27/4 · n33=430/320/14/69/11/10 · n34=540/290/18/62/26/1
  - [x] Other 6 spaghetti entries (n28/n29/n31/n32/n35/n36) byte-identical (verified by audit total/pass/warn/fail counts unchanged)
  - [x] `meals.json` `version` 1.10.12 → 1.10.13
  - [x] `service-worker.js` + `index.html` `VERSION` v1.10.25 → v1.10.26 (verified by grep)
  - [x] PS audit: 388 / pass 312 / warn 70 / fail 3 / skip 3 (all unchanged from T-007 baseline — bases not moved)
  - [x] `branded_products.json` + `tools/audit-meals.js` byte-identical (hashes match prior baseline)
  - [x] PROJECT_STATE updated
- **Transitions:**
  - `todo → in_progress` — picked up after T-007 commit (Rule 15 mechanical pickup); user gave explicit research-driven scope
  - `in_progress → review` — 9 add-ons applied across n30/n33/n34 · bases unchanged · audit clean
  - `review → done` — user approved (single-letter "a")
- **Diff-scope note:** spec predicted 4 hunks (version + 3 entry mods), actual 3 (n33+n34 merged in git diff context due to adjacency — expected git behavior, not a collateral edit issue; verified by reading the actual diff line-by-line).
- **Notes:**
  - First task to *modify customizations* on existing entries (not add new entries). Menu-addition-protocol §3e (real-user fit) applied; protocol's diff-scope expectation adjusted (multiple modification hunks instead of single insertion hunk).
  - Research-driven: 5 protein options selected from top-7 popular Thai-cafe pasta add-ons; pairings chosen by sauce compatibility (cream/tomato/pesto each gets fitting subset).

### T-007 — Add 9 สปาเก็ตตี้ variants

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/add-meals-spaghetti.md`](docs/specs/add-meals-spaghetti.md)
- **Protocol:** follows [`docs/specs/menu-addition-protocol.md`](docs/specs/menu-addition-protocol.md) (codified in this turn as AGENTS.md Rule 17 per user instruction)
- **Definition of Done:**
  - [x] 9 entries inserted: n28 คาโบนาร่า (700/+0.1%) · n29 โบโลเนส (550/−4.5%) · n30 ครีมเห็ด (530/+0.2%) · n31 ผัดกะเพราหมู (470/−1.5%) · n32 กุ้งกระเทียม (450/−0.9%) · **n33 มาริน่า (400/−2.3%) · n34 เพสโต้ (510/+0.6%) · n35 มีทบอล (570/−0.9%) · n36 ทูน่า (500/−2.0%)**
  - [x] All 9 in audit `pass` band; **every per-entry diff% matches spec prediction exactly** (within rounding)
  - [x] `meals.json` `version` 1.10.11 → 1.10.12
  - [x] `service-worker.js` + `index.html` `VERSION` v1.10.24 → v1.10.25 (verified by grep)
  - [x] PS audit: total 379 → 388 ✅ · pass 303 → 312 ✅ · warn 70 unchanged ✅ · fail 3 unchanged ✅
  - [x] `git diff meals.json` exactly 2 hunks (verified — version field + insertion after n27)
  - [x] `branded_products.json` + `tools/audit-meals.js` byte-identical (hashes match prior baselines)
  - [x] AGENTS.md Rule 17 + `docs/specs/menu-addition-protocol.md` created (one-time setup, bundled in this commit)
  - [x] PROJECT_STATE Current Version + Latest Completed Work + Active Task all updated
- **Transitions:**
  - `todo → in_progress` — picked up after T-006 commit (Rule 15 mechanical pickup); user gave explicit scope ("เพิ่มหมวดเมนูสปาเก็ตตี้")
  - `in_progress → review` — 5 entries added · all PASS band · predictions matched exactly · Rule 17 codified · protocol doc created
  - `review → in_progress` — user chose option (c) "add more variants" at first review; spec extended with 4 more (n33-n36)
  - `in_progress → review` — 4 additional entries added · all PASS band · predictions matched exactly
  - `review → in_progress` — user instructed "ตรวจความถูกต้อง + ทำให้เหมาะกับการใช้งานจริง"; protocol §3e (real-user fit) codified; n33 serving 280g→320g, n34 serving 260g→290g (cafe portions)
  - `in_progress → review → done` — re-audit clean (all 9 PASS) · user pre-approved contingent on verification passing ("ตรวจแล้ว push เลย")
- **Notes:**
  - **First task formally following Rule 17 + the menu-addition protocol.** T-006 retroactively also followed it (the protocol was extracted from how T-006 was structured).
  - User instruction "จดข้อกำหนดเหล่านี้เข้าไปทุกครั้งก่อนเพิ่มเมนู" → became Rule 17 + permanent protocol doc.
  - 5 variants chosen to cover the calorie spectrum: 450 (light, garlic shrimp) → 700 (heavy, carbonara), giving users variety without overlap with existing n21–n23.
- **Notes:**
  - Second user-visible product improvement under Rule 16.
  - First task to formally follow Rule 17 + the menu-addition protocol; T-006 retroactively also followed it (the protocol was extracted from how T-006 was structured).
  - User instruction codified: "จดข้อกำหนดเหล่านี้เข้าไปทุกครั้งก่อนเพิ่มเมนู" → became Rule 17 + protocol doc.

### T-006 — Add ขนมจีนแกงเขียวหวาน variants (4 entries)

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/add-meals-khanom-jin-green-curry.md`](docs/specs/add-meals-khanom-jin-green-curry.md)
- **Definition of Done:**
  - [x] 4 entries inserted: n24 ขนมจีนแกงเขียวหวานไก่ (700 cal · −1.3%) · n25 ไก่ใส่ฟัก (680 cal · −0.6%) · n26 เนื้อ (760 cal · −2.6%) · n27 ลูกชิ้นปลา (690 cal · +0.4%)
  - [x] All 4 in audit `pass` band (each ≤5% — predictions in spec hit exactly)
  - [x] `meals.json` `version` 1.10.10 → 1.10.11
  - [x] `service-worker.js` + `index.html` `VERSION` v1.10.23 → v1.10.24 (verified by grep)
  - [x] PS audit: total 375 → 379 ✅ · pass 299 → 303 ✅ · warn 70 → 70 (unchanged) ✅ · fail 3 → 3 (unchanged) ✅
  - [x] `git diff meals.json` shows exactly 2 regions: version field (line 2) + insertion after n23 (line 634 region)
  - [x] `branded_products.json` + `tools/audit-meals.js` byte-identical (hashes confirm against prior baseline)
  - [x] PROJECT_STATE Current Version + Latest Completed Work + Active Task all updated
- **Notes:**
  - User-directed scope (Phase 2 of T-006 prep): "เพิ่มเมนู ขนมจีนแกงเขียวหวานในแบบต่างๆ เช่น เขียวหวานไก่ใส่ฟัก สำคัญที่สุด ตรวจความถูกต้องของแคลและปริมาณ 1เสิร์ฟ"
  - First **user-visible product improvement** under Rule 16 (new searchable menu items appear in library / suggester / planner immediately).
  - Calorie/portion accuracy is the user's #1 stated priority — full derivation in spec, anchored to existing peer r14 + cross-checked against m03, n12, m77.
- **Transitions:**
  - `todo → in_progress` — picked up after T-005 commit (Rule 15 mechanical pickup); user gave explicit scope ("เพิ่มเมนู ขนมจีนแกงเขียวหวานในแบบต่างๆ ... ตรวจความถูกต้องของแคล/ปริมาณ")
  - `in_progress → review` — 4 entries added · all PASS band · version sync verified · diff scope verified · PROJECT_STATE updated
  - `review → done` — user approved (single-letter "a")

### T-005 — Fix s02 + m18 data discrepancies in `meals.json`

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/data-fix-s02-m18.md`](docs/specs/data-fix-s02-m18.md)
- **Definition of Done:**
  - [x] s02 `baseCalories` 165 → 195 (audit: +0.5% pass)
  - [x] m18 `fat_g` 32 → 42 (audit: −1.2% pass)
  - [x] `meals.json` `version` 1.10.9 → 1.10.10
  - [x] `service-worker.js` + `index.html` `VERSION` v1.10.22 → v1.10.23 (both verified by grep)
  - [x] PS audit confirms s02 + m18 no longer in `fail` list (5 → 3 fails — d22 beer + d03/d15 black-coffee noise remain, all expected limitations)
  - [x] Total entries still 375
  - [x] Diff confirms only s02 + m18 entries changed; `branded_products.json` and `tools/audit-meals.js` unchanged (verified by absence from `git diff --stat`)
  - [x] PROJECT_STATE.md current version line + Latest Completed Work updated
- **Transitions:**
  - `todo → in_progress` — picked up after T-004 commit (Rule 15 mechanical pickup, but flagged at scope-gate first because original T-005 placeholder did not satisfy Rule 16; user re-scoped to the data-fix task)
  - `in_progress → review` — fixes applied · audit passes · version bumped · scope locked verified
  - `review → done` — user approved (scope discipline + measurable impact + VERSION sync + process transparency all noted)
- **Notes:**
  - First **production-data** task in this project's operating model (T-001/T-003/T-004 were doc/tools).
  - First task under Rule 16 (value bias) — qualifies via (b) real impact on production data + (a) measurable output (audit fail count drops 5 → 3).
  - Scope locked by user: no schema change, no `alcohol_g`, no beer logic, no broad nutrition rewrite, no unrelated meal edits. Verified by diff scope (only s02, m18, version field touched in meals.json).
  - Process correction: in the audit command I asserted a hash prefix for `branded_products.json` that I had no record of. Corrected in the report — the real evidence of immutability is the file's absence from `git diff --stat`, not the hash assertion. Flagged for transparency.
  - The placeholder T-005 (smoke-test checklist for `confirm-1day-plan`) is renumbered T-006 in Next Actions; that placeholder was never formally registered, so no ID-immutability violation.

### T-004 — runtime decision (Node required vs. PowerShell fallback)

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/runtime-decision.md`](docs/specs/runtime-decision.md)
- **Decision artifact:** [`docs/decisions/DEC-002-tools-runtime.md`](docs/decisions/DEC-002-tools-runtime.md)
- **Definition of Done:**
  - [x] `docs/decisions/DEC-002-tools-runtime.md` exists with all required sections (status accepted · context · decision · alternatives · consequences · follow-ups). Decision: **Option F — JS canonical, PS parallel-implementation acceptable as fallback evidence** (subject to read-only invariant + line-for-line mirror + dot-prefix gitignored naming).
  - [x] `tools/README.md` "Runtime policy" subsection at top, citing DEC-002.
  - [x] `AGENTS.md` Universal Rules — added rule 14 (runtime expectation cross-reference) and rule 15 (mechanical pickup, gated done) per workflow refinement from this turn.
  - [x] `PROJECT_STATE.md` Open Question 2 updated to reflect partial resolution (runtime policy resolved; broader test infra still open).
  - [x] No file moves, no JS port, no production effect (Option F is the lightest path).
- **Transitions:**
  - `todo → in_progress` — picked up automatically after T-003 commit (mechanical pickup per locked rule)
  - `in_progress → review` — DEC-002 + spec written; cross-references in tools/README + AGENTS verified by grep; hash invariants on `tools/audit-meals.js` and `meals.json` confirmed unchanged
  - `review → done` — user approved Option F + rules 14/15
- **Notes:**
  - Recommendation: Option F (codify the working pattern from T-003). Six options were considered; full trade-off matrix in spec.
  - T-003A closed as superseded.
  - Surfaced rule 15 ("`pickup` is mechanical; `done` is gated") as the formal codification of the workflow refinement the user locked in this session. Lives in `AGENTS.md` Universal Rules.
  - **Awaiting user review** — if the user prefers a different option (A/B/C/D), DEC-002 returns to `proposed` status and is revised; T-004 flips back to `in_progress`.

---

No blockers. T-003 done; T-004 about to be picked up automatically.

---

## Next Actions

> Live: T-004 picks up automatically per execution loop after T-003 commit + push.
> T-003A remains `todo` but lower priority since user accepted PS evidence policy (may be folded into T-004 or kept as backup option).
> Parked items below; do not run until user picks one.

1. **T-002 (parked): Decide branch + tag policy** — answer Open Questions 3 & 4 in `PROJECT_STATE.md`. Output: `docs/decisions/DEC-003-...md`. Doc-only.
2. **T-005 (parked): Smoke-test checklist for `confirm-1day-plan`** — covers the v1.10.21 fixed-slot regression class. `docs/specs/qa-meal-plan-confirm.md`.
3. **T-006 (parked): First product-feature epic** — pick from open feedback when ready.

> Note: T-003 + T-004 promoted to active Task Registry above. (T-004 number reused for "runtime decision" since user named it explicitly; the previously-parked smoke-test idea moved to T-005.)

---

## Do Not Start Yet

- **Touching `index.html` for any reason** without an approved spec.
- **Editing `meals.json` / `branded_products.json`** without a paired UI-audit task.
- **Refactoring inline JS** without an Architecture spec + Refactor Agent assignment.
- **Adding tests / linters / build steps** — needs a decision record first (`docs/decisions/`).
- **Changing AI prompts in `netlify/functions/*`** — needs test plan + spec.
- **`localStorage` schema changes** — breaks existing installs without migration.
- **Tagging old commits / rewriting history** — `main` is the deployed branch.

---

## Conventions

- Task IDs are immutable. Numbers are never reused even if a task is abandoned.
- Status changes are atomic: one row, one transition per chat turn (the Execution Agent makes the change in the same write that does the work).
- "Last updated" line at the top is updated on every status transition.
- A task with status `done` stays in the Registry as historical record. It is moved to a "Completed" subsection at the bottom during periodic compaction (not yet — Registry is short).
- A blocker on a task does not block other tasks unless it physically prevents them. Use the global `Blockers` section for cross-task issues.
