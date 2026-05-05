# DEC-002 — `tools/*` runtime: JS canonical, PowerShell fallback evidence

**Status:** accepted
**Date:** 2026-05-04
**Decided by:** user (project owner) — T-004

---

## Context

T-003 ("`tools/audit-meals.js`", commit `aa20e6a`) shipped an audit script for `meals.json`. The implementation environment had no Node runtime installed (also no real Python; only PowerShell was available). The DoD originally required `node tools/audit-meals.js` to run successfully — that item could not be verified locally.

After exploration, the script's logic was verified via a parallel PowerShell implementation (`tools/.audit-meals-verify.ps1`, gitignored helper) that mirrored the JS line-for-line. Read-only behavior was verified by `Get-FileHash` of `meals.json` before and after the run (md5 unchanged). The user accepted that evidence as canonical and reclassified the Node-runtime check as *optional validation*.

That ad-hoc resolution worked but left the project's runtime expectations implicit. Future Execution Agents in similar environments would re-discover the gap, repeat the `review → blocked → done` cycle, and possibly invent a different evidence pattern. This decision codifies the policy.

The brief was specifically: *"T-004 — runtime decision · standardize: Node required? หรือ PowerShell fallback? · เขียน DEC แยก"*.

---

## Decision

For `tools/audit-*.js` and similar Node-runtime tools in this repo, **JavaScript is the canonical source of truth.** When Node is not available in the dev environment, a **PowerShell parallel-implementation is acceptable as primary evidence** for a task's DoD, subject to three conditions:

1. **Read-only invariant verified** — `Get-FileHash` (or equivalent) before and after the verifier run shows the input data file is unchanged. Failing this is a hard fail; the verifier is not acceptable as evidence.
2. **Line-for-line mirror** — the PS verifier implements the same logic as the JS, not an approximation. If the JS has a typo, the PS should not silently "fix" it; if it diverges, the verifier is invalid.
3. **Naming + gitignore** — the verifier lives at `tools/.<script-name>-verify.ps1` (dot-prefix). It is gitignored as a local helper. The JS in `tools/` is the deliverable.

Future audit scripts written without Node available are encouraged to also produce a verifier following the same pattern. The verifier is a development aid, not a tracked artifact.

This decision applies to the *audit class* of tools (`tools/audit-*`). Other tool classes (e.g., generators, pre-commit hooks) may need their own decisions if and when they're introduced.

---

## Alternatives considered

| Option | Rejection reason |
|---|---|
| Make Node a required dev dependency (install precondition) | Adds friction; user's env doesn't have Node and the running app (PWA) doesn't need it; over-specification for a one-script tools layer. |
| Migrate `tools/*` to PowerShell as canonical | Loses cross-platform readability; `pwsh` not always available on contributors' machines; would require renaming/porting `audit-meals.js` for no clear gain. |
| Dual-canonical (`.js` + `.ps1` siblings, both committed and tested) | Doubles maintenance per script; drift risk between siblings; overkill for the current single-script tools layer. Listed as the explicit reversal path if the situation changes. |
| Status quo (PS as informal local helper, no codification) | The implicit assumption is exactly what caused T-003's `blocked` cycle. Without writing it down, the next session re-invents an ad-hoc evidence model. |

---

## Consequences

### Positive
- Light: no file moves, no renames, no migration. The tools layer stays as it is at commit `aa20e6a`.
- Codifies the working pattern from T-003 so the next Execution Agent in a similar env doesn't re-discover the gap.
- Keeps the JS canonical (industry-standard for tools), but allows the project to keep moving when Node is unavailable.
- Reversible cheaply — if `tools/*` grows beyond what dual-impl-by-helper can sustain, switch to one of the alternatives above.

### Negative / cost
- "Soft dependency" on Node remains. A contributor with no Node and no PowerShell skill cannot validate `tools/*` output without help.
- PS verifiers stay gitignored, so they're invisible to fresh clones. Each contributor who needs one rebuilds it. This is by design (the JS is the truth) but is a real cost.
- Dual maintenance still applies *if* the verifier is created. Not enforced — a contributor can skip the PS verifier if they have Node.

### Neutral / open
- This decision does not commit the project to keeping things light forever. If the audit-tooling scope grows materially, revisit.

---

## Follow-ups

- [ ] `tools/README.md` — add "Runtime policy" subsection at the top, citing DEC-002.
- [ ] `AGENTS.md` — Universal Rule (next number: 14) cross-references DEC-002 so the runtime expectation is loaded with `PROJECT_STATE.md` at the start of every session.
- [ ] `PROJECT_STATE.md` — Open Question 2 updated: runtime question resolved; broader test infra question (CI, more audit scripts, pre-commit hooks) is still open separately.
- [ ] `TASK_BOARD.md` — T-003A is *superseded by T-004 / DEC-002*. Status flips to `superseded`. The strategic question T-003A targeted is now answered; the tactical purpose (unblock T-003) was already fulfilled.

### Reversal triggers

If any of these conditions are observed, T-004 should be revisited (likely as a new decision DEC-N that supersedes DEC-002):

- A `tools/*` script needs npm packages (Node becomes a hard dep).
- More than two audit scripts produce drift between their JS canonical and their PS verifier.
- A non-Windows contributor finds the PS-only helper pattern unacceptable.
- The dev environment changes such that Node is always available (then DEC-002 can simplify to "Node required, no fallback").
