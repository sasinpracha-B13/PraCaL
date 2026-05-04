# Task Board

> **Live state of every task, governed by a state machine.**
> Update on every transition. The Orchestrator owns the file; the Execution Agent updates its own task's status during a flow.

Last updated: operating-model + enforcement layer install

---

## Active Epic

**EPIC-001 — Operating-model self-hosting**
Goal: prove the execution loop works by running one real task end-to-end through SPEC → BUILD → REVIEW → DONE, with state transitions visible in this file.

---

## Current Status

- Operating files installed on disk (uncommitted at this snapshot).
- Execution layer in place: state machine + Execution Agent role + Task Registry.
- **T-001 (README refresh)** registered as the first task. Awaiting Execution Agent pickup.

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

- **Status:** `todo`
- **Owner:** Execution Agent
- **Spec:** to be created at `docs/specs/readme-refresh.md` when Execution Agent picks up
- **Definition of Done:**
  - [ ] `README.md` version line says `v1.10.22` (was `v1.0.0`)
  - [ ] `README.md` meal count says 375+ Thai meals + 88 branded products (was "85+")
  - [ ] `README.md` "BMR-only — no fake activity levels" claim corrected (TDEE = BMR × activity multiplier today)
  - [ ] `README.md` Features section mentions: scan/OCR, backdate, suggester, meal planner, streaks, goal-aware ring
  - [ ] `README.md` Cost section reflects current models (Haiku 4.5 + Sonnet 4.6)
  - [ ] `README.md` Setup section unchanged (still accurate)
  - [ ] `PROJECT_STATE.md` Open Question 1 marked resolved
  - [ ] All claims verifiable against current code (grep checks documented in spec)
- **Notes:**
  - Registered as the first task to validate the execution loop end-to-end.
  - Doc-only — no production code or version bump expected.
  - Awaiting Execution Agent pickup.

---

## Blockers

None.

---

## Next Actions

> Picked from `PROJECT_STATE.md` Open Questions and the user's intent. Awaiting user pick after T-001 done.

1. **T-002 (TBD): Decide branch + tag policy** — answer Open Questions 3 & 4 in `PROJECT_STATE.md`. Output: `docs/decisions/DEC-003-...md`. Doc-only.
2. **T-003 (TBD): Build `tools/audit-meals.js`** — first audit script, validates macro consistency on `meals.json` (catches v1.10.7-class issues before ship). Code in `tools/`, no production change.
3. **T-004 (TBD): Smoke-test checklist for `confirm-1day-plan`** — covers the v1.10.21 fixed-slot regression class. `docs/specs/qa-meal-plan-confirm.md`.
4. **T-005 (TBD): First feature epic** — pick from open product feedback when ready.

These are *parked*; they do not run until the user picks one.

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
