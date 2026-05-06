# Menu Addition Protocol

**Status:** standard (referenced by `AGENTS.md` Rule 17)
**Applies to:** every task that adds entries to `meals.json` or `branded_products.json`
**Reference example:** T-006 (commit `ade8b5a`) — first task to follow this pattern in full

> Codified per user instruction (T-007 / 2026-05-04): *"สำคัญที่สุด ตรวจข้อมูลโภชณาการปริมาณแคลเช็คให้ถูกต้องที่สุด รวมถึงปริมาณต่อ 1 เสิร์ฟ. จดข้อกำหนดเหล่านี้เข้าไปทุกครั้งก่อนเพิ่มเมนู."*

---

## When this protocol fires

Any task whose scope includes adding ≥1 entry to:

- `meals.json` (the canonical Thai meal database, currently 379 entries)
- `branded_products.json` (the packaged-product database, currently 88 entries)

Bug-fix tasks that *correct* existing entries (e.g., T-005 s02/m18 fix) follow the standard spec template — the addition protocol applies only to inserts.

## Required spec sections

A menu-addition spec must include all of the following, in order:

### 1. Goal + Non-goals (standard)
What's being added, what's deliberately NOT being added (no schema change, no UI change unless explicit, no edits to existing entries unless paired task).

### 2. The new entries — table
Every new entry tabulated with at minimum:

| ID | Name | baseCalories | baseWeight_g | P (g) | C (g) | F (g) | Sugar (g) |
|---|---|---|---|---|---|---|---|

ID format must follow existing series (e.g., `n` for noodles, `m` for mains, etc.). Pick the next available number; never reuse.

### 3. Calorie + portion verification *(the heart of this protocol)*

For each entry, the spec must show:

#### 3a. Anchor — derivation from existing peer(s)
At least one existing entry that the new value is derived from. Show the math:
```
existing_peer:           X cal / Yg / ...
  − ingredient removed:  ...
  + ingredient added:    ...
  = new_entry:           N cal / Mg / ...
```

For every new entry, name at least one anchor. Two-anchor cross-check is encouraged when the dish has both a starch-paired version (e.g., rice or noodles) and a sauce-only version.

#### 3b. Sanity range
For each dish (or dish family), state realistic per-serving calorie ranges with categories:

| Source | Calorie range |
|---|---|
| Home cooking (lighter) | A – B |
| Restaurant / street food | B – C |
| Heavy / extra-coconut / extra-rich | C – D |

Justify the chosen baseline value as belonging to one of these bands. Default for this app: **restaurant / street-food range**, since most users log restaurant or street food.

#### 3c. 1-serving portion (`baseWeight_g`)
State the typical Thai serving weight with reference. For paired starch + protein dishes, break it down (e.g., "200g pasta + 200g sauce + 80g protein = 480g").

If the new entry shares a portion convention with an existing peer, cite it (e.g., "matches n12 ขนมจีนน้ำยา's 420g convention").

#### 3d. Macro-consistency prediction
For each entry, the spec must predict the audit's diff%:
```
n24: macro-cal = P×4 + C×4 + F×9 = ... vs baseCalories ... = predicted X.X%
```

The prediction must fall in the **pass band (≤5%)**. If a prediction lands in the **warn band (5-15%)**, the spec must justify why a more precise value isn't possible (e.g., the dish has high natural variance).

A prediction in the **fail band (>15%)** means the entry is wrong — revise before flipping to `in_progress`.

#### 3e. Real-user fit *(per user instruction T-007 review-2: "ทำให้เหมาะกับการใช้งานจริงของผู้ใช้ทุกครั้ง")*

After the math passes, *step back* and ask whether each entry is realistic for how Thai users actually log this dish in real life:

