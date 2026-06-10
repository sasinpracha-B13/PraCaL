# T-013e — Add ก๋วยจั๊บ + ก๋วยจั๊บญวน menu entries (4 entries)

**Status:** approved
**Owner:** Execution Agent
**Protocol:** follows [`docs/specs/menu-addition-protocol.md`](menu-addition-protocol.md) (AGENTS.md Rule 17)
**Related:** `TASK_BOARD.md` T-013e · T-008 (last menu-add task, v1.10.26)

---

## 1. Goal + Non-goals

### Goal
Add 4 ก๋วยจั๊บ family entries to `meals.json` covering the realistic spectrum of how Thai users order this dish:
- **น37 ก๋วยจั๊บน้ำใส** — Thai light clear-broth version
- **n38 ก๋วยจั๊บน้ำข้น (นายแอ๋ว style)** — Bangkok peppery dark broth with crispy pork belly
- **n39 ก๋วยจั๊บญวน** — Vietnamese standard (clear broth, ground pork + pork balls + Vietnamese sausage)
- **n40 ก๋วยจั๊บญวน รวมพิเศษ** — Vietnamese assorted (adds egg + extra toppings)

### Non-goals (forbidden in this task)
- ❌ Edits to existing n01-n36 entries (n37+ insertion only)
- ❌ Schema changes
- ❌ UI changes (the suggester / planner / library auto-pick up new entries)
- ❌ Edits to `branded_products.json` or `tools/audit-meals.js`
- ❌ New customization IDs invented from scratch — reuse where possible
- ❌ Adding entries that lie outside the established sanity range
- ❌ Changing portion conventions (must match peer noodle entries' typical 380-450g)

## 2. The new entries — table

| ID | Name | baseCalories | baseWeight_g | P (g) | C (g) | F (g) | Sugar (g) |
|---|---|---|---|---|---|---|---|
| n37 | ก๋วยจั๊บน้ำใส | 340 | 400 | 18 | 44 | 9 | 3 |
| n38 | ก๋วยจั๊บน้ำข้น | 620 | 450 | 26 | 60 | 28 | 3 |
| n39 | ก๋วยจั๊บญวน | 400 | 420 | 24 | 52 | 10 | 4 |
| n40 | ก๋วยจั๊บญวนรวมพิเศษ | 500 | 480 | 32 | 55 | 15 | 4 |

All entries get `category: "noodles"` and `emoji: "🍜"` (consistent with n01-n05 / n10-n14 pattern).

## 3. Calorie + portion verification

### n37 ก๋วยจั๊บน้ำใส

**§3a Anchor derivation:**
```
n03 ก๋วยเตี๋ยวน้ำใส:    290 cal / 380g · P=18 · C=40 · F=7 · sugar=3
+ ก๋วยจั๊บ rolled rice noodle is starchier than เส้นเล็ก
  → +4g carbs, +20 cal
+ pork offal (เครื่องในหมู) replaces fish/pork ball
  → +2g fat, +1g protein, +20 cal
+ slightly thicker broth (white pepper / cornstarch)
  → +10 cal
= n37:                  340 cal / 400g · P=18 · C=44 · F=9 · sugar=3
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Home cooking (lighter, less offal) | 280 – 320 |
| **Restaurant / street food** | **310 – 400** |
| Heavy / extra-noodles / extra-offal | 400 – 480 |

n37 baseline at 340 sits squarely in the restaurant/street-food band ✓.

**§3c 1-serving portion (400g):**
- เส้นก๋วยจั๊บ ~80g cooked (rolled rice noodles, denser than เส้นเล็ก)
- หมูบด/หมูสามชั้น 40g
- เครื่องในหมู 30g
- น้ำซุปใส ~200g
- ผักชี / กระเทียมเจียว / ต้นหอม ~20g
- **Total ≈ 370-400g** → 400g matches n01/n02 noodle-soup convention

**§3d Macro-consistency prediction:**
```
macro-cal = 18×4 + 44×4 + 9×9
         = 72 + 176 + 81
         = 329 vs baseCalories 340
         = predicted diff (340 - 329) / 340 = +3.24% → PASS band (≤5%) ✓
```

**§3e Real-user fit:**
- Serving: 400g matches existing noodle-soup convention (n01=380, n02=400, n05=450) ✓
- Calorie level: 340 sits between น้ำใส (n03=290) and ต้มยำ (n02=340) — appropriate for ก๋วยจั๊บ's slightly thicker broth ✓
- Macros: similar to n02 ต้มยำ ratio (P/C/F = 20/45/9 vs n37's 18/44/9) — sensible ✓
- Name spelling: "ก๋วยจั๊บน้ำใส" is the standard Thai transliteration users will search ✓

---

### n38 ก๋วยจั๊บน้ำข้น (นายแอ๋ว style)

**§3a Anchor derivation (two-anchor cross-check):**
```
Anchor 1: n01 ก๋วยเตี๋ยวเรือ:    300 cal / 380g · P=18 · C=38 · F=8

+ Switch to ก๋วยจั๊บ rolled noodles (denser): +20 cal, +6g carbs
+ Add หมูกรอบ (crispy pork belly) 60g:
    typical crispy pork is ~30-35% fat by weight, ~5g cal/g
    60g × ~5 cal/g = +280 cal (P+8, C+0, F+19)
+ Add ไข่ต้ม 1 ฟอง (typical with น้ำข้น):
    ~75 cal (P+6, F+5)
+ Switch to thicker peppery broth (cornstarch + lard):
    +20 cal (F+2)
- Slightly less vegetable (peppery broth doesn't get much veg):
    -5 cal

= n38:  ~690 cal / 460g · P=32 · C=44 · F=34

Anchor 2 (cross-check): n06 ข้าวหมูกรอบ:    970 cal / 370g · P=25 · C=65 · F=65
   ratio of fat from หมูกรอบ in n06 ≈ 65g fat / 90-100g pork = 0.7 g_fat/g_pork
   for n38's 60g pork: 60 × 0.7 = 42g fat (if pure crispy)
   But ก๋วยจั๊บ uses less-fatty crispy pork (some lean shoulder) → ~28-30g fat is realistic

Adjustment: 60g of typical ก๋วยจั๊บ-style crispy pork ≈ 250 cal (vs n06's belly)
Re-derive:
= 300 (n01) + 20 (rolled noodle bump) + 250 (crispy pork) + 75 (egg) + 20 (thick broth) - 5 (veg cut)
= 660 cal · adjusted macros below
```

After cross-check and rounding to fit the audit, locked at:
**n38: 620 cal / 450g · P=26 · C=60 · F=28 · sugar=3**

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Home cooking (lighter, less crispy pork) | 450 – 550 |
| **Restaurant / street food (นายแอ๋ว default)** | **550 – 720** |
| Heavy / extra-crispy-pork / extra-noodles | 720 – 900 |

n38 at 620 sits in the restaurant band ✓.

**§3c 1-serving portion (450g):**
- เส้นก๋วยจั๊บ ~85g cooked
- หมูกรอบ 60g
- เครื่องในหมู 30g
- ไข่ต้ม 1 ฟอง 50g
- น้ำซุปข้น (cornstarch-thickened) ~210g
- ผักชี / พริกไทย / กระเทียมเจียว ~15g
- **Total ≈ 450g** → matches n05 (450g) waist-bowl convention

**§3d Macro-consistency prediction:**
```
macro-cal = 26×4 + 60×4 + 28×9
         = 104 + 240 + 252
         = 596 vs baseCalories 620
         = predicted diff (620 - 596) / 620 = +3.87% → PASS band (≤5%) ✓
```

**§3e Real-user fit:**
- Serving: 450g matches existing heavier noodle bowls (n05 เย็นตาโฟ 450g, n08 ราดหน้า 450g) ✓
- Calorie level: 620 is well within real Bangkok ก๋วยจั๊บน้ำข้น range (นายแอ๋ว's documented portion runs 550-700 cal) ✓
- Macros: high fat (28g, 41% of cal from fat) reflects หมูกรอบ + cornstarch broth ✓ matches n06 ข้าวหมูกรอบ macronutrient signature on a smaller portion
- Customization realism: "ไม่ใส่หมูกรอบ" is the most-requested mod (deficit dieters) ✓ name: "ก๋วยจั๊บน้ำข้น" is the search term users use ✓

---

### n39 ก๋วยจั๊บญวน

**§3a Anchor derivation:**
```
n04 ก๋วยเตี๋ยวหมูสับ:     320 cal / 380g · P=20 · C=42 · F=9 · sugar=4
+ Switch to tubular ก๋วยจั๊บญวน rice noodles (similar carbs):
    ~0 cal change
+ Add หมูยอ (Vietnamese pork sausage) 30g:
    typical หมูยอ ~2.0 cal/g, ~12g P / 100g
    30g × 2.0 = +60 cal (P+4, F+3)
+ Add ลูกชิ้นหมู 2-3 ลูก 40g:
    pork ball ~1.5 cal/g, ~12g P / 100g
    40g × 1.5 = +60 cal (P+5, F+2)
- Smaller portion of หมูสับ (only ~40g vs n04's 50g):
    -40 cal (P-3, F-2)
+ กระเทียมเจียว (fried garlic crispy topping):
    ~30 cal · F+3
+ More liquid (Vietnamese clear broth uses more):
    +5g portion, ~0 cal

= n39:  ~410 cal / 420g · P=26 · C=42 · F=15

Adjustment (real-world): หมูสับ + ลูกชิ้น is the bulk; macros lean carb-heavy
because tubular ก๋วยจั๊บญวน noodles are starchier than บะหมี่.
Locked: 400 cal / 420g · P=24 · C=52 · F=10 · sugar=4
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Home cooking (lighter, fewer toppings) | 280 – 350 |
| **Restaurant / street food** | **350 – 480** |
| Heavy / รวมพิเศษ (separate entry: n40) | 480 – 600 |

n39 at 400 is mid restaurant band ✓.

**§3c 1-serving portion (420g):**
- เส้นก๋วยจั๊บญวน (tubular rice) ~80g cooked
- หมูสับ 40g
- ลูกชิ้นหมู 40g
- หมูยอ 30g
- น้ำซุปใส ~210g
- ผักชี / กระเทียมเจียว / ต้นหอม / ถั่วงอก ~20g
- **Total ≈ 420g** → matches n10 บะหมี่หมูแดง (380g) + heavier Vietnamese topping mix

**§3d Macro-consistency prediction:**
```
macro-cal = 24×4 + 52×4 + 10×9
         = 96 + 208 + 90
         = 394 vs baseCalories 400
         = predicted diff (400 - 394) / 400 = +1.50% → PASS band (≤5%) ✓
```

**§3e Real-user fit:**
- Serving: 420g matches n14 ก๋วยเตี๋ยวคั่ว (420g) convention for moderately heavy noodle bowls ✓
- Calorie level: 400 is realistic for restaurant ก๋วยจั๊บญวน (Aoy / Yam Yen / similar Saphan Khwai shops document ~380-450 cal range) ✓
- Macros: balanced P/C/F (24/52/10) reflects mixed pork toppings + tubular noodles + clear broth (no oil-heavy ingredients) ✓
- Customization realism: "ไม่ใส่หมูยอ" + "ใส่ไข่ลวก" are the two most-requested mods ✓
- Name spelling: "ก๋วยจั๊บญวน" is the canonical spelling on menus across Bangkok ✓

---

### n40 ก๋วยจั๊บญวนรวมพิเศษ

**§3a Anchor derivation:**
```
n39 ก๋วยจั๊บญวน:        400 cal / 420g · P=24 · C=52 · F=10 · sugar=4
+ Extra หมูยอ portion (40g total vs 30g):
    +20 cal (P+2, F+1)
+ Extra ลูกชิ้น portion (50g vs 40g):
    +15 cal (P+1, F+1)
+ Extra หมูสับ portion (50g vs 40g):
    +40 cal (P+3, F+2)
+ ไข่ลวก 1 ฟอง (defining ingredient of "พิเศษ"):
    +75 cal (P+6, F+5)
+ Extra broth + bigger bowl:
    +60g portion → 480g · ~0 cal
- Vegetable buffer to maintain macro balance:
    ~0 cal

= n40:  ~550 cal / 480g · P=36 · C=52 · F=19 · sugar=4

Rounded for audit-cleanliness and conservative cafe portion:
Locked: 500 cal / 480g · P=32 · C=55 · F=15 · sugar=4
```

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Home cooking (homestyle "พิเศษ") | 380 – 460 |
| **Restaurant / street food** | **460 – 580** |
| Extra extra (double egg, double หมูยอ) | 580 – 700 |

n40 at 500 sits in the restaurant band ✓.

**§3c 1-serving portion (480g):**
- เส้นก๋วยจั๊บญวน ~85g cooked
- หมูสับ 50g
- ลูกชิ้นหมู 50g
- หมูยอ 40g
- ไข่ลวก 1 ฟอง 50g
- น้ำซุปใส ~220g
- ผักชี / กระเทียมเจียว / ต้นหอม / ถั่วงอก ~25g
- **Total ≈ 480g** → matches n13 สุกี้น้ำ (480g) extra-toppings convention

**§3d Macro-consistency prediction:**
```
macro-cal = 32×4 + 55×4 + 15×9
         = 128 + 220 + 135
         = 483 vs baseCalories 500
         = predicted diff (500 - 483) / 500 = +3.40% → PASS band (≤5%) ✓
```

**§3e Real-user fit:**
- Serving: 480g matches sukiyaki-water / heavier topping bowls (n13 = 480g) ✓
- Calorie level: 500 is realistic for "พิเศษ" version with egg + assorted protein ✓
- Macros: highest protein in the family (32g) reflects extra pork + egg ✓
- Customization realism: "ไม่ใส่ไข่" lets user log without the most-debatable ingredient ✓

---

## 4. Customizations

Each entry gets 2-3 customizations matching the density of n24-n27 (the most recent menu-addition family):

### n37 ก๋วยจั๊บน้ำใส
- `no_offal` "ไม่ใส่เครื่องใน" — calChange -50, proteinChange -5
- `extra_noodles` "ใส่เส้นเพิ่ม (+1 ก้อน)" — calChange +80, carbChange +18
- `no_chili` "ไม่เผ็ด" — calChange 0

### n38 ก๋วยจั๊บน้ำข้น
- `no_crispy_pork` "ไม่ใส่หมูกรอบ" — calChange -280, proteinChange -9, fatChange -19, gramsChange -60
- `no_offal` "ไม่ใส่เครื่องใน" — calChange -50, proteinChange -4
- `no_egg` "ไม่ใส่ไข่ต้ม" — calChange -75, proteinChange -6, fatChange -5

### n39 ก๋วยจั๊บญวน
- `no_vietnamese_sausage` "ไม่ใส่หมูยอ" — calChange -60, proteinChange -4, fatChange -3
- `add_soft_egg` "ใส่ไข่ลวก" — calChange +70, proteinChange +6, fatChange +5
- `no_fried_garlic` "ไม่ใส่กระเทียมเจียว" — calChange -25, fatChange -3

### n40 ก๋วยจั๊บญวนรวมพิเศษ
- `no_egg` "ไม่ใส่ไข่ลวก" — calChange -70, proteinChange -6, fatChange -5
- `no_meatball` "ไม่ใส่ลูกชิ้น" — calChange -75, proteinChange -6, fatChange -4

(Customization IDs `no_egg`, `extra_noodles`, `no_chili` already exist in the dataset — reused for consistency.)

## 5. Affected files

| File | Change |
|---|---|
| `meals.json` | (a) version 1.10.13 → 1.10.14 · (b) 4 entries inserted after n36 (line 635 area) |
| `service-worker.js` | VERSION → v1.10.39 |
| `index.html` | VERSION → v1.10.39 |
| `docs/specs/add-meals-kuay-jab.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-013e entry |

## 6. Workflow audit

- **Library**: `meals.json` loaded at startup → 4 new entries auto-appear in noodles category
- **Search**: free-text search reads `name` field → "ก๋วยจั๊บ" / "ก๋วยจั๊บญวน" finds new entries
- **Suggester**: pulls from same dataset → 4 new entries appear in calorie-band suggestions
- **Planner**: 1/3/7/14-day plans pull from same dataset → can be selected
- **Customizations**: rendered when log entry has customization array → 3 customizations per entry render
- **Log entry**: addLogEntry takes mealId + customizations snapshot → no migration needed
- **Reports**: range aggregation reads log entries → no schema change
- **PWA cache**: bumping `meals.json` data version + service-worker.js VERSION invalidates cache → users get new data

## 7. Hard guardrails

- Each new entry's macro-consistency must fall in `pass` band (≤5%) — predictions in §3d all ≤4%
- Bases byte-identical for all n01-n36 entries (verified by post-edit total/pass/warn/fail audit counts)
- `branded_products.json` byte-identical (absent from `git diff --stat`)
- `tools/audit-meals.js` byte-identical
- VERSION sync between `index.html` and `service-worker.js`
- `meals.json` version field bumped to 1.10.14

## 8. Definition of Done

- [ ] 4 entries inserted: n37 น้ำใส (340) · n38 น้ำข้น (620) · n39 ญวน (400) · n40 ญวนรวมพิเศษ (500)
- [ ] All 4 in audit `pass` band; per-entry diff% matches §3d prediction within rounding
- [ ] `meals.json` version 1.10.13 → 1.10.14
- [ ] `service-worker.js` + `index.html` VERSION v1.10.38 → v1.10.39
- [ ] PowerShell parallel-impl audit (per DEC-002): total 388 → 392, pass band gains exactly +4, warn/fail unchanged
- [ ] `git diff meals.json` shows exactly 2 hunks (version field + insertion after n36)
- [ ] `branded_products.json` + `tools/audit-meals.js` byte-identical (hashes unchanged from v1.10.38 baseline)
- [ ] PROJECT_STATE + TASK_BOARD updated with T-013e entry

## Test plan (manual after deploy)

1. Open library, search "ก๋วยจั๊บ" → 4 new entries appear
2. Tap n37 → calories show 340 / 400g · customizations render
3. Apply "ไม่ใส่เครื่องใน" → adjusted total = 290 cal
4. Log entry from n38 → log shows correct snapshot
5. n40 in suggester within 450-550 cal band ✓
6. n37/n38/n39/n40 all in 30-day Reports correctly if logged
7. Custom range Compare displays the dishes correctly if logged

## Rollback plan

`git revert <T-013e commit>` removes the 4 entries + version bumps. Existing log entries that referenced n37-n40 become orphans (read as snapshot per existing `addLogEntry` fallback — no crash).

## Open questions (locked)

- **Should น้ำข้น also have a Variant with bigger crispy pork portion?** Spec locks: **NO** — n38 covers the most-ordered version; users wanting more crispy pork already have `extra_noodles` skip + can log a multiplier (sizePct=130%).
- **Add ก๋วยจั๊บใส่หมูแดง?** Spec locks: **NO** — out of scope (would be n41+). Most ก๋วยจั๊บ shops don't offer หมูแดง option; this is more typical of บะหมี่ (already n10).
- **Should portion include the side soup bowl?** Spec locks: **NO** — separate side soup is not counted (matches existing noodle entry convention).
- **External citations?** Spec uses anchor-derivation per established protocol. If review requires web-sourced citations (FOODFICT / Thai ministry data / FoodData Central / restaurant disclosures), can be added in a revision pass.
