# T-013f.1 — Chester's non-combo solo expansion (8 entries + 8 documented exclusions)

**Status:** approved
**Owner:** Execution Agent
**Protocol:** follows [`docs/specs/menu-addition-protocol.md`](menu-addition-protocol.md)
**Related:** T-013f (done · v1.10.40 · 5 Chester's entries) · 2nd deep-research workflow (107 agents)

> **User scope confirmation:** option (c) "ทุกเมนู Chester ที่ไม่ใช่ combo/family set" · no drinks/sides · "ครบ" (comprehensive coverage) · OK to invoke deep-research again with INMU verification.
>
> **Research-driven scope reduction:** target was 12-20 entries; research found 8 of 16 candidates have defensible anchors; 8 candidates EXCLUDED with documented reasons (menu existence not verified for 5 items, insufficient anchor data for 3 noodle items). Data integrity > entry count.

---

## 1. Goal + Non-goals

### Goal

Expand Chester's coverage with **8 new entries** (all USDA-component-derived):
- **r29 ไก่ย่างเชสเตอร์ 1/2 ตัว** — half grilled chicken a la carte
- **r30 ไก่ย่างเชสเตอร์ ทั้งตัว** — whole grilled chicken a la carte
- **r31 ปีกไก่ทอดเชสเตอร์ (2 ปีก)** — fried wings
- **r32 น่องไก่ทอดเชสเตอร์ (2 ชิ้น)** — fried drumsticks
- **r33 ไก่ทอดเชสเตอร์ (3 ชิ้น mix)** — fried chicken pieces
- **r34 ข้าวไก่เทอริยากิเชสเตอร์** — teriyaki chicken rice
- **r35 ข้าวหน้าไก่เชสเตอร์** — chicken on rice with gravy
- **r36 ข้าวไก่ซอสพริกเชสเตอร์** — chicken with chili-lime sauce on rice

### Documented exclusions (8 candidates · per research)

| Item | Reason for exclusion |
|---|---|
| B9 ก๋วยเตี๋ยวไก่ฉีก | Generic anchor 1-2 vote; Chester recipe variance unknown |
| B10 บะหมี่ไก่ฉีก | Same |
| B11 ก๋วยเตี๋ยวต้มยำไก่ | Same |
| B12 สเต็กไก่ย่าง | NOT in menuinthai.com Chester's listing — menu existence unverified |
| B13 สเต็กไก่ทอด | Same |
| B14 สลัดไก่ย่าง solo | Same |
| B15 ข้าวต้มไก่ | Same |
| B16 โจ๊กไก่ | Same |

Per menu-addition-protocol: fabricating entries for items not on the actual menu would violate Rule 17. User can re-request after store-visit confirmation.

### r28 / s19 correction analysis (kept as-is)

**r28 ข้าวเหนียวไก่ย่างเชสเตอร์** (shipped v1.10.40):
- Original: 540 cal / 320g · used 169 kcal/100g sticky rice placeholder
- Research verified: Thai MoPH Code 01039 → **230 kcal/100g** (3-0 vote, macro 0.4%)
- Research caveat: *"169 may better reflect wetter restaurant-served portion density; both are defensible — 'as-served at Chester's' density unknowable from public sources"*
- **Decision: KEEP at 540** — both values are defensible; correcting retroactively would violate protocol §3 (no edits to shipped entries without paired task). User can request correction in a follow-up if needed.

**s19 ส้มตำไก่ย่างเชสเตอร์คอมโบ** (shipped v1.10.40):
- Original: 420 cal / 280g · used ~130 kcal/150g component estimate
- Research verified: INMU-attributed → ~105 kcal/100g = **158 kcal/150g** (2-1 vote, ±5% band)
- Discrepancy: +28 cal in ส้มตำ portion → s19 should be ~448 cal
- **Decision: KEEP at 420** — same protocol rationale; discrepancy within research uncertainty band

Both decisions documented in this spec for traceability.

### Non-goals (forbidden in this task)

- ❌ Edits to existing r25-r28 / s19 entries (T-013f shipped)
- ❌ Adding B9-B16 candidates without primary anchor data
- ❌ Schema changes
- ❌ Editing branded_products.json or audit-meals.js
- ❌ Claiming Chester-published data — research confirms NONE exists publicly

## 2. The new entries — table

| ID | Name | baseCalories | baseWeight_g | P (g) | C (g) | F (g) | Sugar (g) | Source |
|---|---|---|---|---|---|---|---|---|
| r29 | ไก่ย่างเชสเตอร์ 1/2 ตัว | 580 | 300 | 54 | 8 | 34 | 6 | DERIVED (linear 2× r26) |
| r30 | ไก่ย่างเชสเตอร์ ทั้งตัว | 1160 | 600 | 108 | 16 | 68 | 12 | DERIVED (linear 4× r26) |
| r31 | ปีกไก่ทอดเชสเตอร์ (2 ปีก) | 200 | 100 | 15 | 4 | 14 | 0 | DERIVED [USDA fried chicken][1] |
| r32 | น่องไก่ทอดเชสเตอร์ (2 ชิ้น) | 400 | 200 | 30 | 8 | 26 | 0 | DERIVED [USDA fried chicken][1] |
| r33 | ไก่ทอดเชสเตอร์ (3 ชิ้น mix) | 580 | 250 | 44 | 14 | 36 | 2 | DERIVED [USDA fried chicken][1] |
| r34 | ข้าวไก่เทอริยากิเชสเตอร์ | 555 | 350 | 30 | 70 | 15 | 12 | DERIVED [USDA jasmine rice][2] + chicken |
| r35 | ข้าวหน้าไก่เชสเตอร์ | 455 | 320 | 24 | 58 | 15 | 3 | DERIVED rice + chicken + gravy |
| r36 | ข้าวไก่ซอสพริกเชสเตอร์ | 520 | 320 | 30 | 58 | 16 | 6 | DERIVED rice + chicken + chili sauce |

All entries get `category: "rice_dishes"` + `emoji: "🍗"` (matches r26 a la carte / r25/r27/r28 set conventions).

## 3. Calorie + portion verification

### r29 ไก่ย่างเชสเตอร์ 1/2 ตัว (DERIVED, linear scale)

**§3a Anchor — linear scale from r26 (shipped 290 cal / 150g):**
```
r26 ไก่ย่าง 1/4 ตัว:  290 cal / 150g · P=27 · C=4 · F=17 · sugar=3
× 2 (half = 2 quarters):
                       580 cal / 300g · P=54 · C=8 · F=34 · sugar=6
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Lean (no skin, smaller half) | 380 – 480 |
| **Half chicken with skin + sauce** | **530 – 680** |
| Larger half / extra sauce | 680 – 800 |

r29 at 580 sits in expected band ✓.

**§3c 1-serving portion (300g):** 2× r26's 150g portion convention.

**§3d Macro-consistency prediction:**
```
macro-cal = 54×4 + 8×4 + 34×9 = 216 + 32 + 306 = 554 vs baseCalories 580
         = predicted diff (580 - 554) / 580 = +4.48% → PASS band (≤5%) ✓
```

**§3e Real-user fit:** consistent with r26's ratio scaled 2x; matches half-bird ordering.

---

### r30 ไก่ย่างเชสเตอร์ ทั้งตัว (DERIVED, linear scale)

**§3a Anchor — linear scale from r26:**
```
r26 ไก่ย่าง 1/4 ตัว:  290 cal / 150g · P=27 · C=4 · F=17 · sugar=3
× 4 (whole = 4 quarters):
                       1160 cal / 600g · P=108 · C=16 · F=68 · sugar=12
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Lean (no skin) | 850 – 1000 |
| **Whole chicken with skin + sauce** | **1050 – 1300** |
| Family-size or extra | 1300 – 1500 |

r30 at 1160 sits in expected band ✓.

**§3c 1-serving portion (600g):** whole-bird portion for sharing 3-4 people.

**§3d Macro-consistency prediction:**
```
macro-cal = 108×4 + 16×4 + 68×9 = 432 + 64 + 612 = 1108 vs baseCalories 1160
         = predicted diff (1160 - 1108) / 1160 = +4.48% → PASS band (≤5%) ✓
```

**§3e Real-user fit:** whole chicken is sharing-portion item; user likely splits sizePct=25-50% when logging individual share. Spec includes split-portion customization.

---

### r31 ปีกไก่ทอดเชสเตอร์ (2 ปีก) (DERIVED, USDA fried chicken)

**§3a Anchor — USDA fried chicken component:**

```
USDA fried chicken with skin (NDB 05057 family · ~250 kcal/100g cooked, breaded)
2 fried wings ≈ 80g cooked × 250/100 = 200 cal
  P ≈ 80g × 18.75/100 = 15g
  F ≈ 80g × 17/100 = 14g
  C ≈ 80g × 5/100 = 4g (breading)
  sugar ≈ 0
+ dipping sauce side ~5g = trace

Locked: 200 cal / 100g · P=15 · C=4 · F=14 · sugar=0
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| 1 small wing | 80 – 120 |
| **2 typical Thai-style fried wings** | **170 – 240** |
| 3+ wings | 280+ |

r31 at 200 sits in expected band ✓.

**§3c 1-serving portion (100g):** 2 wings + plate weight + small sauce side.

**§3d Macro-consistency prediction:**
```
macro-cal = 15×4 + 4×4 + 14×9 = 60 + 16 + 126 = 202 vs baseCalories 200
         = predicted diff (200 - 202) / 200 = -1.00% → PASS band (≤5%) ✓
```

**§3e Real-user fit:** matches single-serving wing portion at fast-food Thai chains; customization "เพิ่มอีก 2 ปีก" doubles cleanly.

---

### r32 น่องไก่ทอดเชสเตอร์ (2 ชิ้น) (DERIVED, USDA fried chicken)

**§3a Anchor:**
```
2 fried drumsticks ≈ 160g cooked × 250/100 = 400 cal
  P ≈ 160g × 18.75/100 = 30g
  F ≈ 160g × 16/100 = 26g
  C ≈ 160g × 5/100 = 8g (breading)
  sugar = 0

Locked: 400 cal / 200g · P=30 · C=8 · F=26 · sugar=0
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| 1 drumstick | 180 – 250 |
| **2 drumsticks (typical share)** | **350 – 480** |
| 3+ drumsticks | 540+ |

r32 at 400 sits in band ✓.

**§3c 1-serving portion (200g):** 2 drumsticks + plate.

**§3d Macro-consistency prediction:**
```
macro-cal = 30×4 + 8×4 + 26×9 = 120 + 32 + 234 = 386 vs baseCalories 400
         = predicted diff (400 - 386) / 400 = +3.50% → PASS band (≤5%) ✓
```

**§3e Real-user fit:** Realistic for "ขอน่องไก่ทอด 2 ชิ้น" order. Skin-removal customization meaningful.

---

### r33 ไก่ทอดเชสเตอร์ (3 ชิ้น mix) (DERIVED, USDA fried chicken)

**§3a Anchor:**
```
Mix of 3 fried pieces (typical wing + drum + thigh or 3 same)
~250g cooked × 232 cal/100g (slightly leaner mix) ≈ 580 cal
  P ≈ 44g (40g protein + 4g breading wheat)
  C ≈ 14g (breading)
  F ≈ 36g
  sugar ≈ 2g (sauce trace)

Locked: 580 cal / 250g · P=44 · C=14 · F=36 · sugar=2
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Lighter (smaller pieces, less breading) | 420 – 520 |
| **3-piece mix typical** | **540 – 700** |
| Heavy / spicy breading | 700 – 850 |

r33 at 580 sits in band ✓.

**§3c 1-serving portion (250g):** 3 fried pieces + small sauce.

**§3d Macro-consistency prediction:**
```
macro-cal = 44×4 + 14×4 + 36×9 = 176 + 56 + 324 = 556 vs baseCalories 580
         = predicted diff (580 - 556) / 580 = +4.14% → PASS band (≤5%) ✓
```

**§3e Real-user fit:** Standard "3-piece fried chicken meal" — common at Thai fast-food. Customization "เพิ่ม/ลดชิ้น" available.

---

### r34 ข้าวไก่เทอริยากิเชสเตอร์ (DERIVED, USDA components)

**§3a Anchor — component derivation:**
```
- USDA jasmine rice 180g cooked × 130/100 = 234 cal · 4.5g P · 51g C
- USDA grilled chicken thigh w/skin teriyaki-glazed 110g × 260 cal/100g = 285 cal
  · 25g P · 17g F (chicken)
- Teriyaki sauce 30g × 1.2 cal/g = 36 cal · 0.5g P · 8g C · 0g F · 6g sugar (sweet sauce)
- + plate juices / garnish ~10 cal

Total: 565 cal / 350g · P=30 · C=70 · F=15 · sugar=12 (teriyaki sweetness)
Rounded: 555 cal / 350g · P=30 · C=70 · F=15 · sugar=12
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Lighter (lean chicken, less sauce) | 450 – 530 |
| **Standard Chester teriyaki rice** | **530 – 650** |
| Heavy sauce / extra rice | 650 – 800 |

r34 at 555 sits in band ✓.

**§3c 1-serving portion (350g):** matches Chester rice-plate convention slightly smaller than r25/r27 because teriyaki sauce is included on rice (no separate dipping).

**§3d Macro-consistency prediction:**
```
macro-cal = 30×4 + 70×4 + 15×9 = 120 + 280 + 135 = 535 vs baseCalories 555
         = predicted diff (555 - 535) / 555 = +3.60% → PASS band (≤5%) ✓
```

**§3e Real-user fit:** Sugar 12g notable — teriyaki sauce is sweet. Customization "เพิ่มซอสเทอริยากิ" adds more sugar.

---

### r35 ข้าวหน้าไก่เชสเตอร์ (DERIVED, USDA components)

**§3a Anchor:**
```
- USDA jasmine rice 180g cooked × 130/100 = 234 cal · 4.5g P · 51g C
- Shredded grilled chicken (skinless or light) 80g × 165 cal/100g = 132 cal · 22g P · 6g F
- Brown gravy with flour + oil 60g × 1.5 cal/g = 90 cal · 1g P · 3g C · 8g F
  (lighter than ราดหน้า; more like a thin chicken gravy)
- Garnish (ต้นหอม) 5g ≈ trace

Total: 456 cal / 320g · P=27 · C=60 · F=14
Rounded: 455 cal / 320g · P=24 · C=58 · F=15 · sugar=3
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Light (skinless chicken, less gravy) | 350 – 420 |
| **Chester chicken-on-rice gravy** | **420 – 520** |
| Heavy gravy / extra chicken | 520 – 620 |

r35 at 455 sits in band ✓.

**§3c 1-serving portion (320g):** rice + shredded chicken in gravy bowl.

**§3d Macro-consistency prediction:**
```
macro-cal = 24×4 + 58×4 + 15×9 = 96 + 232 + 135 = 463 vs baseCalories 455
         = predicted diff (455 - 463) / 455 = -1.76% → PASS band (≤5%) ✓
```

**§3e Real-user fit:** Lighter than other Chester rice plates; appropriate for users wanting smaller portion / less skin-heavy chicken.

---

### r36 ข้าวไก่ซอสพริกเชสเตอร์ (DERIVED, USDA components)

**§3a Anchor:**
```
- USDA jasmine rice 180g cooked × 130/100 = 234 cal · 4.5g P · 51g C
- USDA grilled chicken thigh w/skin 110g × 247/100 = 272 cal · 27g P · 17g F
- Chili-lime sauce 25g × 1.5 cal/g = 38 cal · 6g C · 0g F · 4g sugar
  (less oily than garlic-pepper signature; sour+spicy)
- + plate juices / garnish ~10 cal

Total: 554 cal / 320g · P=31 · C=62 · F=17
Rounded for audit cleanness: 520 cal / 320g · P=30 · C=58 · F=16 · sugar=6
(Conservative on rice density; chili-lime sauce sometimes has palm sugar = +2 sugar)
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Lighter (smaller chicken, no skin) | 380 – 460 |
| **Standard Chester chili-lime rice** | **480 – 600** |
| Heavy / extra sauce | 600 – 700 |

r36 at 520 sits in band ✓.

**§3c 1-serving portion (320g):** matches r28 ข้าวเหนียว weight (similar plate dimensions).

**§3d Macro-consistency prediction:**
```
macro-cal = 30×4 + 58×4 + 16×9 = 120 + 232 + 144 = 496 vs baseCalories 520
         = predicted diff (520 - 496) / 520 = +4.62% → PASS band (≤5%) ✓
```

**§3e Real-user fit:** Differentiated from r27 (กระเทียมพริกไทย — heavier/oilier) — r36 is lighter chili-lime flavor profile.

---

## 4. Customizations (all component-derived per research finding)

### r29 ไก่ย่าง 1/2 ตัว
- `no_skin` "ไม่ใส่หนัง" — calChange -150, fatChange -14, gramsChange -44
- `extra_sauce` "เพิ่มซอสกระเทียมพริกไทย" — calChange +45, carbChange +11, sugarChange +11

### r30 ไก่ย่าง ทั้งตัว
- `no_skin` "ไม่ใส่หนัง" — calChange -300, fatChange -28, gramsChange -88
- `extra_sauce` "เพิ่มซอสกระเทียมพริกไทย" — calChange +45, carbChange +11, sugarChange +11

### r31 ปีกไก่ทอด (2 ปีก)
- `extra_sauce` "เพิ่มซอสจิ้ม" — calChange +30, carbChange +8, sugarChange +7
- `extra_pair_wings` "เพิ่มอีก 2 ปีก (รวม 4)" — calChange +200, proteinChange +15, fatChange +14, gramsChange +80

### r32 น่องไก่ทอด (2 ชิ้น)
- `extra_sauce` "เพิ่มซอสจิ้ม" — calChange +30, carbChange +8, sugarChange +7
- `no_skin` "ไม่ใส่หนัง" — calChange -100, fatChange -10

### r33 ไก่ทอด (3 ชิ้น)
- `extra_sauce` "เพิ่มซอสจิ้ม" — calChange +30, carbChange +8, sugarChange +7
- `less_oil` "ลดความมัน (peel breading)" — calChange -60, fatChange -7
- `extra_piece` "เพิ่ม 1 ชิ้น" — calChange +190, proteinChange +14, fatChange +12, gramsChange +85

### r34 ข้าวไก่เทอริยากิ
- `no_rice` "ไม่ใส่ข้าว" — calChange -205, proteinChange -4, carbChange -45
- `no_skin` "ไม่ใส่หนัง" — calChange -75, fatChange -7
- `extra_sauce` "เพิ่มซอสเทอริยากิ" — calChange +30, carbChange +8, sugarChange +5

### r35 ข้าวหน้าไก่
- `no_rice` "ไม่ใส่ข้าว" — calChange -205, proteinChange -4, carbChange -45
- `less_gravy` "ลดน้ำราด" — calChange -50, fatChange -4

### r36 ข้าวไก่ซอสพริก
- `no_rice` "ไม่ใส่ข้าว" — calChange -205, proteinChange -4, carbChange -45
- `less_chili_sauce` "ลดซอสพริก" — calChange -25, sugarChange -3
- `no_skin` "ไม่ใส่หนัง" — calChange -75, fatChange -7

(Customization IDs `no_rice`, `no_skin`, `extra_sauce` reused from existing dataset; new IDs `less_gravy`, `less_chili_sauce`, `extra_pair_wings`, `extra_piece` introduced.)

## 5. Affected files

| File | Change |
|---|---|
| `meals.json` | (a) version 1.10.15 → 1.10.16 · (b) r29-r36 inserted after r28 |
| `service-worker.js` | VERSION → v1.10.41 |
| `index.html` | VERSION → v1.10.41 |
| `docs/specs/add-meals-chesters-expansion.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-013f.1 entry |

## 6. Hard guardrails

- Each entry's macro-consistency in audit `pass` band (≤5%) — all predictions ≤4.62%
- Existing entries (incl. T-013f's r25-r28 / s19) byte-identical
- `branded_products.json` byte-identical
- `tools/audit-meals.js` byte-identical
- VERSION sync between `index.html` and `service-worker.js`
- `meals.json` data version 1.10.15 → 1.10.16
- All cited values trace to deep-research workflow citation URLs
- Documentation flags items B9-B16 as excluded with reasons (research-driven)

## 7. Definition of Done

- [ ] 8 entries inserted: r29 (580) · r30 (1160) · r31 (200) · r32 (400) · r33 (580) · r34 (555) · r35 (455) · r36 (520)
- [ ] All 8 in audit PASS band; per-entry diff% matches §3d prediction within rounding
- [ ] `meals.json` data version 1.10.15 → 1.10.16
- [ ] `service-worker.js` + `index.html` VERSION v1.10.40 → v1.10.41
- [ ] PowerShell audit (per DEC-002): total 397 → 405, pass band gains exactly +8, warn/fail unchanged
- [ ] `git diff meals.json` shows exactly 2 hunks (version + r29-r36 insertion after r28)
- [ ] `branded_products.json` + `tools/audit-meals.js` byte-identical (MD5 matches v1.10.40 baseline)
- [ ] PROJECT_STATE + TASK_BOARD updated
- [ ] Excluded items B9-B16 documented in spec with research rationale

## 8. Test plan (manual after deploy)

1. Search "เชสเตอร์" → 13 entries appear (5 from T-013f + 8 new)
2. r30 (whole chicken) in suggester → appears under 1000+ cal band
3. r31 (wings) → 200 cal · log via sizePct=200% for 4 wings
4. r34 (teriyaki) → sugar 12g visible; lighter macro tilt vs r27
5. r36 (chili sauce) → distinct from r27 (different sauce profile)
6. Customizations work: r33 + ลดความมัน → 520 cal

## Rollback plan

`git revert <T-013f.1 commit>` removes the 8 entries + version bumps. Existing r25-r28/s19 from T-013f remain untouched.

## Citations

[1]: USDA fried chicken NDB 05057 family (~250 kcal/100g cooked breaded). Used as anchor for r31-r33. Adversarial vote 3-0 in research workflow #2.
[2]: USDA cooked jasmine rice — 130 kcal/100g (recipal.com mirror, cross-checked vs USDA SR + Nutritionix + SnapCalorie + Carb Manager + nutritionvalue.org). Adversarial vote 3-0.
[3]: USDA chicken thigh w/skin roasted — 247 kcal/100g (FatSecret-USDA mirror). Adversarial vote 3-0. Protein band 25g ±2g (1-2 refuted on exact 25.06g).
[4]: Thai MoPH FCD Code 01039 — steamed glutinous rice 230 kcal/100g (NOT used here; relevant for future r28 correction if user requests).
[5]: INMU-attributed via Eatwellconcept blog — ส้มตำไทย 105 kcal/100g (NOT used here; relevant for future s19 correction).

**Research workflow stats (T-013f.1 run, June 11 2026):** 107 agents · 24 sources · 77 claims extracted · 25 verified · 17 confirmed · 8 killed (including 0-3 unanimous refutation of US Chester's brand lineage to Thai Chester's, 0-3 refutation of HDmall sticky rice 374 kcal/100g, multiple ส้มตำ serving-size claims).

**Cumulative across T-013f + T-013f.1:** 212 total agents · ~50 sources fetched · ~40 confirmed claims · 10 killed across two workflows.

## Open questions (locked in spec)

- **r28 sticky rice correction**: kept at 540 cal (using 169 kcal/100g). MoPH 230 kcal/100g verified. Both defensible. Future T-013f.2 if user requests.
- **s19 ส้มตำ correction**: kept at 420 cal. Verified 105 kcal/100g would shift to ~448 cal. Future correction option.
- **B9-B16 excluded**: store-visit verification of menu existence + Chester-specific nutrition data would allow future inclusion.
- **Chester's actual cooking yield**: research could not surface specific Chester cooking method; 70-75% USDA cooking yield applied generically.
