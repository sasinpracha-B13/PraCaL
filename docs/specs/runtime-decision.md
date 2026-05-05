# T-004 — Runtime decision for `tools/*`

**Status:** approved (drives DEC-002)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-004 · `PROJECT_STATE.md` Open Question 2 · `DEC-002-tools-runtime.md` (this task creates it)

---

## Goal

Formalize what runtime `tools/*` scripts target, and what counts as acceptable evidence when running them. Closes the implicit assumption surfaced by T-003 ("Node will be available") that forced an ad-hoc `review → blocked → done` transition because the dev env had no Node.

## Non-goals

- **Not adding Node as a required dev dependency.** The running app is a PWA; Node is only used for `tools/*`.
- **Not migrating `tools/audit-meals.js` to PowerShell.** Existing JS stays.
- **Not introducing `package.json` or npm packages.** Pure stdlib only — that's a separate decision if ever needed.
- **Not removing the gitignored helper pattern** (`tools/.*`). The PS verifier from T-003 stays where it is.

## Options considered

| # | Option | Pros | Cons |
|---|---|---|---|
| A | **Node required** — install Node as dev precondition; gitignored PS helpers banned | Industry standard; one source of truth | Forces install; user's env has only PS; over-specifies a small project |
| B | **PowerShell required** — drop JS; canonical scripts are `.ps1` | Works in user's env without install | Loses JS ecosystem; cross-platform devs need `pwsh`; would require migrating existing `audit-meals.js` |
| C | **Dual-canonical** — every audit script ships as both `.js` and `.ps1`, both committed, outputs must match | Max flexibility; works in any env | Doubles maintenance per script; drift risk between siblings |
| D | **PS-canonical with JS reference port** — `.ps1` is primary, `.js` is documentation | Matches user env | Loses Node-as-default ergonomics; demotes existing JS to second-class |
| E | **Status quo (do nothing)** — keep PS as informal local helper | Zero work | Repeats T-003's `blocked` cycle; new sessions don't know the policy |
| F | **Node primary, PS parallel-implementation as formal fallback evidence** — codify the pattern T-003 produced | Light; matches what worked; no restructure | "Soft dependency" on Node remains; PS helper stays gitignored (not visible by default) |

## Recommendation

**Option F.** Codifies the working pattern from T-003 with the smallest possible commitment. Trade-off chart:

- F vs A: F doesn't force install; A is heavier than the project size justifies.
- F vs B/D: F keeps existing JS; B/D require migration work for a single audit script.
- F vs C: F doesn't double-maintain; C is overkill for the current 1 script.
- F vs E: F is *codified* (policy lives in `DEC-002` + `tools/README.md` + `AGENTS.md`); E leaves it implicit and recurs.

The decision can be reversed cheaply if scope changes (e.g., if `tools/*` grows to 5+ scripts and PS verifiers double-maintain too painfully, migrate to C; if Node becomes a hard dep for some tool, switch to A). DEC-002 documents this exit path in its Follow-ups.

## Decision content (lands in `docs/decisions/DEC-002-tools-runtime.md`)

> **Decision:** For `tools/audit-*.js` and similar Node-runtime tools, JavaScript is the canonical source of truth. When Node is unavailable in the runtime environment, a PowerShell parallel-implementation that mirrors the JS logic is acceptable as primary evidence, provided:
> 1. The read-only invariant is verified (`Get-FileHash` before/after — no mutation)
> 2. The PS verifier mirrors the JS line-for-line (not approximate)
> 3. The PS verifier is named `tools/.<script-name>-verify.ps1` and stays gitignored as a local-only helper

Full DEC-002 has Status / Context / Decision / Alternatives / Consequences / Follow-ups sections.

## Affected files (this task)

| File | Change |
|---|---|
| `docs/decisions/DEC-002-tools-runtime.md` | **new** — the decision record |
| `tools/README.md` | adds "Runtime policy" subsection at top citing DEC-002 |
| `AGENTS.md` | Universal Rules cross-reference (rule 14) — runtime expectations for `tools/*` work |
| `PROJECT_STATE.md` | Open Question 2 updated — runtime resolved, broader test infra still partial |
| `TASK_BOARD.md` | T-004 row → `review`; T-003A row → `superseded by T-004` |
| `docs/specs/runtime-decision.md` | this spec (new) |

No code changes. No production effect.

## Workflow audit

1. **Existing `tools/audit-meals.js`** — unchanged; still the canonical for that audit. ✓
2. **Future audit scripts** — written as `.js`; ad-hoc PS verifier in `tools/.*-verify.ps1` is encouraged when Node-less verification is needed. ✓
3. **AGENTS.md universal rule** — cross-references DEC-002 so a future Execution Agent knows the runtime expectation upfront. ✓
4. **T-003A** — was registered as a tactical unblock for T-003 (which is now done) and a structural alternative (PS-canonical). T-004 supersedes T-003A's strategic question; T-003A is closed as `superseded`. ✓
5. **No production guardrails touched.** ✓

## Test plan

Manual verification:

1. After commit, `cat docs/decisions/DEC-002-tools-runtime.md` reads as a coherent decision record (Context / Decision / Alternatives / Consequences / Follow-ups).
2. `grep -c "DEC-002" tools/README.md AGENTS.md` returns ≥ 2 (cross-references exist).
3. `tools/audit-meals.js` byte-identical to before this commit (`git diff`).
4. `meals.json` byte-identical to before this commit.
5. T-003A status in `TASK_BOARD.md` reads `superseded` with link to T-004 + DEC-002.

## Open questions

- **Should the PS verifier file be `.audit-*-verify.ps1` (current dot-prefix gitignore convention) or moved to a tracked sibling like `tools/audit-*.ps1`?** Recommendation: keep dot-prefix gitignored — it's a local helper, not a deliverable. The JS is what ships. If this proves wrong over time, T-004's DEC-002 explicitly lists "promote to dual-canonical" as a reversal path.

## Rollback plan

`git revert <T-004 commit>` removes the DEC-002 file and the cross-references. No tools layer files are renamed in this task, so the tools layer is unaffected.
