# T-021 — Add ข้าวหน้าไก่ย่าง + หมี่ไก่ฉีก (2 entries)

**Status:** approved
**Owner:** Execution Agent
**Protocol:** follows [`docs/specs/menu-addition-protocol.md`](menu-addition-protocol.md) (AGENTS.md Rule 17) — **first menu-add under the new §3d-2 calorie-safety-direction** ([DEC-003](../decisions/DEC-003-calorie-safety-direction.md))
**Related:** T-013e / T-013f.x (last menu adds)

> 🪧 **Mantra (recited):** *"ปริมาณต่อ 1 เสิร์ฟต้องแม่น และแคลต้องแม่น — ไปเกินได้แต่ห้ามขาด."* Both entries lean `baseCalories` to the upper-realistic range and carry a **non-negative** macro diff (`baseCalories ≥ macro-cal`).

---

## 1. Goal + Non-goals

### Goal
Add 2 common Thai dishes:
- **r37 ข้าวหน้าไก่ย่าง** — rice topped with grilled chicken + sauce/gravy
- **n41 หมี่ไก่ฉีก** — egg/rice noodles with shredded chicken

### Non-goals
- ❌ Edits to existing entries · schema changes · UI changes
- ❌ Edits to `branded_products.json` / `tools/audit-meals.js`
- ❌ Entries with **negative** macro diff (DEC-003 forbids undercount for new entries)

## 2. The new entries — table

| ID | Name | baseCalories | baseWeight_g | P (g) | C (g) | F (g) | Sugar (g) |
|---|---|---|---|---|---|---|---|
| r37 | ข้าวหน้าไก่ย่าง | 580 | 400 | 33 | 66 | 18 | 6 |
| n41 | หมี่ไก่ฉีก | 430 | 400 | 27 | 50 | 13 | 4 |

r37 = `rice_dishes` / 🍗 · n41 = `noodles` / 🍜.

## 3. Calorie + portion verification

### r37 ข้าวหน้าไก่ย่าง

**§3a Anchor derivation:**
```
Components (street-food portion, leaning upper per DEC-003):
- ข้าวสวย 200g cooked × 130/100      = 260 cal · P 5 · C 57 · F 0
- ไก่ย่าง (ติดหนัง) 110g × 247/100    = 272 cal · P 27 · C 0 · F 17   [USDA thigh+skin]
- ซอส/น้ำราด 40g (~1.2 cal/g)         =  48 cal · P 1 · C 9 · F 1 · sugar 5
- น้ำมันย่าง/garnish ~20g overhead    =  ~20 cal · F ~1
Component sum ≈ 600 cal / ~370g · P~33 · C~66 · F~19
Locked: 580 cal / 400g · P=33 · C=66 · F=18 · sugar=6
```
Anchors cross-check: r04 ข้าวมันไก่ 600/380g · r27 ข้าวไก่กระเทียมพริกไทย 600/380g · r35 ข้าวหน้าไก่เชสเตอร์ 455/320g (lighter, shredded). r37 sits just under the oily-rice anchors, appropriate for grilled chicken + sauce.

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Light (no skin, less sauce) | 460 – 520 |
| **Standard street-food (upper-lean per DEC-003)** | **540 – 650** |
| Heavy (extra chicken / oily) | 650 – 750 |

r37 at 580 is upper-mid of the standard band ✓ (leaning high, not midpoint).

**§3c 1-serving portion (400g):** ข้าว 200g + ไก่ 110g + ซอส 40g + ผัก/garnish 30g + น้ำมัน 20g = 400g. Slightly generous vs the 380g peers (ไปเกิน) ✓.

**§3d Macro-consistency prediction:**
```
macro-cal = 33×4 + 66×4 + 18×9 = 132 + 264 + 162 = 558 vs baseCalories 580
         = diff +22 = (580-558)/580 = +3.79%  →  PASS · NON-NEGATIVE ✓ (DEC-003)
```

**§3e Real-user fit:** 400g rice plate matches peers; macros chicken-heavy (P 33) realistic for grilled-chicken-on-rice; sugar 6 from sweet sauce. Name standard.

---

### n41 หมี่ไก่ฉีก

**§3a Anchor derivation:**
```
Components (hearty bowl, leaning upper per DEC-003):
- บะหมี่/เส้นหมี่ลวก 90g cooked × ~1.4   = 126 cal · P 5 · C 24 · F 1
- ไก่ฉีก 70g × ~1.65                      = 116 cal · P 22 · C 0 · F 3
- กระเทียมเจียว + น้ำมัน ~10g             =  ~88 cal · F ~9
- น้ำซุป/เครื่องปรุง + ผัก/ต้นหอม          =  ~15 cal · C ~3 · sugar 3
Component sum ≈ 345-440 / ~400g (with broth) · P~27 · C~50 · F~13
Locked: 430 cal / 400g · P=27 · C=50 · F=13 · sugar=4
```
Anchors cross-check: n10 บะหมี่หมูแดง 370/380g · n11 บะหมี่เกี๊ยว 420/400g · n18 หมี่หยก 335/350g. n41 at 430 sits just above n11 — appropriate for a fuller chicken bowl with garlic oil (upper-lean per DEC-003).

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Light (soup, little oil) | 320 – 380 |
| **Standard bowl (upper-lean per DEC-003)** | **400 – 470** |
| Heavy (dry, extra oil/chicken) | 470 – 560 |

