# DEC-001 — Adopt Orchestrator + Subagents operating model

**Status:** accepted
**Date:** 2026-05-04
**Decided by:** user (project owner) — operating-model upgrade brief

---

## Context

The PraCaL project shipped 22 versions in the v1.10.x series with a single Claude Code session as the sole implementer. The pace was good but several recurring failure modes appeared:

- **Stale references after data changes.** Adding meals to `meals.json` repeatedly left hardcoded counts in UI text out of date (`v1.10.5`, `v1.10.6`, `v1.10.15`). Each was caught and fixed only after the user noticed.
- **Workflows quietly mixing.** Reusing the `meal-detail` view for plan-edit mode in v1.10.19 nearly let plan modifications fire `addLogEntry` and create duplicate today entries; needed an after-the-fact `planEditing` flag and a workflow audit before it was safe.
- **Fixed slot silently skipped.** v1.10.18's `confirm-1day-plan` filtered `slot==='meal' && mealId`, dropping the user's "Vitaday" fixed slot from the batch log. The bug shipped and the user found it (v1.10.21).
- **No audit trail.** Each task started fresh; context that was earned in one task (which screen owns which state, which constants are guardrails, which prompts were tuned to specific failure modes) had to be rediscovered next session.

The user's explicit feedback over the v1.10.15 → v1.10.21 window crystallized into three rules:

1. *"ทุกครั้งที่เสนออะไรไปขอให้แย้งได้และคิดก้าวหน้าเสนอแนะอะไรที่ดีกว่ากลับมาได้เช่นกัน แต่ขอให้เสนอถามมาก่อน"* — propose first, push back, suggest alternatives.
2. *"ต่อไปนี้เวลาเพิ่มอะไรอยากให้ละเอียด เช็คส่วนอื่นที่อาจเกี่ยวข้องแล้วปรับด้วย"* — when adding things, audit related parts.
3. *"ทุกครั้งต่อไปอย่าลืมตรวจสอบ Workflow ให้ดีให้สมบูรณ์ด้วย ไม่ใช่เอาไปปนมั่วกับระบบอื่น"* — trace workflow thoroughly, don't mix with other systems.

These rules are necessary but not sufficient: holding them in a single chat session is fragile, and they get lost when a session ends.

---

## Decision

Adopt an **Orchestrator + Subagents** operating model with project state, task board, file ownership, and approval gates persisted as repo files.

Concretely:

1. **`PROJECT_STATE.md`** at repo root — canonical source for current version, architecture, active task, hard guardrails, file ownership rules, open questions.
2. **`AGENTS.md`** at repo root — defines roles (Orchestrator, Architecture, Data/Domain, UX, Audit/QA, DEV Integration, Refactor) with allowed/disallowed file paths, stop conditions, and approval-gate policy. Codifies the user's three feedback rules as universal rules.
3. **`TASK_BOARD.md`** at repo root — tracks active epic, parallel workstreams, blockers, next actions, "do not start yet" list.
4. **`docs/decisions/`** — records like this one, capturing context + decision + alternatives + consequences for future authors.
5. **`docs/specs/`** — feature specs and implementation briefs authored before code, so DEV Integration has a fixed scope.
6. **`tools/`** — audit scripts and small utilities; READMEs documenting how to run them.

Production-file edits remain serialized through the DEV Integration role; subagents work in parallel on docs, specs, audits, and analysis. Approval gates (scope · implementation · ship) cannot be skipped silently.

---

## Alternatives considered

1. **Keep the unstructured single-session model + try to be more careful.** Rejected: the failure modes above already happened *with* careful intent. Memory of feedback rules is fragile across sessions.
2. **Adopt a heavier framework (e.g., proper ticketing system, CI checks, automated tests).** Rejected for now as overkill: this is a personal/family PWA with a single contributor. Markdown files in the repo give 80% of the benefit at 5% of the setup cost.
3. **Spawn parallel Claude sub-agents for every task via the Agent tool.** Rejected as default: each spawned agent loses the conversation's context and must re-read the repo, which is slower than the orchestrator authoring docs directly. Reserved for genuinely independent workstreams (architecture audit, data validation, etc.).
4. **Move docs into `.github/` or a separate wiki.** Rejected: docs are most useful next to the code they describe. Repo-root markdown is what every reader (human + AI) loads first.

---

## Consequences

### Positive
- Recurring failures (stale counts, workflow mixing, silently skipped data) get a structural fix: the relevant rule lives in `AGENTS.md` and is loaded with `PROJECT_STATE.md` at the start of every task.
- Future Claude Code sessions can resume work without reconstructing context — the operating files are the handoff.
- File ownership prevents two parallel workstreams from colliding on the same file.
- Approval gates are explicit, not vibes-based.
- Decisions get a record. Reversals become deliberate.

### Negative / cost
- Slightly more upfront writing per task (a spec before code, a decision record after).
- Three more files to keep in sync (`PROJECT_STATE.md`, `TASK_BOARD.md` are live; `AGENTS.md` is mostly static).
- The Orchestrator must remember to re-read `PROJECT_STATE.md` at session start and update it when reality changes.

### Neutral / open
- `README.md` becomes a marketing-style overview while `PROJECT_STATE.md` is the engineering truth. Need to refresh README at some point so it stops contradicting `PROJECT_STATE.md` (currently says `v1.0.0`, "85+ meals").

---

## Follow-ups

- [ ] Commit this set of operating files (8 files, doc-only) once the user approves.
- [ ] Add a "Last updated" line update routine to `TASK_BOARD.md` — the Orchestrator should bump it on every status change.
- [ ] Decide on git tags / branch policy (open question 3 + 4 in `PROJECT_STATE.md`); document as DEC-002.
- [ ] At some point: refresh `README.md` so it doesn't contradict `PROJECT_STATE.md` (open question 1).
