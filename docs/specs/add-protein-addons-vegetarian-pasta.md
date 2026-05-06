# T-008 — Add protein add-ons to vegetarian สปาเก็ตตี้ entries

**Status:** approved (user-directed scope · production-data edit · Rule 16 + Rule 17 spirit)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-008 · T-007 (added the 3 vegetarian entries this task enriches) · [`menu-addition-protocol.md`](menu-addition-protocol.md)

> **Note on protocol scope:** This task *edits existing entries* (adds customization rows) rather than *inserts new entries*. The menu-addition protocol's spirit applies (real-user-fit, anchor-based values, no collateral) but the diff-scope expectation is different — multiple hunks across the 3 modified entries instead of 1 insertion hunk. Spec captures the adjusted expectation.

---

## Goal

For the 3 spaghetti entries that have **no meat in the base** (n30 ครีมเห็ด · n33 มาริน่า · n34 เพสโต้), add 3 protein-add-on customizations each, so users who order with meat can log the dish accurately. Per user instruction: *"สปาเกตตี้ที่ไม่มีเนื้อสัตว์ เพิ่ม ADDon สำหรับคนใส่เนื้อสัตว์เข้าไปด้วย เช่น ไก่ย่าง / ไส้กรอก / แซลม่อน เป็นต้น"*.

## Non-goals

- ❌ No new entries (this is customization add only — no n37, n38, etc.)
- ❌ No edits to entries that already have meat (n28/n29/n31/n32/n35/n36 untouched)
- ❌ No `baseCalories` / `baseWeight_g` / `protein_g` / `carbs_g` / `fat_g` / `sugar_g` change on n30/n33/n34 — bases stay byte-identical
- ❌ No customizations beyond protein add-ons (no "extra sauce", "no garlic", etc. in this task)
- ❌ No schema change

## Research summary (per user "ไปหาข้อมูลมาว่าเค้านิยมใส่อะไรกันบ้าง")

Common protein add-ons offered by Thai cafes/Italian restaurants for vegetarian pasta, ranked by popularity:

| Protein | Popularity | Best sauces | Notes |
|---|---|---|---|
| ไก่ย่าง (grilled chicken 80g) | ⭐⭐⭐⭐⭐ | universal | most common; healthy, lean |
| ไก่ทอด/กรอบ (fried chicken) | ⭐⭐⭐⭐ | tomato, cream | comfort food choice |
| แซลม่อน (salmon 80g) | ⭐⭐⭐⭐ premium | cream, pesto | trendy, premium price |
| กุ้ง (shrimp 80g) | ⭐⭐⭐⭐ | tomato (arrabbiata), pesto | popular |
| ไส้กรอก (sausage 60g) | ⭐⭐⭐ casual | tomato, cream | classic Italian-American |
| เบคอน (bacon 30g) | ⭐⭐⭐ | cream-based | best with cream sauces |
| ไข่ดาว (fried egg) | ⭐⭐⭐ Thai | universal | very Thai-cafe |

User-named examples: ไก่ย่าง · ไส้กรอก · แซลม่อน — all in the top 5 popularity.

## Pairing decisions (per dish)

3 add-ons per entry, picked for sauce compatibility:

| Entry | Sauce style | Pick 1 | Pick 2 | Pick 3 | Reasoning |
|---|---|---|---|---|---|
| **n30** ครีมเห็ด | cream | ไก่ย่าง | แซลม่อน | เบคอน | classic cream-pairings; salmon-cream + bacon-cream are restaurant standards |
| **n33** มาริน่า | tomato | ไก่ย่าง | ไส้กรอก | กุ้ง | tomato-versatile; sausage = pasta-tomato classic; shrimp arrabbiata |
| **n34** เพสโต้ | pesto | ไก่ย่าง | แซลม่อน | กุ้ง | pesto-mediterranean pairings; chicken-pesto / salmon-pesto / shrimp-pesto all popular |

**ไก่ย่าง is universal** — appears in all 3 entries (most-ordered protein add-on overall). Bacon stays cream-only (Italian convention). Sausage stays tomato-only (classic combo). Salmon avoids tomato (clashes; salmon prefers cream/pesto). Shrimp avoids cream (rare combo).

## Customization values (per protocol §3a anchor reasoning + §3e real-user fit)

All values derived from realistic ingredient weights and standard nutrition references.

### add_grilled_chicken — เพิ่มไก่ย่าง 80g
```
80g grilled chicken breast (lean, light oil):
  ≈ 145 cal · +25g protein · +5g fat
```
- Anchor: USDA grilled chicken breast ~165 cal/100g, 31P/3.6F → 80g = ~132 cal/25P/3F
- Add ~13 cal for marinade + light oil → 145 cal / 25P / 5F ✓
- Real-user fit: 80g = ~half a chicken breast, standard cafe portion add ✓

### add_salmon — เพิ่มแซลม่อน 80g
```
80g grilled/seared salmon:
  ≈ 165 cal · +18g protein · +10g fat
```
- Anchor: salmon (Atlantic, cooked) ~206 cal/100g, 22P/13F → 80g = ~165 cal/18P/10F ✓
- Real-user fit: 80g = thin filet portion, premium price-point add ✓

### add_bacon — เพิ่มเบคอน 30g
```
30g bacon (≈3 strips, pan-fried):
  ≈ 150 cal · +9g protein · +12g fat
```
- Anchor: cooked bacon ~500 cal/100g, 30P/40F → 30g = ~150 cal/9P/12F ✓
- Real-user fit: 30g (~3 strips) = standard cream-pasta bacon add ✓

