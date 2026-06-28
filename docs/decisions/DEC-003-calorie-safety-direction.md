# DEC-003 — Calorie safety direction for menu entries: ไปเกินได้แต่ห้ามขาด

**Status:** accepted
**Date:** 2026-06-28
**Decided by:** user (project owner) — directive given before T-021

---

## Context

The menu-addition protocol (AGENTS.md Rule 17 / `docs/specs/menu-addition-protocol.md`) requires that each new `meals.json` entry's `baseCalories` reconcile with its macros within ±5% (`P×4 + C×4 + F×9` vs `baseCalories`). That band is symmetric — it accepts entries that under-state calories (negative diff) just as readily as ones that over-state them.

The user added a one-directional safety requirement, to be recited as a mantra before every menu addition:

> *"ตรวจสอบความถูกต้องของข้อมูลอย่างละเอียดตามหลักเกณฑ์ของ APP · ปริมาณต่อ 1 เสิร์ฟต้องแม่น และแคลต้องแม่น · **ไปเกินได้แต่ห้ามขาด** · ท่องเป็นบทจดจำไว้ทุกครั้งที่สั่งเพิ่มเมนู"*

Rationale (user's intent): the app serves dieters. **Under-counting calories is the dangerous failure** — the user eats more than the app says and silently loses their deficit. **Over-counting is safe** — they may eat slightly under budget and still progress. So the app's stated calorie should never fall below the food's real calories; when uncertain, round up.

## Decision

For every meal/product entry added from this point on (first applied in **T-021 / v1.10.47**):

1. **Portion (`baseWeight_g`) must be accurate to a real 1-serving** — unchanged from the protocol; this decision does not relax portion accuracy.
2. **`baseCalories` leans to the upper part of the realistic range** — not the midpoint, never the lower end. When uncertain between two plausible values, choose the higher.
3. **Macro-consistency diff must be non-negative**: `baseCalories >= P×4 + C×4 + F×9`, i.e. the per-entry diff% sits in the **[0, +5%]** band (still inside the protocol's ±5% PASS band, but only the upper half). A stated calorie below the macro sum is now a fail, not a pass.
4. **Subtractive customizations** (e.g. `no_rice`, `no_skin`) subtract **conservatively** — a touch less than the full component estimate — so a customized total never undercounts.

Existing entries with negative diff are **grandfathered** (no retroactive rewrite); this is a forward rule. A future data-pass could tighten them if desired, but that is out of scope here.

## Alternatives considered

| Option | Rejection reason |
|---|---|
| Keep the symmetric ±5% band (status quo) | Permits under-counting, which is the user's named danger for dieters. |
| Tighten to a narrower symmetric band (e.g. ±3%) | Reduces error magnitude but still allows the wrong *direction* (undercount). Doesn't address the asymmetric safety concern. |
| Retroactively rewrite all existing negative-diff entries | Large diff churn across the dataset, re-opens settled entries, risks collateral edits. Better as an optional future pass than bundled with a 2-entry add. |
| Memory-only (don't codify in protocol) | The mantra would not bind future sessions reading the protocol/AGENTS.md. Codifying makes it load with `PROJECT_STATE.md` every session. |

## Consequences

### Positive
- Dieter-safe by construction: the app can over-state but never under-state calories for new entries.
- Cheap to apply — it only constrains *which* value to pick within the already-required realistic range and macro band.
- Recorded in three places (memory, protocol §3, this DEC) so it survives session boundaries.

### Negative / cost
- New entries will read slightly "calorie-pessimistic" vs a strict midpoint estimate. Acceptable per the user's explicit trade-off.
- Asymmetry between old (some negative-diff) and new (non-negative) entries until/unless a future tightening pass runs.

### Neutral / open
- Does not change the ±5% magnitude tolerance — only its allowed sign for new entries.

## Follow-ups

- [x] `docs/specs/menu-addition-protocol.md` §3 — add the "Calorie safety direction" rule + non-negative-diff DoD item, citing DEC-003.
- [x] Memory — `menu-calorie-safety-direction.md` (feedback) so it's recalled each session.
- [ ] AGENTS.md Rule 17 — cross-reference DEC-003 next time AGENTS.md is edited (the protocol doc is the operative copy in the meantime).

### Reversal triggers

- User reverses the trade-off (wants midpoint/most-likely estimates instead of upper-lean).
- A future decision adopts a measured-data calorie source (e.g. lab values) where "real" calories are known and the over-estimate margin becomes unnecessary.
