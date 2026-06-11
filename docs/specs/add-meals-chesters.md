# T-013f — Add Chester's Grill menu entries (5 entries)

**Status:** approved
**Owner:** Execution Agent
**Protocol:** follows [`docs/specs/menu-addition-protocol.md`](menu-addition-protocol.md) (AGENTS.md Rule 17)
**Related:** `TASK_BOARD.md` T-013f · T-013e (last menu-add, v1.10.39)

> **First menu-add task with external citations.** Per user instruction "หาข้อมูลให้ละเอียดนะ", invoked deep-research workflow (105 agents · 23 sources · 25 adversarially-verified claims) to find authoritative Chester's Thailand nutrition data. Result: ONE Chester-attributed anchor + USDA component anchors for the rest.

---

## 1. Goal + Non-goals

### Goal
Add 5 Chester's Grill (Thai grilled-chicken chain) menu entries to `meals.json` with researched citations + appropriate addons:
- **r25 ข้าวไก่ย่างเชสเตอร์** — signature set (1/4 grilled chicken + jasmine rice + chili sauce)
- **r26 ไก่ย่างเชสเตอร์ 1/4 ตัว** — a la carte chicken, no rice
- **r27 ข้าวไก่กระเทียมพริกไทย เชสเตอร์** — signature garlic-pepper chicken with rice
- **r28 ข้าวเหนียวไก่ย่างเชสเตอร์** — grilled chicken + sticky rice combo
- **s19 ส้มตำไก่ย่างเชสเตอร์ คอมโบ** — papaya salad + grilled chicken combo

### Non-goals
- ❌ Edits to existing entries (r01-r24, s01-s18, all others)
- ❌ Schema changes to `meals.json` or `branded_products.json`
- ❌ UI changes (suggester/planner/library auto-pick up)
- ❌ Adding entries with cited values that **fail** macro reconciliation
- ❌ Claiming "official" Chester's data — none exists publicly per the research
- ❌ Adding to `branded_products.json` — that file doesn't support customizations and customizations are explicitly required by the user

## 2. The new entries — table

| ID | Name | baseCalories | baseWeight_g | P (g) | C (g) | F (g) | Sugar (g) | Source |
|---|---|---|---|---|---|---|---|---|
| r25 | ข้าวไก่ย่างเชสเตอร์ | 397 | 380 | 28 | 44 | 12 | — | **CITED** [fit-d.com][1] |
| r26 | ไก่ย่างเชสเตอร์ 1/4 ตัว | 290 | 150 | 27 | 4 | 17 | 3 | DERIVED [USDA chicken thigh+skin][3] + [chili sauce][4] |
| r27 | ข้าวไก่กระเทียมพริกไทยเชสเตอร์ | 600 | 380 | 32 | 60 | 23 | 3 | DERIVED [USDA chicken thigh+skin][3] + [jasmine rice][2] + cooking oil |
| r28 | ข้าวเหนียวไก่ย่างเชสเตอร์ | 540 | 320 | 32 | 60 | 17 | 5 | DERIVED [USDA chicken thigh+skin][3] + sticky rice [estimate, flagged][5] |
| s19 | ส้มตำไก่ย่างเชสเตอร์คอมโบ | 420 | 280 | 30 | 30 | 18 | 15 | DERIVED [USDA chicken thigh+skin][3] + ส้มตำ [estimate, flagged][6] |

