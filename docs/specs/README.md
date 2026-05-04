# Specs & Implementation Briefs

This folder holds the **what** and **how** of each non-trivial change before any code is written.

Decision records (`docs/decisions/`) capture *choices*; specs capture *plans*.

## When to write a spec

- Any feature that touches more than one screen.
- Any feature that introduces a new state shape (`state.tmp.*` keys, log entry fields, etc.).
- Any feature that reuses an existing screen for a new mode.
- Any data shape change (`meals.json`, `branded_products.json`, log entries, settings).
- Any AI prompt change in `netlify/functions/*`.
- Any UX flow that has more than two clicks.

A trivial change (single-line, single-file, no behavior change for any other flow) does not need a spec.

## Naming

```
<feature-or-area>-<aspect>.md
```

Optional prefixes for clarity:

- `data-*.md` — data domain (meals, products, schemas)
- `ux-*.md` — UX flow / wireframe / copy
- `qa-*.md` — test plan / regression checklist
- `refactor-*.md` — refactor proposal

Examples:
- `meal-plan-1day-mode.md`
- `data-meals-schema-v2.md`
- `ux-suggester-empty-states.md`
- `qa-meal-plan-regression-checklist.md`

## Required sections (feature spec)

```markdown
# <Feature name>

**Status:** draft · approved · implemented · superseded
**Owner:** <agent role>
**Related:** <DEC-NNN if applicable, related specs>

## Goal
One sentence on what user-visible thing changes.

## Non-goals
What this spec deliberately does NOT cover. Pre-empts scope creep.

## Entry points
Every place in the UI / state where this feature can be triggered. List `data-act` values, `state.view` transitions, dashboard chips, deep links.

## State changes
New `state.tmp.*` keys, new log entry fields, new constants. Include defaults and lifecycle (when set, when cleared).

## Affected views
List every `renderXxx()` function this feature touches or is rendered by. For each: what changes, what stays the same.

## Workflows that must keep working
List every existing user flow that touches the same code (e.g., "library → meal-detail → save", "edit log entry → meal-detail → update"). For each: confirm the spec doesn't break it, or explicitly list what it changes.

## Hard guardrails touched
None / list each (with section reference in `PROJECT_STATE.md`). Any guardrail-adjacent work needs explicit approval.

## Test plan
Manual checklist (this project has no automated tests today). Each step: action → expected outcome.

## Open questions
Things to resolve before approval. Tag the deciding role.

## Rollback plan
What's the smallest revert if this feature ships and breaks something? (Often: revert the commit, version unbump.)
```

## Required sections (qa / regression spec)

```markdown
# <QA topic>

**Status:** draft · approved · ongoing
**Trigger:** when does this checklist run? (every commit · every meal-data change · every release)

## Scope
What is and isn't covered.

## Checklist
- [ ] step 1 → expected
- [ ] step 2 → expected
...

## Failure handling
What to do when a step fails (file an issue · revert · escalate).
```

## Spec lifecycle

1. **draft** — being written, not yet approved.
2. **approved** — Orchestrator + user have signed off; DEV Integration may now implement.
3. **implemented** — code is in main; spec stays as historical record.
4. **superseded** — replaced by a later spec; the new spec links back.

Specs are not deleted when implemented — they're the historical record of intent.