### add_sausage — เพิ่มไส้กรอก 60g
```
60g pork sausage (≈2 cocktail-size or 1 large):
  ≈ 180 cal · +9g protein · +2g carbs · +15g fat
```
- Anchor: typical pork sausage ~300 cal/100g, 15P/3C/25F → 60g = ~180 cal/9P/2C/15F ✓
- Real-user fit: 60g = 2 cocktail sausages or 1 hot-dog-style, common Thai cafe portion ✓

### add_shrimp — เพิ่มกุ้ง 80g
```
80g shrimp (peeled, lightly cooked):
  ≈ 85 cal · +18g protein · +1g fat
```
- Anchor: cooked shrimp ~99 cal/100g, 24P/0.3F → 80g = ~80 cal/19P/0.2F ✓
- Bumped slightly to 85 cal / 18P / 1F to account for cooking oil absorbed ✓
- Real-user fit: 80g = 5-7 medium shrimp, standard add ✓

## Real-user fit check (per protocol §3e)

| Check | n30 cream | n33 tomato | n34 pesto |
|---|---|---|---|
| Add-ons match real ordering patterns? | ✅ chicken/salmon/bacon are top-3 cream pairings | ✅ chicken/sausage/shrimp are top-3 tomato pairings | ✅ chicken/salmon/shrimp are top-3 pesto pairings |
| Portion sizes realistic? | ✅ 80g chicken/salmon, 30g bacon = standard | ✅ 80g chicken/shrimp, 60g sausage = standard | ✅ 80g chicken/salmon/shrimp = standard |
| Calorie deltas realistic? | ✅ +145 to +165 (chicken to salmon) | ✅ +85 to +180 (shrimp to sausage) | ✅ +85 to +165 (shrimp to salmon) |
| Customization labels readable? | ✅ Thai with portion size in label | ✅ same | ✅ same |
| UI density acceptable? | 3 existing + 3 new = 6 total — still scannable | same | same |

## Affected files

| File | Change |
|---|---|
| `meals.json` | n30/n33/n34 customization arrays each get +3 protein add-ons; `version` 1.10.12 → 1.10.13 |
| `service-worker.js` | `VERSION` v1.10.25 → v1.10.26 |
| `index.html` | `VERSION` v1.10.25 → v1.10.26 |
| `docs/specs/add-protein-addons-vegetarian-pasta.md` | this spec (new) |
| `PROJECT_STATE.md` | Current Version + Latest Completed Work |
| `TASK_BOARD.md` | T-008 row + transitions |

## Hard guardrails touched

- `meals.json` schema — unchanged; uses existing `customizations` array + `calChange`/`proteinChange`/`carbChange`/`fatChange` fields
- VERSION sync — 3-place bump per protocol
- Customization IDs — `add_grilled_chicken`, `add_salmon`, `add_bacon`, `add_sausage`, `add_shrimp` — new but follow `<verb>_<noun>` convention used elsewhere

## Workflow audit

1. **`meal-detail` rendering** — iterates `meal.customizations`; new add-ons render as standard checkboxes/togglebles ✅
2. **`addLogEntry`** — passes `customizations: [ids]`; new IDs are just strings, no special handling needed ✅
3. **`calcEntryTotals`** — applies each customization's deltas to base; new IDs are deltas, work with existing logic ✅
4. **Reports / suggester** — read `baseCalories` (unchanged); customization deltas apply at log time, not at suggest time ✅
5. **Library / search** — entries appear by base name; customizations don't affect search ✅
6. **PWA cache** — VERSION bump triggers fresh `meals.json` fetch ✅

## Definition of Done

- [ ] n30 customizations array has 6 items (3 existing + 3 new: chicken/salmon/bacon)
- [ ] n33 customizations array has 6 items (3 existing + 3 new: chicken/sausage/shrimp)
- [ ] n34 customizations array has 6 items (3 existing + 3 new: chicken/salmon/shrimp)
- [ ] n30/n33/n34 base values (cal, weight, P, C, F, sugar) byte-identical (only customizations array touched)
- [ ] All 6 other entries (n28/n29/n31/n32/n35/n36) byte-identical
- [ ] `meals.json` `version` 1.10.12 → 1.10.13
- [ ] `service-worker.js` + `index.html` `VERSION` v1.10.25 → v1.10.26
- [ ] PS audit: total still 388, pass/warn/fail unchanged from prior baseline (312/70/3) — bases not touched
- [ ] `git diff meals.json` hunks: top version + 3 entry-modification hunks (one per modified entry) = 4 hunks total
- [ ] `branded_products.json` + `tools/audit-meals.js` byte-identical (hashes unchanged)
- [ ] PROJECT_STATE updated

## Test plan

1. PS audit confirms total=388, pass=312, warn=70, fail=3 (unchanged — bases didn't move)
2. `git diff meals.json` line inspection: verify the 3 modified entries' base-line values are byte-identical, only customizations grew
3. Customization values match spec table

## Rollback plan

`git revert <T-008 commit>` removes the 9 new customization rows + version bumps atomically. Bases never moved, so revert is clean.

## Open questions

- **More vegetarian entries elsewhere?** ลาบ-style salads, plain ก๋วยเตี๋ยว, etc. could also benefit from protein add-ons. Out of scope — this task is sister-tied to T-007. Could be T-009 if user wants.
- **More protein options per entry?** Could add ไก่ทอด, ไข่ดาว as 4th/5th add-on. Held to 3 per entry to keep UI density reasonable; easy to extend if user requests.
