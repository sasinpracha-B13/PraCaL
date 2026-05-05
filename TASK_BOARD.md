# Task Board

> **Live state of every task, governed by a state machine.**
> Update on every transition. The Orchestrator owns the file; the Execution Agent updates its own task's status during a flow.

Last updated: T-006 → `done` (v1.10.24 ships · 379 meals total)

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
