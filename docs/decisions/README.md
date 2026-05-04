# Decision Records

This folder holds architectural / process / scope decisions that are worth preserving across tasks.

The point isn't bureaucracy — it's so that when a future change wants to reverse a choice, the new author can read why the choice was made instead of guessing.

## Naming

```
DEC-NNN-short-kebab-title.md
```

- `NNN` — three-digit zero-padded sequence (`001`, `002`, ...). New decisions take the next number; numbers are never reused.
- `short-kebab-title` — 3–6 words, lowercase, hyphen-separated.

Examples:
- `DEC-001-project-operating-model.md`
- `DEC-007-add-meal-data-version-field.md`
- `DEC-014-switch-suggester-to-show-all.md`

## Required sections

Every decision file must have these sections, in this order:

```markdown
# DEC-NNN — <Title>

**Status:** proposed · accepted · superseded by DEC-NNN · deprecated
**Date:** YYYY-MM-DD
**Decided by:** <user / orchestrator / agent>

## Context
What was the situation? What forced a decision now?

## Decision
What did we decide to do? One sentence first, then detail.

## Alternatives considered
Other options on the table. Why each was rejected (one line each is fine).

## Consequences
What changes because of this? What new constraints / opportunities does it create?
Both positive and negative — be honest about the trade-off.

## Follow-ups
Things this decision implies but doesn't itself accomplish (e.g., "update README to match", "audit existing X for the new rule").
```

## When to write a decision record

- Choosing between two architectures or libraries.
- Adopting or dropping a workflow rule.
- Reversing a previous decision.
- Codifying a guardrail that was previously implicit.
- A scope cut or a "we won't do this" — the absence is also a decision.

## When NOT to write one

- Bug fixes (commit message is enough).
- Minor refactors with no design choice.
- Single-feature implementation details (those go in `docs/specs/`).

## How decisions become rules

Once a decision affects every future task, copy the rule into `AGENTS.md` (Universal Rules or relevant role) or into `PROJECT_STATE.md` (Hard Guardrails). The DEC file remains as the historical record; the rule lives where the agents read it.
