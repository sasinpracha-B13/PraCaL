# Task Board

> **Live state of every task, governed by a state machine.**
> Update on every transition. The Orchestrator owns the file; the Execution Agent updates its own task's status during a flow.

Last updated: T-003 → `done` (PS evidence accepted) · T-004 about to pick up

---

## Active Epic

**EPIC-001 — Operating-model self-hosting** *(loop validated)*
Goal: prove the execution loop works by running one real task end-to-end through SPEC → BUILD → REVIEW → DONE, with state transitions visible in this file.

T-001 ran the full loop and reached `done`. The system has demonstrated it can pick a task, write its spec, execute it, update state, and stop at the user gate. Epic continues with T-003 to harden the audit tooling that T-001 surfaced as gap.

---

## Current Status

- Operating layer landed in commit `9a0747a` (Commit A — operating model + execution layer).
- T-001 README refresh: `done` — landed in commit `94cb6bc` (Commit B), pushed to `main`.
- T-003 meals audit script: **`done`** ✅ — PS parallel-impl verification accepted as canonical evidence by user (Node verification reclassified as optional, not blocking). Loop resumed.
- T-003A Node verification fallback: `todo` — superseded in priority by user policy ("PS evidence is sufficient"). Still registered as a structural option in case dual-runtime is desired later.
- T-004 runtime decision: `todo` — Execution Agent picks up automatically per the locked rule ("registered + no blocker = mechanical pickup").

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

- **Status:** `todo` *(registered, not executed — user must approve start)*
- **Owner:** Execution Agent (when picked up)
- **Spec:** to be created at `docs/specs/audit-meals-fallback.md` when picked up
- **Goal:** make T-003's audit verifiable in environments without Node, so the loop can continue without external dependency.
- **Options to evaluate in spec:**
  - **(opt-1)** Designate `tools/audit-meals.ps1` (port of the existing `.js` logic) as the **canonical** verifier. The JS becomes optional/deprecated. Trade-off: simpler env, but loses cross-platform readability — devs on Mac/Linux need pwsh.
  - **(opt-2)** Dual-runtime support — keep both `.js` and `.ps1` as official; CI/manual run picks whichever is available. Trade-off: doubles maintenance, but resilient.
  - **(opt-3)** Standardize on Node and add a Node-install precondition to the dev-env docs. Trade-off: simplest code, but heavier env requirement (this is also what T-004 will likely decide).
- **Definition of Done:**
  - [ ] Spec compares the three options with a recommendation
  - [ ] Chosen option implemented (file(s) added or moved)
  - [ ] `tools/README.md` reflects the canonical verifier(s)
  - [ ] T-003's DoD amended in the spec to point at the canonical verifier
  - [ ] T-003 unblocked: status moves `blocked` → `review` → (user gate) → `done`
- **Notes:**
  - **ID convention extension:** T-003A uses sub-letter naming (`T-NNN<letter>`) to mark this as the unblock-path of T-003, not a new sequence-number task. First time this pattern is used; if approved, document as a formal extension of the immutable-ID rule in `TASK_BOARD.md → Conventions`.
  - **Overlap flag with T-004:** T-003A is *tactical* (unblock T-003 quickly) while T-004 is *strategic* (formal runtime decision for all `tools/*`). They overlap on opt-1 and opt-3. If T-003A picks opt-1 or opt-3 first, it short-circuits T-004's main question. The user may want to consolidate (T-003A becomes T-004) or keep separate (T-003A is a one-shot unblock; T-004 is the broader policy doc). **Out of scope for this turn — flag for next user decision.**
  - Strict scope-lock: this task does **not** verify T-003 by running the JS in some other env. It changes the verification mechanism so it can run here.

---

### T-004 — runtime decision (Node required vs. PowerShell fallback)

- **Status:** `todo`
- **Owner:** Execution Agent (next pickup after T-003 → done)
- **Spec:** to be created at `docs/specs/runtime-decision.md` when picked up
- **Definition of Done:**
  - [ ] `docs/decisions/DEC-002-tools-runtime.md` exists with: status accepted, context (T-003 surfaced gap), decision (Node required / PS fallback / dual / migrate to PS), alternatives considered, consequences, follow-ups
  - [ ] `tools/README.md` updated: top of file states the chosen runtime and any install instructions; "Conventions" section reflects the choice
  - [ ] `AGENTS.md` Universal Rules cross-references the runtime requirement (so future Execution Agent doesn't assume)
  - [ ] If decision = "Node required": README "Setup" section gets a 1-line `node --version` precondition; if "PS fallback": port `tools/audit-meals.js` logic to a sibling `.ps1` and document both
  - [ ] `PROJECT_STATE.md` Open Question 2 updated to reflect the decision
- **Notes:**
  - Surfaced by T-003 — this environment has neither Node nor real Python; only PowerShell.
  - User flagged this as the right structural fix: "T-004 — runtime decision · standardize: Node required? หรือ PowerShell fallback? · เขียน DEC แยก".
  - **Blocked until T-003 → done** (user gate).
  - This is a doc + decision task, not a code task. No production effect.

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