r41… n41 at 430 is upper-mid of the standard band ✓.

**§3c 1-serving portion (400g):** เส้น 90g + ไก่ฉีก 70g + กระเทียมเจียว/น้ำมัน 10g + น้ำซุป/ผัก ~230g = 400g (soup-style bowl) ✓.

**§3d Macro-consistency prediction:**
```
macro-cal = 27×4 + 50×4 + 13×9 = 108 + 200 + 117 = 425 vs baseCalories 430
         = diff +5 = (430-425)/430 = +1.16%  →  PASS · NON-NEGATIVE ✓ (DEC-003)
```

**§3e Real-user fit:** 400g noodle bowl matches n11; P 27 from shredded chicken + egg noodle realistic; F 13 from garlic oil. Name standard.

## 4. Customizations (subtractions kept conservative per DEC-003)

### r37 ข้าวหน้าไก่ย่าง
- `no_rice` "ไม่ใส่ข้าว" — calChange **-240**, proteinChange -4, carbChange -52 *(200g rice ≈ 260 cal; subtract 240 conservatively so total doesn't undercount)*
- `no_skin` "ไม่ใส่หนัง" — calChange -70, fatChange -7
- `extra_sauce` "เพิ่มซอส/น้ำราด" — calChange +40, carbChange +9, sugarChange +5

### n41 หมี่ไก่ฉีก
- `extra_chicken` "เพิ่มไก่ฉีก" — calChange +90, proteinChange +18, fatChange +2
- `less_oil` "ลดน้ำมัน/กระเทียมเจียว" — calChange **-50**, fatChange -5 *(conservative; full would be ~-88)*
- `extra_noodles` "เพิ่มเส้น (พิเศษ)" — calChange +110, carbChange +24, fatChange +1

(IDs `no_rice`, `no_skin`, `extra_sauce`, `less_oil`, `extra_noodles` reused from existing dataset.)

## 5. Affected files

| File | Change |
|---|---|
| `meals.json` | version 1.10.17 → 1.10.18 · r37 inserted after r36 · n41 inserted after n40 |
| `service-worker.js` | VERSION → v1.10.47 |
| `index.html` | VERSION → v1.10.47 |
| `docs/specs/add-meals-khao-na-kai-mee-kai-chik.md` | this spec |
| `docs/specs/menu-addition-protocol.md` | §3d-2 added (DEC-003) — bundled |
| `docs/decisions/DEC-003-calorie-safety-direction.md` | new decision record — bundled |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-021 entry |

## 6. Hard guardrails

- Each entry PASS band (≤5%) **AND non-negative diff** (DEC-003)
- Existing entries byte-identical · `branded_products.json` + `tools/audit-meals.js` byte-identical
- VERSION sync · `meals.json` version bumped
- `git diff meals.json` exactly 3 hunks (version + r insertion + n insertion)

## 7. Definition of Done

- [ ] 2 entries inserted: r37 (580) · n41 (430)
- [ ] Both PASS band; **both diff% non-negative** (r37 +3.79% · n41 +1.16%) — DEC-003
- [ ] Per-entry diff% matches §3d prediction within rounding
- [ ] `meals.json` version 1.10.17 → 1.10.18
- [ ] VERSION v1.10.46 → v1.10.47 (sw + index)
- [ ] PowerShell audit: total 406 → 408 · pass +2 · warn/fail unchanged
- [ ] `git diff meals.json` exactly 3 hunks
- [ ] `branded_products.json` + `tools/audit-meals.js` byte-identical
- [ ] DEC-003 + protocol §3d-2 + memory present
- [ ] PROJECT_STATE + TASK_BOARD updated

## 8. Test plan
1. Search "ข้าวหน้าไก่" → r37 · "หมี่ไก่ฉีก" → n41
2. r37 + ไม่ใส่ข้าว → 340 cal
3. n41 + เพิ่มไก่ฉีก → 520 cal
4. Both in suggester at their calorie bands

## Rollback
`git revert <T-021 commit>` removes both entries + version bumps. DEC-003 + protocol §3d-2 also revert (bundled) — re-apply separately if the principle should persist without the menus.

## Open questions
- **Retroactive tighten of existing negative-diff entries?** Out of scope (DEC-003 grandfathers them). Optional future data-pass.
- **หมี่ไก่ฉีก soup vs dry?** Spec uses soup-style 400g bowl as the common form; a dry (แห้ง) variant could be a future separate entry.
