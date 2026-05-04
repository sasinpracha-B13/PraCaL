# Project Operating Workflow

**Status:** approved (operating-model setup, DEC-001)
**Owner:** Orchestrator
**Related:** `docs/decisions/DEC-001-project-operating-model.md`, `AGENTS.md`, `PROJECT_STATE.md`, `TASK_BOARD.md`

---

## Goal

Codify how every future task on this project starts, runs, and ends — so context survives session boundaries and the recurring failure modes from the v1.10.x history don't recur.

## Non-goals

- Replace the user's judgment on scope. Approval gates exist precisely so the user calls the shots.
- Add bureaucracy for trivial fixes. A typo in a comment doesn't need a spec.
- Force the use of parallel sub-agents for every task. Parallelism is opportunistic, not mandatory.

---

## How a task starts

1. **User issues a request** in chat.
2. **Orchestrator reads `PROJECT_STATE.md`.** This loads current version, hard guardrails, open questions, file ownership.
3. **Orchestrator audits the touch surface.** Greps for impacted files / strings, reads relevant code, identifies entry points.
4. **Orchestrator proposes scope.** Format:
   - 1–3 options (when there's a real choice)
   - recommendation with reasoning
   - explicit list of files / state / guardrails the option touches
   - open questions blocking implementation
5. **User approves / refines / rejects.** This is the **scope gate**.

---

## How subagents are used

After scope approval, the Orchestrator decides the workstreams.

### When to spawn / simulate parallel subagents

Parallel work is appropriate for:

- **Architecture analysis** — mapping how a new feature plugs into existing screens.
- **Data validation** — auditing `meals.json` for macro consistency before a data change.
- **UX exploration** — wireframing alternative flows before committing to one.
- **Audit / QA** — running an independent regression-checklist pass on existing flows.
- **Documentation** — drafting specs / decision records / READMEs.
- **Isolated tools** — building a `tools/audit-*.js` script that doesn't touch production.

Two subagents may be parallel **only if their *Allowed* paths do not overlap.** If they overlap, the Orchestrator serializes them.

### When NOT to spawn parallel subagents

- The work is a single small file edit (overhead exceeds benefit).
- Production code integration — that's always one DEV Integration Agent doing the integration step.
- Decisions that need the user — agents propose, the user decides.

### How parallel subagents are run

If the Claude Code harness exposes a true parallel subagent tool (`Agent` with multiple invocations in one message), use it. Each subagent gets:

- A self-contained brief (the agent has no conversation context).
- File paths it can read and write.
- A required deliverable shape.
- A response budget ("under 200 words" / "single markdown file").

If parallel subagents aren't available, the Orchestrator simulates them sequentially in the same chat — each output clearly labeled by role to keep them separable.

---

## File ownership rules in practice

Full table is in `AGENTS.md`. Rules in practice:

1. **Doc-only changes** (`PROJECT_STATE.md`, `TASK_BOARD.md`, `docs/**`, `tools/**` READMEs) — any agent in the assigned role may write directly.
2. **Production code** (`index.html`, `service-worker.js`, `netlify/functions/*`, etc.) — only the DEV Integration Agent for the current task. Other agents flag desired changes in their report.
3. **Data files** (`meals.json`, `branded_products.json`) — Data/Domain Agent owns content; if the UI side needs changes too, sequence Data → Architecture spec → DEV Integration.
4. **Two agents must never edit the same file in parallel.** Period.

Agents that find they need to edit outside their lane stop and report. The Orchestrator either re-scopes the task or reassigns.

---

## Approval gates in practice

Three gates, in order:

### Scope gate
- *Trigger:* user issues a request.
- *Output:* proposal with options + recommendation.
- *Outcome:* "go", "go with X changed", "skip".

### Implementation gate
- *Trigger:* DEV Integration finishes implementing.
- *Output:* report — files changed, version delta, audit results, follow-ups.
- *Outcome:* "commit", "revise X", "revert".

### Ship gate
- *Trigger:* commit landed locally; ready to push.
- *Output:* short summary of what's about to deploy.
- *Outcome:* "push" / "wait".

For trivial work (typo fix, single-line clarification), gates can be combined ("ลุย" / "go") but never *silently* skipped — the agent must say which gates were combined and why.

---

## Report structure

Every implementation report follows this shape:

```markdown
## What changed
- file:line — what edit, why
- file:line — what edit, why

## Version delta
- index.html: vX.Y.Z → vX.Y.Z+1
- service-worker.js: vX.Y.Z → vX.Y.Z+1
(or: "no version bump — doc-only change")

## Audit results
- [pass] guardrail X not touched
- [pass] no stale references found (greps run: ...)
- [pass] workflow A still fires correctly (traced: entry → exit)
- [warn] B is similar but out of scope; flagged for follow-up
- [fail] C broke; reverted; needs spec change

## Follow-ups (out of scope for this task)
- ...

## Suggested commit message
v1.10.X: <subject>

<body>

Co-Authored-By: ...

## Awaiting
implementation gate / ship gate
```

The user reads the report, approves the gate, the Orchestrator commits / pushes.

---

## Updating the operating files

| File | When updated | By whom |
|---|---|---|
| `PROJECT_STATE.md` | Version bump · new guardrail surfaced · structural change · open question resolved | Orchestrator (mandatory) |
| `AGENTS.md` | Role added / removed · new universal rule (usually after a decision record) | Orchestrator (after DEC) |
| `TASK_BOARD.md` | Workstream status change · blocker added/resolved · epic changed | Orchestrator (every task) |
| `docs/decisions/` | New decision worth preserving | Orchestrator (final), drafted by relevant subagent |
| `docs/specs/` | Before any non-trivial implementation | Architecture / Data / UX / QA agents |
| `tools/` | New audit script · script README updates | Audit/QA Agent |

---

## Anti-patterns to avoid

These are explicit "don't do this" items, drawn from this project's history:

1. **Don't ship version bump without bumping both `VERSION` constants.** A single-side bump strands users on stale builds.
2. **Don't reuse a screen for a new mode without a flag and a workflow audit.** v1.10.19's `planEditing` flag exists because skipping this audit nearly shipped duplicate logs.
3. **Don't add data without grep-ing for hardcoded counts in UI.** v1.10.5/v1.10.15 caught these the hard way.
4. **Don't introduce a modal without `data-act="noop"` on the inner panel.** `event.stopPropagation()` breaks the document-level click delegation; the noop sentinel is the correct fix.
5. **Don't silently extend scope.** Flag it. The user decides.
6. **Don't skip the gate when the user said "ลุย".** "ลุย" approves the scope you just proposed; it doesn't approve everything you discover mid-implementation.
7. **Don't commit without a report.** The report is what makes the commit reviewable.

---

## Quick reference for new sessions

A future Claude Code session resuming this project should, in order:

1. Read `PROJECT_STATE.md`.
2. Read `TASK_BOARD.md`.
3. Skim `AGENTS.md` (Universal Rules section).
4. If there's an active epic, read its spec(s) in `docs/specs/`.
5. Wait for the user's request.
6. Propose. Don't implement.

That's it. Five files, in order, then engage.
