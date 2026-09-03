# DEC-004 — Unknown-nutrient direction: absent ≠ zero, and estimates fail safe

**Status:** accepted
**Date:** 2026-09-03
**Decided by:** user (project owner) — directive `"ลุยตามที่คิดว่าเหมาะสมและจะถูกต้องรอบคอบ ละเอียด ไม่ผิดพลาด"` at the T-023/T-024 scope gate
**Extends:** [DEC-003](DEC-003-calorie-safety-direction.md) — the same "fail safe for the dieter" principle, generalized past calories

---

## Context

T-024 adds four nutrients the app has never tracked: `satFat_g`, `fiber_g`, `sodium_mg`, `alcohol_g`. Two properties make them unlike the existing four macros:

1. **Coverage will be partial for a long time.** `meals.json` has 408 entries and `branded_products.json` 88; values will land in waves, and AI-estimated / OCR'd / custom entries may never carry all four. The existing macros have had full coverage since day one, so no code in the app has ever had to distinguish "this food has none of X" from "we don't know how much X this food has."
2. **The direction of danger is not the same for all four.** DEC-003 settled calories: over-state is safe, under-state is dangerous. That reasoning does **not** transfer uniformly here. Under-stating saturated fat hides the exact risk the user is trying to see. Over-stating fiber tells the user they have met a target they have not met — and the driving question behind T-024 is why LDL is 162 while the diet log looks clean.

The failure this decision exists to prevent: the app renders `ใยอาหาร 0 g` for a day whose foods simply have no `fiber_g` yet, the user reads it as a measurement, and a real dietary signal is buried under fake data.

## Decision

**1. Absent means absent.** An unknown nutrient field is **omitted from the object** — never `0`, never `null`. Readers must use `x.fiber_g != null`, never `x.fiber_g || 0`. `0` is reserved for "measured, and genuinely zero" (e.g. beer has no fiber).

**2. Every displayed total carries its coverage.** Any surface showing a total for these four nutrients states how much of the day it actually covers — e.g. `ใยอาหาร 12 g (จาก 4/6 รายการ)`. A total whose coverage is below a threshold is shown as incomplete rather than as a number to act on. No ring, target, or goal-state may be driven by a partially covered nutrient.

**3. Estimates lean in the direction that fails safe — which differs per nutrient.**

| nutrient | when uncertain, lean | why |
|---|---|---|
| `satFat_g` | **high** | It is the variable under investigation. An under-estimate produces a falsely reassuring day and defeats the purpose of tracking it. |
| `sodium_mg` | **high** | Risk nutrient; same logic. |
| `alcohol_g` | **high** | Risk nutrient; also keeps calories consistent with DEC-003 (7 kcal/g). |
| `fiber_g` | **low** | *Beneficial* nutrient — the only one of the four where the risk is the opposite. Over-stating fiber tells the user they hit 25–30 g when they did not. |

The unifying rule, of which DEC-003 is the calorie instance: **when uncertain, estimate in the direction that makes the app's advice more conservative, never more flattering.**

**4. Derived values are marked as derived.** A `satFat_g` inferred from a per-category ratio of `fat_g` is not the same class of fact as one read off a nutrition label. Entries whose values are derived rather than sourced are marked (see T-024 for the mechanism) so a later data pass can find and upgrade them, and so an audit never treats a derived value as evidence.

**5. No new nutrient may gate an existing behavior.** The goal ring, streaks, meal planner, suggester and reports keep working on the four original macros. The new nutrients are additive read-outs until coverage is high enough for a separate, explicit decision to promote one.

## Alternatives considered

| Option | Rejection reason |
|---|---|
| Default unknown to `0` | The failure this decision exists to prevent. Silently converts missing data into a measurement, and `0` is indistinguishable from a true zero. |
| Apply DEC-003's "lean high" uniformly to all four | Correct for satFat/sodium/alcohol, **backwards for fiber** — it would inflate the one nutrient whose shortfall is the suspected problem. |
| Require 100% coverage before shipping any of it | Blocks all four nutrients behind the slowest one (`sodium_mg`, which needs label data the app does not have). Coverage disclosure lets the useful ones ship early. |
| Store a parallel `_known` bitmask per entry | More faithful, but a second source of truth to keep in sync with the values themselves. Absence already encodes it, at zero schema cost. |

## Consequences

### Positive
- The app can never claim a fiber intake it did not observe — the specific way this feature could have done harm.
- Partial coverage becomes shippable: the four nutrients roll out as data arrives instead of waiting on the worst-covered one.
- Generalizes DEC-003 into a rule that covers the next nutrient too, instead of re-litigating direction each time.

### Negative / cost
- Every reader of these fields needs a null check; `|| 0` is a live bug pattern the audit must watch for.
- Coverage strings add UI text to already-dense surfaces.
- Derived-value marking adds a field to entries that carry estimates.

### Neutral / open
- The coverage threshold below which a total is shown as "incomplete" is a T-024 spec detail, not fixed here.
- Whether a fully covered `satFat_g` should eventually get its own daily target is deferred to a later decision (rule 5).

## Follow-ups

- [ ] T-024 spec — schema, per-category derivation table, coverage-display rule, derived-value marking
- [ ] `tools/audit-meals.js` — teach it the new optional fields; flag `|| 0` reads and any entry carrying `0` where a derived estimate was expected
- [ ] `docs/specs/menu-addition-protocol.md` — new entries state the four fields (or explicitly record them as unknown), citing DEC-004
- [ ] `docs/AI-HANDOFF-BRIEF.md` — tell a consultant that a blank nutrient column means unmeasured, not zero

### Reversal triggers

- Coverage reaches a level where "absent" becomes rare enough that the coverage disclosure is noise rather than protection.
- A measured data source (verified label database) replaces derivation, making the lean-direction rule unnecessary for the nutrients it covers.
- User decides they would rather see a best-guess total than an incomplete one.
