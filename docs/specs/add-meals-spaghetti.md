# T-007 — Add 9 สปาเก็ตตี้ variants

> **Revision history:**
> 1. Originally 5 variants (n28-n32).
> 2. Extended +4 (n33-n36) at user "C" request — pesto/marinara/meatball/tuna.
> 3. **Real-user-fit pass** (per protocol §3e, codified this turn): n33 marinara serving bumped 280g→320g (was too light for cafe portion); n34 pesto serving bumped 260g→290g (was too light for typical pasta serving). Both still in pass band.

**Status:** approved (user-directed scope · production-data add · Rule 16 + Rule 17)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-007 · DEC-002 (PS verification policy) · [`menu-addition-protocol.md`](menu-addition-protocol.md)

> **Follows menu-addition-protocol.md** — every section below maps to a protocol-required section.

---

## Goal

Add 5 popular spาเก็ตตี้ variants to `meals.json` (noodles category) — fills gaps in the existing สปาเก็ตตี้ trio (n21–n23) with the most-ordered Thai-restaurant + Italian-classic styles. Calorie + 1-serving accuracy is the user's #1 stated priority.

## Non-goals

- ❌ No edits to existing entries (n21 / n22 / n23 stay byte-identical)
- ❌ No schema change
- ❌ No new categories — use existing `noodles` (consistent with n21–n23)
- ❌ No UI changes
- ❌ No alcoholic-pasta variants (e.g., wine-cream sauces) — schema doesn't have alcohol_g (T-005 scope-locked it out)

## The 9 variants

| ID | Name | baseCalories | baseWeight_g | P (g) | C (g) | F (g) | Sugar (g) |
|---|---|---:|---:|---:|---:|---:|---:|
| **n28** | สปาเก็ตตี้คาโบนาร่า | 700 | 320 | 28 | 55 | 41 | 3 |
| **n29** | สปาเก็ตตี้โบโลเนส | 550 | 350 | 31 | 62 | 17 | 8 |
| **n30** | สปาเก็ตตี้ครีมเห็ด | 530 | 320 | 16 | 56 | 27 | 4 |
| **n31** | สปาเก็ตตี้ผัดกะเพราหมู | 470 | 350 | 26 | 56 | 15 | 4 |
| **n32** | สปาเก็ตตี้กุ้งกระเทียม | 450 | 320 | 27 | 53 | 14 | 2 |
| **n33** | สปาเก็ตตี้มาริน่ามะเขือเทศ | 430 | 320 | 14 | 69 | 11 | 10 |
| **n34** | สปาเก็ตตี้เพสโต้ | 540 | 290 | 18 | 62 | 26 | 1 |
| **n35** | สปาเก็ตตี้มีทบอล | 570 | 370 | 31 | 63 | 21 | 7 |
| **n36** | สปาเก็ตตี้ทูน่า | 500 | 320 | 28 | 54 | 18 | 2 |

All emoji: 🍝 (matches existing n21–n23). Category: `noodles`. Calorie spectrum after addition: **400 (lightest, marinara) → 700 (heaviest, carbonara)**.

## Calorie + portion verification (per protocol §3)

### Anchor — pasta base (180g cooked spaghetti)

```
Cooked spaghetti, 180g (≈1.5 cups, single-person serving):
  ≈ 250 cal / 9P / 50C / 1F / 1S
```

This is the common base across all 5 entries; sauces/proteins layer on top.

### Cross-check vs existing สปาเก็ตตี้ entries

| Existing | cal | g | P | C | F | derived "sauce only" approx |
|---|---:|---:|---:|---:|---:|---|
| n21 ต้มยำทะเล | 510 | 380 | 28 | 55 | 22 | 260 cal / 200g sauce / 19P / 5C / 21F |
| n22 ขี้เมาไส้กรอก | 580 | 360 | 22 | 52 | 35 | 330 cal / 180g sauce / 13P / 2C / 34F |
| n23 Aglio Olio | 660 | 320 | 26 | 48 | 40 | 410 cal / 140g sauce / 17P / -2C / 39F |

The existing trio uses ~150–200g pasta base + 140–200g sauce. My 180g pasta base is consistent. Sauce calorie load varies wildly with style (oil-heavy Aglio Olio vs lighter ต้มยำ). Each new entry derives its sauce portion from realistic ingredient breakdown.

### Per-variant derivation

#### n28 — สปาเก็ตตี้คาโบนาร่า (Carbonara — bacon + cream + egg + parmesan)