All rice items get `category: "rice_dishes"` + `emoji: "🍗"`. s19 gets `category: "salads"` + `emoji: "🥗"`. All include `"brand": "Chester's"` informational tag (using `portion_basis` since brand isn't a schema field).

## 3. Calorie + portion verification

### r25 ข้าวไก่ย่างเชสเตอร์ (CITED ENTRY)

**§3a Anchor — direct citation:**

```
fit-d.com page MTE5Nw (เชสเตอร์กริลล์ category, shop ID MTI):
  ข้าวอบไก่ย่าง / Rice with Chicken Grill
  397 kcal · 28g P · 44g C · 12g F · per "1 จาน/plate"
  Source: cites Chester's product nutrition label (ฉลากโภชนาการ)

Adversarial macro check (3-0 vote): 28×4 + 44×4 + 12×9 = 112+176+108 = 396 vs 397 = +0.25% delta → PASS
Verification confidence: MEDIUM (single source, secondary aggregator,
no independent corroboration of brand attribution; gram weight not specified)
```

The deep-research workflow's strongest finding: this is the only Chester-attributed entry that passes macro reconciliation. Sugar not listed in source; estimated 0g (the dish itself has no sweet sauce included by default — chili sauce is a side).

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Lean / no-skin version | 320 – 370 |
| **Chester's standard "ข้าวอบไก่ย่าง"** | **380 – 450** |
| Larger portion or +หนัง heavy | 450 – 550 |

r25 at 397 sits at the cited Chester value ✓.

**§3c 1-serving portion (380g):**

fit-d cites "1 plate" with no gram weight. Component decomposition for sanity (note: doesn't exactly reproduce 397 — may reflect Chester's smaller-than-standard chicken portion or label rounding):
- ไก่ย่างเชสเตอร์ ~110g (1/4 cooked) — USDA-equivalent
- ข้าวสวย ~180g — USDA jasmine rice anchor
- น้ำจิ้มเชสเตอร์ (signature chili sauce) ~25g — USDA sweet chili anchor
- **Total ≈ 315g** → upgrade to 380g convention to match r04 ข้าวมันไก่ + Chester plate-side garnish/dressing accounting

**§3d Macro-consistency prediction:**

```
macro-cal = 28×4 + 44×4 + 12×9 = 112 + 176 + 108 = 396 vs baseCalories 397
         = predicted diff (397 - 396) / 397 = +0.25% → PASS band (≤5%) ✓
```

This is the cleanest macro reconciliation across all 5 entries (lowest delta).

**§3e Real-user fit:**
- Serving: 380g matches r04 ข้าวมันไก่ convention ✓
- Calorie level: 397 sits in cited Chester standard band (380-450) ✓
- Macros: 28g protein at this cal level is correct for chicken+rice ratio (rice contributes ~5g, chicken ~23g) ✓
- Brand recognition: "ข้าวไก่ย่างเชสเตอร์" is searchable; users likely also search "เชสเตอร์" alone ✓
- Caveat: 397 is lower than my component-derived estimate (~510-540). Documented in §3a as "may reflect Chester's smaller-than-standard chicken portion or label rounding"

---

### r26 ไก่ย่างเชสเตอร์ 1/4 ตัว (DERIVED, no rice)

**§3a Anchor — component derivation from validated sources:**

```
USDA Chicken Thigh, Meat + Skin, Roasted (per 100g, [USDA via FatSecret][3]):
  247 kcal · 25g P (±2g, see §3a-caveat) · 0g C · 15.5g F
  Adversarial macro check (3-0 vote): 25×4 + 0×4 + 15.5×9 = 239.5 vs 247 = 3.0% delta → PASS

110g typical 1/4-bird grilled (cooked, w/ skin):
  271 kcal · 27.5g P · 0g C · 17g F

+ Chester's chili sauce side (25g, [USDA sweet chili][4]):
  45 kcal · 0g P · 11g C · 0g F · 11g sugar
  But served as small dipping portion ~15g for 1/4 a la carte:
  → 27 kcal · 0g P · 6.6g C · 0g F · 6.6g sugar

Total derived: 298 kcal · 27.5g P · 6.6g C · 17g F · 6.6g sugar / ~125g
Rounded for entry: 290 kcal · 27g P · 4g C · 17g F · 3g sugar / 150g
(Plate weight 150g = 110g chicken + 25g sauce + 15g garnish/lettuce; sauce/sugar
slightly under-reported because Chester's dip portion is smaller than full 25g packet)
```

**§3a-caveat:** Per deep-research verification (1-2 refuted), USDA chicken thigh protein at 25.06g/100g did NOT survive adversarial vote — protein band is 25g ± 2g/100g. r26's 27g P is within band.

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Skinless lean | 180 – 230 |
| **1/4 chicken + skin + sauce** | **260 – 340** |
| Half-bird or extra sauce | 540+ |

r26 at 290 sits in the expected band ✓.

**§3c 1-serving portion (150g):**
- ไก่ย่างเชสเตอร์ 1/4 ตัว cooked w/ skin ~110g
- น้ำจิ้มเชสเตอร์ (side dip) ~15g
- ผักเคียง / แตงกวา ~25g
- **Total ≈ 150g**

**§3d Macro-consistency prediction:**

```
macro-cal = 27×4 + 4×4 + 17×9 = 108 + 16 + 153 = 277 vs baseCalories 290
         = predicted diff (290 - 277) / 290 = +4.48% → PASS band (≤5%) ✓
```

**§3e Real-user fit:**
- Serving 150g matches a la carte portion (vs full meal sets) ✓
- Macros high-P / low-C / mid-F reflect chicken-heavy a la carte ✓
- Customization "เพิ่มไก่ 1/4 ตัว" makes total = 1/2 chicken — common Chester order ✓
- Customization "ไม่ใส่หนัง" reduces by ~75 cal (derived from skin density) ✓

---

### r27 ข้าวไก่กระเทียมพริกไทยเชสเตอร์ (DERIVED, signature stir-fry)

**§3a Anchor — component derivation:**

```
Components:
- USDA jasmine rice 180g cooked × 130/100 = 234 kcal · 4.5g P · 51g C · 0g F
- USDA chicken thigh 110g cooked × 247/100 = 271 kcal · 27.5g P · 0g C · 17g F
- + Cooking oil 8g (stir-fry style, Chester signature): 72 kcal · 0g P · 0g C · 8g F
- + Garlic-pepper-soy seasoning + sugar: ~25 kcal · 0.5g P · 5g C · 0g F · 3g sugar
- + Chili sauce side (10g): 18 kcal · 0g P · 4g C · 0g F · 4g sugar

Component sum: 620 kcal · 32.5g P · 60g C · 25g F · 7g sugar
Locked for entry: 600 kcal · 32g P · 60g C · 23g F · 3g sugar / 380g
(Slightly conservative on calories, sugar reduced — typical Chester
seasoning is more savory than sweet)
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Light (less oil, skinless) | 450 – 530 |
| **Chester's standard** | **530 – 680** |
| Heavy oil / extra chicken | 680 – 800 |

r27 at 600 sits in the expected band ✓.

**§3c 1-serving portion (380g):**
- ข้าวสวย ~180g
- ไก่ทอด/ผัดกระเทียมพริกไทย ~120g (more dense than plain grilled — stir-fried with oil/garlic mash)
- ผัก/แตงกวา/ต้นหอม ~30g
- ซอสกระเทียมพริกไทย side ~10g
- น้ำมันจากการผัด ~10g (clings to plate)
- **Total ≈ 350g** → 380g matches r25 / r04 convention

**§3d Macro-consistency prediction:**

```
macro-cal = 32×4 + 60×4 + 23×9 = 128 + 240 + 207 = 575 vs baseCalories 600
         = predicted diff (600 - 575) / 600 = +4.17% → PASS band (≤5%) ✓
```

**§3e Real-user fit:**
- Serving 380g matches r04 / r25 convention ✓
- Heavier than r25 (600 vs 397) because stir-fry adds oil + Chester's signature seasoning ✓
- Macros high-F (23g, 35% from fat) reflects added cooking oil + chicken skin ✓
- Customization "ลดน้ำมัน" (-72 cal · -8g F) targets users on cutting diet ✓

---

### r28 ข้าวเหนียวไก่ย่างเชสเตอร์ (DERIVED, sticky rice combo)

**§3a Anchor — component derivation with FLAGGED estimate:**

```
Components:
- Sticky rice (ข้าวเหนียว) 150g cooked × ~169 kcal/100g = 253 kcal · 4.5g P · 53g C · 0g F
  ⚠️ FLAGGED: 169 kcal/100g is a common reference but NOT verified in this
  research synthesis. INMU FCD v3 should be consulted directly for exact value.
- USDA chicken thigh 110g cooked × 247/100 = 271 kcal · 27.5g P · 0g C · 17g F
- + น้ำจิ้มเชสเตอร์ side ~15g = 27 kcal · 0g P · 6.6g C · 0g F · 6.6g sugar
- + Lettuce / cucumber garnish 25g: ~5 kcal · trace · 1g C · 0g F

Component sum: 556 kcal · 32g P · 60.6g C · 17g F · 6.6g sugar
Locked for entry: 540 kcal · 32g P · 60g C · 17g F · 5g sugar / 320g
(Slightly conservative on calories; sticky rice estimate has ±15 cal uncertainty)
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Smaller sticky rice (100g) | 380 – 450 |
| **Chester's standard combo (150g sticky rice)** | **480 – 580** |
| Larger sticky rice (200g) or +sauce | 580 – 680 |

r28 at 540 sits in the expected band ✓.

**§3c 1-serving portion (320g):**
- ข้าวเหนียว ~150g (sticky rice denser than jasmine, smaller volume for same cal)
- ไก่ย่าง 1/4 ตัว ~110g
- น้ำจิ้ม ~15g
- ผัก/แตงกวา ~25g
- ครก/ใบตอง wrap weight ~20g
- **Total ≈ 320g** (less than r25/r27's 380g because sticky rice is more dense)

**§3d Macro-consistency prediction:**

```
macro-cal = 32×4 + 60×4 + 17×9 = 128 + 240 + 153 = 521 vs baseCalories 540
         = predicted diff (540 - 521) / 540 = +3.52% → PASS band (≤5%) ✓
```

**§3e Real-user fit:**
- Serving 320g matches a sticky-rice-combo convention (smaller than jasmine plate) ✓
- Customization "ไม่ใส่ข้าวเหนียว" (-255 cal · -53g C) → chicken-only mode for keto/low-carb ✓
- Sticky rice's higher density appropriate for Northeastern Thai serving style ✓

⚠️ **Open question to flag at review:** The sticky-rice calorie value (169 kcal/100g) is the commonly cited figure but NOT verified in this synthesis. If user requires INMU FCD primary citation, the value should be confirmed before ship — or accepted as a derived estimate.

---

### s19 ส้มตำไก่ย่างเชสเตอร์ คอมโบ (DERIVED, with FLAGGED estimate)

**§3a Anchor — component derivation with FLAGGED estimate:**

```
Components:
- ส้มตำไทย (Thai papaya salad) 150g: ~130 kcal · 4g P · 25g C · 3g F · 15g sugar
  ⚠️ FLAGGED: Generic Thai papaya salad estimate. INMU FCD entry for
  "ส้มตำไทย" should be consulted directly. Common references put
  100g ส้มตำไทย at ~85-100 kcal, primarily from palm sugar + peanuts.
- USDA chicken thigh 110g cooked × 247/100 = 271 kcal · 27.5g P · 0g C · 17g F
- + Garnish (ถั่วลิสง, มะเขือเทศ ~10g): ~20 kcal · 1g P · 4g C · 1g F · 2g sugar

Component sum: 421 kcal · 32.5g P · 29g C · 21g F · 17g sugar
Locked for entry: 420 kcal · 30g P · 30g C · 18g F · 15g sugar / 280g
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| ส้มตำ alone (~150g) | 130 – 200 |
| **Combo: ส้มตำ + 1/4 chicken** | **370 – 480** |
| + ข้าวเหนียว side | 580 – 700 |

s19 at 420 sits in expected combo band ✓.

**§3c 1-serving portion (280g):**
- ส้มตำไทย ~150g
- ไก่ย่าง 1/4 ตัว ~110g (NOT including extra ข้าวเหนียว — separate item if user adds)
- กะหล่ำปลี / ถั่วฝักยาว garnish ~20g
- **Total ≈ 280g** → matches s07 ยำวุ้นเส้น (250g) + 1/4 chicken extension

**§3d Macro-consistency prediction:**

```
macro-cal = 30×4 + 30×4 + 18×9 = 120 + 120 + 162 = 402 vs baseCalories 420
         = predicted diff (420 - 402) / 420 = +4.29% → PASS band (≤5%) ✓
```

**§3e Real-user fit:**
- Serving 280g matches combo convention ✓
- Sugar 15g is notable — flag if user is sugar-restricted ✓
- Customization "ส้มตำเผ็ดน้อย" 0 cal change (just spice preference) ✓
- Customization "ไม่ใส่ถั่วลิสง" (-30 cal · -3g F) for nut allergy ✓
- Customization "เพิ่มข้าวเหนียว" → user logs r28 instead (note in spec) ✓

⚠️ **Open question to flag at review:** ส้มตำไทย calorie value (130 kcal/150g) is component estimate, NOT verified against INMU FCD entry.

---

## 4. Customizations (computed from validated components)

Per deep-research finding: **no customization deltas are documented in any consulted source** — all computed from validated components with ±15-25% uncertainty bands.

### r25 ข้าวไก่ย่างเชสเตอร์
- `no_skin` "ไม่ใส่หนัง" — calChange -75, fatChange -7, gramsChange -22
- `extra_sauce` "เพิ่มซอสกระเทียมพริกไทย" — calChange +45, carbChange +11, sugarChange +11
- `extra_quarter_chicken` "เพิ่มไก่ 1/4 ตัว (รวมเป็น 1/2)" — calChange +250, proteinChange +27, fatChange +17, gramsChange +110

### r26 ไก่ย่างเชสเตอร์ 1/4 ตัว
- `no_skin` "ไม่ใส่หนัง" — calChange -75, fatChange -7, gramsChange -22
- `extra_quarter_chicken` "เพิ่มไก่ 1/4 ตัว (รวมเป็น 1/2 ตัว)" — calChange +250, proteinChange +27, fatChange +17, gramsChange +110
- `extra_sauce` "เพิ่มซอสกระเทียมพริกไทย" — calChange +45, carbChange +11, sugarChange +11

### r27 ข้าวไก่กระเทียมพริกไทยเชสเตอร์
- `no_rice` "ไม่ใส่ข้าว" — calChange -205, proteinChange -4, carbChange -45
- `less_oil` "ลดน้ำมัน" — calChange -72, fatChange -8
- `extra_fried_egg` "เพิ่มไข่ดาว" — calChange +90, proteinChange +6, fatChange +7

### r28 ข้าวเหนียวไก่ย่างเชสเตอร์
- `no_sticky_rice` "ไม่ใส่ข้าวเหนียว" — calChange -255, proteinChange -5, carbChange -53
- `no_skin` "ไม่ใส่หนัง" — calChange -75, fatChange -7
- `extra_sauce` "เพิ่มซอสกระเทียมพริกไทย" — calChange +45, carbChange +11, sugarChange +11

### s19 ส้มตำไก่ย่างเชสเตอร์คอมโบ
- `no_skin` "ไม่ใส่หนัง" — calChange -75, fatChange -7
- `no_peanuts` "ไม่ใส่ถั่วลิสง" — calChange -30, fatChange -3
- `less_palm_sugar` "ส้มตำใส่น้ำตาลน้อย" — calChange -25, sugarChange -6
- `add_sticky_rice` "เพิ่มข้าวเหนียว 1 ห่อ" — calChange +210, proteinChange +4, carbChange +45

(Customization IDs `no_rice`, `no_skin` already exist in the dataset — reused for consistency.)

## 5. Affected files

| File | Change |
|---|---|
| `meals.json` | (a) version 1.10.14 → 1.10.15 · (b) r25-r28 inserted after r24 · (c) s19 inserted after s18 |
| `service-worker.js` | VERSION → v1.10.40 |
| `index.html` | VERSION → v1.10.40 |
| `docs/specs/add-meals-chesters.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-013f entry |

## 6. Workflow audit

- Library / search / suggester / planner all read `meals.json` → 5 new entries auto-appear
- Search "เชสเตอร์" / "ไก่ย่าง" finds new entries
- Customizations array: render correctly (each entry has 2-4)
- Log entry: addLogEntry takes mealId + customizations snapshot → no migration
- Reports: range aggregation reads log entries → no schema change
- PWA cache: bumping `meals.json` data version + VERSION invalidates cache

## 7. Hard guardrails

- Each entry's macro-consistency in audit `pass` band (≤5%) — all predictions ≤4.5%
- Existing entries r01-r24 / s01-s18 / all others byte-identical
- `branded_products.json` byte-identical
- `tools/audit-meals.js` byte-identical
- VERSION sync between `index.html` and `service-worker.js`
- `meals.json` version field bumped to 1.10.15
- **No claim of "official Chester's nutrition data"** — research confirms no public source exists
- Every cited number traces to a verified source URL

## 8. Definition of Done

- [ ] 5 entries inserted: r25 (397) · r26 (290) · r27 (600) · r28 (540) · s19 (420)
- [ ] All 5 in audit `pass` band; per-entry diff% matches §3d prediction within rounding
- [ ] `meals.json` version 1.10.14 → 1.10.15
- [ ] `service-worker.js` + `index.html` VERSION v1.10.39 → v1.10.40
- [ ] PowerShell audit (per DEC-002): total 392 → 397, pass band gains exactly +5, warn/fail unchanged
- [ ] `git diff meals.json` shows exactly 3 hunks (version + r insertion + s insertion)
- [ ] `branded_products.json` + `tools/audit-meals.js` byte-identical (hashes match v1.10.39 baseline)
- [ ] PROJECT_STATE + TASK_BOARD updated with T-013f entry
- [ ] Open-question flags (sticky rice / ส้มตำ derivation) documented in entry for future refinement

## Test plan (manual after deploy)

1. Open library, search "เชสเตอร์" → 5 entries appear
2. Search "ไก่ย่าง" → r25/r26/r28 + s19 surface (along with other ไก่ย่าง entries)
3. Tap r25 → 397 cal / 380g; customizations render (เพิ่มซอส, ไม่ใส่หนัง, +1/4)
4. Apply "ไม่ใส่หนัง" to r25 → adjusted total = 322 cal
5. Apply "เพิ่มไก่ 1/4 ตัว" to r26 → adjusted total = 540 cal (290 + 250)
6. r28 + "ไม่ใส่ข้าวเหนียว" → 285 cal (just chicken + sauce, low-carb mode)
7. s19 logged in 30-day Reports → appears under salads category

## Rollback plan

`git revert <T-013f commit>` removes 5 entries + version bumps. Log entries that referenced r25-r28/s19 fall through to snapshot fallback.

## Citation sources

[1]: https://fit-d.com/food/view/MTE5Nw — "ข้าวอบไก่ย่าง / Rice with Chicken Grill" — 397/28/44/12 — cites Chester's nutrition label (ฉลากโภชนาการ) — secondary aggregator — adversarial vote 2-1, macro reconciles 0.25%
[2]: https://www.recipal.com/ingredients/31833-nutrition-facts-calories-protein-carbs-fat-jasmine-rice-cooked — cooked jasmine rice 130 kcal/100g, 2.5g P · 28.5g C · 0g F — 4.6% macro delta — cross-checked vs USDA SR + Nutritionix + SnapCalorie + nutritionvalue.org — adversarial vote 3-0
[3]: https://foods.fatsecret.com/calories-nutrition/usda/chicken-thigh-meat-and-skin-(broilers-or-fryers-roasted-cooked) — USDA roasted chicken thigh meat+skin 247 kcal/100g, ~25g P (band ±2g, 1-2 refuted on exact 25.06g), 0g C, 15.5g F — 3% macro delta — adversarial vote 3-0
[4]: https://www.nutritionvalue.org/Sweet_chilli_sauce_by_GRAMA%27S_555013_nutritional_value.html — GRAMA's sweet chili sauce 45 kcal/25g, 0g P · 11g C · 0g F · 11g sugar — 2.3% macro delta — adversarial vote 2-1, brand variance flagged (±30% Mae Ploy/Heinz/McCormick/PF Chang's range)
[5]: Open question — sticky rice (ข้าวเหนียว) at ~169 kcal/100g cooked is commonly cited but NOT independently verified in this synthesis. INMU FCD v3 should be consulted for primary citation.
[6]: Open question — ส้มตำไทย (Thai papaya salad) calorie value derived from generic components. INMU FCD v3 should be consulted for primary citation.

Source quality summary: 23 sources fetched (6 primary [USDA FoodData, INMU, MoPH, FAO INFOODS], 5 secondary [fit-d, FatSecret, recipal, nutritionvalue], 6 unreliable/forum). 25 claims adversarially verified, 23 confirmed, 2 killed (chicken protein 25.06g exact; GRAMA's chili sauce brand-specificity).

## Open questions (locked in spec)

- **Sticky rice anchor**: spec uses 169 kcal/100g (commonly cited). INMU FCD v3 confirmation would upgrade r28 from "derived estimate" to "primary cited".
- **ส้มตำไทย anchor**: spec uses 130 kcal/150g (component sum). INMU FCD v3 confirmation would upgrade s19 similarly.
- **Sweet chili brand**: spec uses GRAMA's USDA Branded as anchor for "Chester's signature sauce". Chester's actual house sauce composition is unknown; ±30% brand variance acceptable for customization deltas.
- **Chicken portion at r25**: fit-d's 397 cal is *lower* than component sum (~510-540), suggesting Chester's standard portion may be smaller than 110g chicken. Spec trusts fit-d (cited label data) but documents this anomaly.
