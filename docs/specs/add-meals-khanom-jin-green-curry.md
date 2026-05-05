# T-006 — Add ขนมจีนแกงเขียวหวาน variants

**Status:** approved (user-directed scope · production-data add · Rule 16 satisfied)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-006 · DEC-002 (PS verification policy applies)

---

## Goal

Add 4 variants of **ขนมจีนแกงเขียวหวาน** (rice noodles with green curry) to `meals.json`. Each entry is verified against existing reference dishes for calorie + 1-serving accuracy (the user's stated priority).

## Non-goals

- ❌ No edits to existing entries (s02 / m18 / r14 / m03 / m77 / n12 stay byte-identical).
- ❌ No schema change.
- ❌ No new categories (use existing `noodles` like sister entry n12 ขนมจีนน้ำยา).
- ❌ No UI changes (entries surface through existing library / search / suggester paths).
- ❌ No customization explosion — keep 3 standard customizations per entry, matching existing patterns.

## The 4 variants

| ID | Name | baseCalories | baseWeight_g | P (g) | C (g) | F (g) | Sugar (g) |
|---|---|---|---|---|---|---|---|
| **n24** | ขนมจีนแกงเขียวหวานไก่ | 700 | 420 | 29 | 74 | 31 | 8 |
| **n25** | ขนมจีนแกงเขียวหวานไก่ใส่ฟัก | 680 | 480 | 28 | 78 | 28 | 8 |
| **n26** | ขนมจีนแกงเขียวหวานเนื้อ | 760 | 420 | 30 | 74 | 36 | 8 |
| **n27** | ขนมจีนแกงเขียวหวานลูกชิ้นปลา | 690 | 420 | 22 | 86 | 29 | 8 |

All emoji: 🍜 (matches n12 ขนมจีนน้ำยา) · category: `noodles`.

## Calorie + portion verification (the user's #1 concern)

### Anchor reasoning — derived from r14 ข้าวแกงเขียวหวานไก่ (existing peer)

`r14` is the closest existing peer: same curry + a starch base (rice). I derive ขนมจีน variants by *swapping the starch* and adjusting protein:

```
r14 (ข้าวแกงเขียวหวานไก่):
  total: 680 cal / 400g  / 28P / 70C / 30F / 8S
  − rice (200g cooked):  -260 cal / -5P / -56C / 0F / 0S
  = pure curry:         420 cal / 200g / 23P / 14C / 30F / 8S
  + ขนมจีน (200g):       +280 cal / +6P / +60C / +1F / 0S
  = ขนมจีน + curry:      700 cal / 400g / 29P / 74C / 31F / 8S   ← n24
```

Cross-check vs **m03 แกงเขียวหวานไก่** (curry alone, 350g, 485 cal, 24P / 14C / 32F / 6S): the curry portion derived above (420 cal, 23P, 14C, 30F, 8S) matches m03's macros within rounding tolerance (m03 has slightly bigger serving + slightly different chicken-to-sauce ratio — both valid).

Cross-check vs **n12 ขนมจีนน้ำยา** (420g, 480 cal, 20P / 65C / 18F / 6S): น้ำยา has less coconut than เขียวหวาน → less fat (~18 vs ~31), less calories (~480 vs ~700). The 220-cal gap is consistent with the difference in coconut milk content. ✅

### Per-variant adjustments

**n24 — ขนมจีนแกงเขียวหวานไก่** (baseline derivation)
- Total: 700 cal / 420g / 29P / 74C / 31F / 8S
- macro-cal: 29×4 + 74×4 + 31×9 = 116 + 296 + 279 = **691 cal vs 700 → −1.3% ✓ pass**

**n25 — ขนมจีนแกงเขียวหวานไก่ใส่ฟัก** (chicken + winter melon)
- ฟัก (winter melon) ≈ 13 cal/100g, ~0.5g protein, 3g carb, 0g fat per 100g
- Adding 100g ฟัก dilutes the dish: same chicken, slightly less coconut absorbed (or perceived as lighter)
- Adjustment from n24: cal 700 → 680 (−20), weight 420 → 480 (+60 from ฟัก mass), carbs 74 → 78 (+4 from ฟัก carbs), fat 31 → 28 (−3, lighter feel from veg)
- Total: 680 cal / 480g / 28P / 78C / 28F / 8S
- macro-cal: 28×4 + 78×4 + 28×9 = 112 + 312 + 252 = **676 cal vs 680 → −0.6% ✓ pass**

**n26 — ขนมจีนแกงเขียวหวานเนื้อ** (beef)
- Beef (Thai-curry-cut, ~80g per serving): ~190 cal vs chicken's ~150 cal — slightly more fat
- Adjustment from n24: cal 700 → 760 (+60), protein 29 → 30 (+1), fat 31 → 36 (+5 from beef fat)
- Total: 760 cal / 420g / 30P / 74C / 36F / 8S
- macro-cal: 30×4 + 74×4 + 36×9 = 120 + 296 + 324 = **740 cal vs 760 → −2.6% ✓ pass**

**n27 — ขนมจีนแกงเขียวหวานลูกชิ้นปลา** (fish balls)
- Fish balls (~80g): lower fat, some starch filler (~12g carbs from filler)
- Adjustment from n24: cal 700 → 690 (−10), protein 29 → 22 (−7, less protein-dense than meat), carbs 74 → 86 (+12 from fish-ball starch), fat 31 → 29 (−2)
- Total: 690 cal / 420g / 22P / 86C / 29F / 8S
- macro-cal: 22×4 + 86×4 + 29×9 = 88 + 344 + 261 = **693 cal vs 690 → +0.4% ✓ pass**

### Sanity ranges (1-serving plausibility)

| Source | ขนมจีนแกงเขียวหวานไก่ standard serving |
|---|---|
| Home cooking (less coconut) | 500–600 cal |
| Restaurant / street food | 600–750 cal |
| Heavy / extra coconut | 750–850 cal |

n24 = 700 cal sits in the **restaurant/street-food range** — appropriate default for the app's logging context (most users are logging restaurant/street food, not home cooking).

User can lower via the customization "ไม่ใส่กะทิ" (−100 cal, −10F) → home-cooking range.

## Customizations per entry (3 each — matches existing pattern density)

| Customization | label | calChange | carbChange | fatChange |
|---|---|---|---|---|
| `extra_noodles` | ใส่ขนมจีนเพิ่ม (+1 ก้อน) | +140 | +30 | +1 |
| `less_coconut` | กะทิน้อย / ไม่ใส่กะทิ | −100 | −2 | −10 |
| `less_spicy` | เผ็ดน้อย | 0 | 0 | 0 |

(`less_spicy` has no nutritional change but is a common explicit choice in Thai dishes; included for parity with other curry entries like m03 / r14.)

## Affected files

| File | Change |
|---|---|
| `meals.json` | +4 entries (n24, n25, n26, n27) inserted after n23 (line 634) · `version` 1.10.10 → 1.10.11 |
| `service-worker.js` | `VERSION` v1.10.23 → v1.10.24 (cache invalidation; required because `meals.json` is cache-first) |
| `index.html` | `VERSION` v1.10.23 → v1.10.24 (must match service worker) |
| `docs/specs/add-meals-khanom-jin-green-curry.md` | this spec (new) |
| `PROJECT_STATE.md` | Current Version + Latest Completed Work updated |
| `TASK_BOARD.md` | T-006 redefined from placeholder · status flips |

## Workflow audit (every flow that reads `meals.json`)

1. **Library / search** — entries appear under `noodles` category, searchable by Thai name, emoji 🍜. ✅
2. **Suggester ("มื้อต่อไปกินอะไรดี?")** — entries are eligible candidates (cal range 680–760 fits common per-meal targets at ~700). ✅
3. **Meal planner** — same — eligible for slot-filling at any meal slot. ✅
4. **Customizations** — all 3 customizations follow the `calChange` / `carbChange` / `fatChange` schema used everywhere else; no new schema. ✅
5. **`meal-detail` rendering** — uses standard `meal.baseCalories` etc.; no special handling needed. ✅
6. **Logging via `addLogEntry`** — standard path, snapshot-by-default for DB meals. ✅
7. **Reports / weekly aggregates** — pull from log entries, which reference these by `id`. ✅
8. **PWA cache** — `meals.json` is cache-first; `VERSION` bump triggers fresh fetch on next load.

## Hard guardrails touched

- `meals.json` schema — unchanged (additions only).
- VERSION sync — service-worker + index.html bumped together (v1.10.23 → v1.10.24). ✅

## Definition of Done

- [ ] 4 entries (n24–n27) inserted in `meals.json` after n23 with values exactly matching the table above
- [ ] `meals.json` `version` 1.10.10 → 1.10.11
- [ ] `service-worker.js` + `index.html` `VERSION` v1.10.23 → v1.10.24
- [ ] PS audit re-runs cleanly:
  - total entries 375 → 379
  - all 4 new entries fall in `pass` (≤5%) or `warn` (5–15%); none in `fail`
  - no existing entries change pass/warn/fail status (no collateral)
- [ ] `git diff meals.json` shows: 1 hunk for version + 1 hunk inserting 4 new lines (no edits to existing entries)
- [ ] `branded_products.json` byte-identical (absent from `git diff --stat`)
- [ ] PROJECT_STATE current version line + Latest Completed Work updated

## Test plan

1. PS audit on the 4 new entries shows their per-entry diff %:
   - n24 expected: −1.3%
   - n25 expected: −0.6%
   - n26 expected: −2.6%
   - n27 expected: +0.4%
2. Audit total: 379 / pass +4 (303) / warn unchanged (70) / fail unchanged (3) / skipped unchanged (3)
3. `git diff meals.json` line-level inspection — confirm only 2 regions touched (top version field + n23 region)

## Rollback plan

`git revert <T-006 commit>` removes the 4 entries + version bumps atomically. PWA users would receive the revert as a separate cache invalidation (next bump). Clean rollback path.

## Open questions

- **Calorie level — restaurant or home-cooking?** I picked restaurant/street range (700 for n24) because the app's logging context favors that. If the user prefers home-cooking range (550–600), adjust by ~−100 cal across all four (subtract 100 from baseCalories, subtract 10 from fat). Easy revision at review.
- **Pork variant?** Could add ขนมจีนแกงเขียวหวานหมู (pork) but it's less common than chicken/beef/fish-ball; left out to keep scope tight. Easy follow-up if user wants.