- **Serving size** — does `baseWeight_g` match a typical real-world serving in the user's likely eating context (cafe / street food / restaurant / home)? Specifically:
  - Cross-check against existing peer entries in the same category (don't ship a 260g pasta when sister entries are all 320–380g without justification)
  - If unsure, default to the average restaurant-portion weight for that dish family
- **Calorie level** — does the value sit in the *restaurant range* for the dish family (default), unless the dish is naturally light (e.g., salad, fruit, broth)?
- **Macro profile** — does the protein/fat/carb split match the cooking style? (e.g., a vegetarian pasta should have low protein; a fried-meat dish should have high fat)
- **Customization realism** — do the customization options match how users actually order? (e.g., "ไม่ใส่กะทิ" makes sense for curry; "extra cheese" makes sense for Italian pasta but not for ขนมจีน)
- **Name spelling** — Thai name uses standard transliteration; users will recognize it in search

This step often catches entries where the macros pass numerically but the dish doesn't pass the smell test. Adjust before flipping `in_progress → review`.

### 4. Customizations (optional but encouraged)
2–4 customizations per entry, matching the density of similar existing entries. Use existing customization IDs where possible (e.g., `extra_noodles`, `less_coconut`, `less_spicy`).

### 5. Affected files (standard)
List all files touched: `meals.json`, `service-worker.js`, `index.html`, the spec, `PROJECT_STATE.md`, `TASK_BOARD.md`.

### 6. Workflow audit (standard)
Trace every flow that reads the new entries: library, search, suggester, planner, customizations, log entry, reports, PWA cache.

### 7. DoD checklist *(see below — protocol-specific items)*

### 8. Test plan + Rollback plan + Open questions (standard)

## Required Definition-of-Done items

Every menu-addition task's DoD must include all of these:

- [ ] All N entries inserted with exactly the values shown in the spec table
- [ ] Each entry's macro-consistency falls in audit `pass` band (≤5%) — verified by post-edit run
- [ ] Per-entry post-edit diff% **matches the spec's prediction** (exact match within rounding)
- [ ] **Real-user fit check passed for every entry (per §3e)** — serving size, calorie level, macro profile, customizations, name spelling all realistic for Thai user context
- [ ] `meals.json` data version bumped (`"version"` field at top)
- [ ] `service-worker.js` `VERSION` bumped (cache invalidation — required because meals.json is cache-first)
- [ ] `index.html` `VERSION` bumped (must match service-worker — hard guardrail)
- [ ] Total entry count = previous + N (no entries dropped or duplicated)
- [ ] Total `pass` count delta = +N (no existing entries shifted band)
- [ ] `warn` and `fail` counts unchanged from before this task (no collateral on existing entries)
- [ ] `git diff <data-file>` shows exactly 2 hunks: top version field + insertion region (no edits to surrounding entries)
- [ ] Sibling data files (e.g., `branded_products.json` when adding to `meals.json`) byte-identical (absent from `git diff --stat`)
- [ ] `tools/audit-meals.js` unchanged (this task adds data, not tooling)
- [ ] `PROJECT_STATE.md` Current Version + Latest Completed Work + Active Task all updated
- [ ] Spec lists the protocol explicitly (cite "follows menu-addition-protocol.md")

## Audit workflow

After insertion:

1. Run PS parallel-impl audit (per DEC-002): `tools/.audit-meals-verify.ps1` (or rewrite inline if not present)
2. For each new entry, log: `[id] cal · macros=N · diff=±X.X (±Y.Y%) · band=pass`
3. Confirm aggregate: total +N · pass +N · warn unchanged · fail unchanged · skipped unchanged
4. Confirm hash invariants: sibling data files unchanged

## Why this protocol exists

Catches three failure classes that have actually happened in this project:

1. **Stale calorie data** (T-005 fixed s02 + m18 — caught because someone wrote macros that didn't match calories). Predicting diff% in spec forces the writer to do the math first.
2. **Collateral edits** (the "I'll just fix this one other thing while I'm here" anti-pattern). Diff-scope check catches it.
3. **Cache-stranded users** (changing meals.json without bumping VERSION leaves PWA users on stale data). Triple-bump check catches it.

The protocol takes ~5 extra minutes per task and prevents all three.

## Reversal / amendment

Changes to this protocol require a decision record (`docs/decisions/DEC-NNN-...md`) that names what's being relaxed/tightened and why. The protocol is then updated to match.