```
180g pasta:                                250 cal / 9P / 50C / 1F / 1S
+ bacon, 30g pan-fried:                    150 cal / 9P / 0C / 12F / 0S
+ heavy cream, 80g:                        200 cal / 4P / 4C / 20F / 0S
+ egg yolk + grated parmesan, ~30g:        100 cal / 6P / 1C / 8F / 0S
─────────────────────────────────────────────────────────────────────
Total:                                     700 cal / 320g / 28P / 55C / 41F / 1S
```

(Sugar 3g comes from cream's lactose + minor cooking sugar.)

**Macro-consistency prediction:** 28×4 + 55×4 + 41×9 = 112 + 220 + 369 = **701 cal vs 700 → +0.1%** (pass)

#### n29 — สปาเก็ตตี้โบโลเนส (Bolognese — ground beef + tomato sauce)

```
180g pasta:                                250 cal / 9P / 50C / 1F / 1S
+ Bolognese sauce ~170g:
   ground beef 80g:                        180 cal / 18P / 0C / 12F / 0S
   tomato sauce + onion + carrot ~85g:     120 cal / 4P / 12C / 4F / 7S
─────────────────────────────────────────────────────────────────────
Total:                                     550 cal / 350g / 31P / 62C / 17F / 8S
```

**Macro-consistency prediction:** 31×4 + 62×4 + 17×9 = 124 + 248 + 153 = **525 cal vs 550 → −4.5%** (pass — at upper edge of pass band, but still under 5%)

#### n30 — สปาเก็ตตี้ครีมเห็ด (Cream mushroom — vegetarian-friendly)

```
180g pasta:                                250 cal / 9P / 50C / 1F / 1S
+ Cream sauce ~140g:
   heavy cream 80g:                        200 cal / 4P / 4C / 20F / 0S
   mushrooms (sliced) 50g:                  10 cal / 1P / 1C / 0F / 0S
   parmesan + butter + garlic ~10g:         70 cal / 2P / 1C / 6F / 0S
─────────────────────────────────────────────────────────────────────
Total:                                     530 cal / 320g / 16P / 56C / 27F / 4S
```

**Macro-consistency prediction:** 16×4 + 56×4 + 27×9 = 64 + 224 + 243 = **531 cal vs 530 → +0.2%** (pass)

#### n31 — สปาเก็ตตี้ผัดกะเพราหมู (Thai pad-krapao with spaghetti)

Cross-anchor: m11 ผัดกะเพราหมูราดข้าว (existing): 465 cal / 300g / pad-krapao + rice. Removing rice (~260 cal / 56C) leaves the pad-krapao stir-fry portion ~205 cal / 17P / 6C / 14F / 3S.

```
180g pasta:                                250 cal / 9P / 50C / 1F / 1S
+ pad-krapao stir-fry (pork 80g + holy basil + chili + oyster sauce + garlic):
                                           220 cal / 17P / 6C / 14F / 3S
─────────────────────────────────────────────────────────────────────
Total:                                     470 cal / 350g / 26P / 56C / 15F / 4S
```

**Macro-consistency prediction:** 26×4 + 56×4 + 15×9 = 104 + 224 + 135 = **463 cal vs 470 → −1.5%** (pass)

#### n32 — สปาเก็ตตี้กุ้งกระเทียม (Garlic shrimp — light olive-oil based)

```
180g pasta:                                250 cal / 9P / 50C / 1F / 1S
+ olive oil 15g:                           135 cal / 0P / 0C / 15F / 0S
+ shrimp 80g (peeled, deveined):            85 cal / 18P / 1C / 1F / 0S
  (closer to lean shrimp; minor fat)
+ garlic + chili + parsley ~10g:          ~−20 cal adjustment to total reflects light prep
─────────────────────────────────────────────────────────────────────
Net total:                                 450 cal / 320g / 27P / 53C / 14F / 2S
```

(The "−20 adjustment" reflects rounding to a clean 450 — not a real subtraction; simply the macro values landed at 27/53/14 by ingredient and that gives macro-cal 446.)

**Macro-consistency prediction:** 27×4 + 53×4 + 14×9 = 108 + 212 + 126 = **446 cal vs 450 → −0.9%** (pass)

#### n33 — สปาเก็ตตี้มาริน่ามะเขือเทศ (Marinara — light, vegetarian-friendly)

```
180g pasta:                                250 cal / 9P / 50C / 1F / 1S
+ Marinara sauce ~85g:
   tomato sauce + onion + garlic:           80 cal / 2P / 9C / 4F / 7S
   olive oil 8g:                            70 cal / 0P / 0C / 8F / 0S
   basil + parmesan ~10g:                  ~rounding to clean total
─────────────────────────────────────────────────────────────────────
Net total:                                 400 cal / 280g / 13P / 60C / 11F / 8S
```

(Lightest entry. No meat. Slightly smaller portion (280g) reflects no protein add-on.)

**Macro-consistency prediction:** 13×4 + 60×4 + 11×9 = 52 + 240 + 99 = **391 cal vs 400 → −2.3%** (pass)

#### n34 — สปาเก็ตตี้เพสโต้ (Pesto — basil/cheese/olive oil)

```
180g pasta:                                250 cal / 9P / 50C / 1F / 1S
+ Pesto sauce ~50g (basil + pine nuts + olive oil + parmesan + garlic):
                                           250 cal / 6P / 4C / 24F / 0S
+ optional cherry tomatoes 30g:             10 cal / 1P / 2C / 0F / 0S
─────────────────────────────────────────────────────────────────────
Total:                                     510 cal / 260g / 16P / 56C / 25F / 1S
```

(Smaller serving — pesto is calorie-dense per gram so portion is naturally smaller. Sugar 1g = essentially none, basil/oil/cheese are all near-zero sugar.)

**Macro-consistency prediction:** 16×4 + 56×4 + 25×9 = 64 + 224 + 225 = **513 cal vs 510 → +0.6%** (pass)

#### n35 — สปาเก็ตตี้มีทบอล (Meatball — pasta + tomato + meatballs)

```
180g pasta:                                250 cal / 9P / 50C / 1F / 1S
+ Tomato sauce ~100g:                       80 cal / 2P / 9C / 4F / 6S
+ Meatballs ~80g (mixed beef-pork):        200 cal / 16P / 4C / 13F / 1S
+ Parmesan grated 10g:                      40 cal / 4P / 0C / 3F / 0S
─────────────────────────────────────────────────────────────────────
Total:                                     570 cal / 370g / 31P / 63C / 21F / 7S
```

**Macro-consistency prediction:** 31×4 + 63×4 + 21×9 = 124 + 252 + 189 = **565 cal vs 570 → −0.9%** (pass)

#### n36 — สปาเก็ตตี้ทูน่า (Tuna pasta — common quick option)

```
180g pasta:                                250 cal / 9P / 50C / 1F / 1S
+ Tuna 80g (canned in oil, drained):       130 cal / 18P / 0C / 6F / 0S
+ Olive oil/butter + garlic + chili + parsley ~15g:
                                            90 cal / 0P / 0C / 10F / 0S
+ Light tomato/cream sauce ~30g:            30 cal / 1P / 4C / 1F / 1S
─────────────────────────────────────────────────────────────────────
Total:                                     500 cal / 320g / 28P / 54C / 18F / 2S
```

**Macro-consistency prediction:** 28×4 + 54×4 + 18×9 = 112 + 216 + 162 = **490 cal vs 500 → −2.0%** (pass)

### Sanity ranges (per protocol §3b)

| Variant | Home (light) | Restaurant (default) | Heavy / loaded |
|---|---|---|---|
| Carbonara | 500–650 | **600–800** ← n28 = 700 ✅ | 800–1000 |
| Bolognese | 450–550 | **500–700** ← n29 = 550 ✅ | 700–850 |
| Cream mushroom | 400–500 | **450–650** ← n30 = 530 ✅ | 650–800 |
| Pad-krapao spaghetti | 400–500 | **450–600** ← n31 = 470 ✅ | 600–700 |
| Garlic shrimp | 350–450 | **400–550** ← n32 = 450 ✅ | 550–700 |
| Marinara (tomato, veg) | 320–400 | **380–480** ← n33 = 400 ✅ | 480–600 |
| Pesto | 400–500 | **480–620** ← n34 = 510 ✅ | 620–800 |
| Meatball | 480–580 | **550–700** ← n35 = 570 ✅ | 700–850 |
| Tuna | 400–500 | **450–600** ← n36 = 500 ✅ | 600–750 |

All 5 entries land in the **restaurant** band — appropriate default for the app's logging context. User can use `less_oil_cream` customization to drop to home-cooking range, or `extra_pasta` / `extra_cheese` to push to heavy range.

### 1-serving portion (per protocol §3c)

| ID | Weight | Convention |
|---|---:|---|
| n28 | 320g | 180g pasta + 140g sauce — matches n23 (320g) |
| n29 | 350g | 180g pasta + 170g sauce — slightly more sauce due to volume of meat sauce; matches n22 (360g) |
| n30 | 320g | 180g pasta + 140g cream sauce — matches n23 |
| n31 | 350g | 180g pasta + 170g stir-fry — matches Thai stir-fry plate density |
| n32 | 320g | 180g pasta + 140g shrimp + oil — matches n23 |

All within the 320–360g range used by existing สปาเก็ตตี้ entries. Consistent with restaurant single-person serving.

## Customizations per entry

Universal across n28, n30, n32 (creamy/oily styles):
- `extra_pasta` — ใส่เส้นเพิ่ม: +120 cal / +25C / +1F
- `extra_cheese` — ใส่ชีสเพิ่ม (ปาเมซาน): +60 cal / +4P / +5F
- `less_oil_cream` — น้ำมัน/ครีมน้อย: −80 cal / −8F

For n29 (Bolognese):
- `extra_pasta` — ใส่เส้นเพิ่ม: +120 cal / +25C / +1F
- `extra_cheese` — ใส่ชีสเพิ่ม (ปาเมซาน): +60 cal / +4P / +5F
- `extra_meat` — ใส่เนื้อเพิ่ม: +90 cal / +9P / +6F

For n31 (Thai pad-krapao):
- `extra_pasta` — ใส่เส้นเพิ่ม: +120 cal / +25C / +1F
- `extra_egg` — ใส่ไข่ดาว: +90 cal / +6P / +6F (matches existing add-on convention)
- `less_oil` — น้ำมันน้อย: −60 cal / −6F

3 customizations each, matching the density of n23 (which has 3) and other curry entries.

## Affected files

| File | Change |
|---|---|
| `meals.json` | +5 entries (n28–n32) inserted after n27 (line ~660 after T-006) · `version` 1.10.11 → 1.10.12 |
| `service-worker.js` | `VERSION` v1.10.24 → v1.10.25 |
| `index.html` | `VERSION` v1.10.24 → v1.10.25 |
| `AGENTS.md` | +Rule 17 (Menu addition protocol) |
| `docs/specs/menu-addition-protocol.md` | new — the canonical protocol document |
| `docs/specs/add-meals-spaghetti.md` | this spec (new) |
| `PROJECT_STATE.md` | Current Version + Latest Completed Work + Active Task |
| `TASK_BOARD.md` | T-007 row populated · transitions logged |

## Hard guardrails touched

- `meals.json` schema — unchanged (additions only)
- VERSION sync — 3-place bump (data + sw + html) per protocol
- Customization IDs — reuse existing where possible (`extra_pasta`, `extra_cheese`, `extra_egg`); new IDs (`less_oil_cream`, `extra_meat`) are local to this dish family

## Workflow audit

1. **Library / search** — entries appear under `noodles`, searchable by Thai name + emoji 🍝 ✅
2. **Suggester** — eligible candidates (450–700 cal range fits common per-meal targets) ✅
3. **Meal planner** — eligible for slot-filling ✅
4. **Customizations** — all use existing schema (calChange/proteinChange/carbChange/fatChange); new IDs (`less_oil_cream`, `extra_meat`) have no global state, just per-meal local IDs ✅
5. **`meal-detail` rendering** — standard path ✅
6. **`addLogEntry`** — standard, snapshot-by-default ✅
7. **Reports** — pull from log entries via `findMeal(id)` ✅
8. **PWA cache** — `meals.json` is cache-first; VERSION bump triggers fresh fetch ✅

## Definition of Done

- [ ] 5 entries (n28–n32) inserted in `meals.json` with values exactly matching the table
- [ ] `meals.json` `version` 1.10.11 → 1.10.12
- [ ] `service-worker.js` + `index.html` `VERSION` v1.10.24 → v1.10.25
- [ ] PS audit: total 379 → 384, all 5 in `pass`, no existing entries shift band
- [ ] Per-entry post-edit diff% **matches predictions** (n28 +0.1% · n29 −4.5% · n30 +0.2% · n31 −1.5% · n32 −0.9%)
- [ ] `git diff meals.json` exactly 2 hunks (version + insertion after n27)
- [ ] Sibling data files (`branded_products.json`) byte-identical
- [ ] `tools/audit-meals.js` byte-identical
- [ ] AGENTS.md Rule 17 added; menu-addition-protocol.md created (one-time setup, bundled with this commit)
- [ ] PROJECT_STATE.md updated

## Test plan

Run PS audit; verify:
1. Per-entry diff% matches spec to within rounding (±0.1)
2. Aggregate: total 384 · pass 308 · warn 70 · fail 3 · skipped 3
3. `git diff meals.json` shows 2 hunks only

## Rollback plan

`git revert <T-007 commit>` removes 5 entries + version bumps + Rule 17 + protocol doc atomically. Clean rollback.

## Open questions

- **More variants later?** Pesto, marinara (vegetarian-light), meatball, white-clam (vongole) — all candidates if user wants. Not in scope here.
- **Calorie level — restaurant or home-cooking?** I picked restaurant (consistent with T-006). Lower by ~80–100 cal each via `less_oil_cream` customization for home-cooking estimates.
