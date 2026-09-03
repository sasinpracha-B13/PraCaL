# T-024 — Nutrient schema: saturated fat · fiber · sodium · alcohol

**Status:** draft — **awaiting scope-gate approval** (no implementation started)
**Owner:** Architecture (this spec) → Data/Domain + DEV Integration (implementation)
**Governed by:** [DEC-004](../decisions/DEC-004-unknown-nutrient-direction.md) (absent ≠ zero; fail-safe lean direction) · [DEC-003](../decisions/DEC-003-calorie-safety-direction.md)
**Depends on:** [T-023](T-023-csv-addon-double-count-fix.md) (the export must be trustworthy before it carries more columns)
**Related:** T-022 (`docs/AI-HANDOFF-BRIEF.md` — the consultant loop this feeds) · [`menu-addition-protocol.md`](menu-addition-protocol.md)

> Adds four optional nutrients to the food schema. The driving question — *why is LDL 162 when the diet log looks clean?* — is unanswerable from the data the app records today, because the app tracks total fat but not its type, and does not track fiber at all.

---

## 1. Why — what the 132-day export can and cannot answer

Verified against `pracal_เบย์_all_to_2026-09-03.csv` (132 consecutive days, 2026-04-25 → 2026-09-03, 598 item rows):

| what the current schema shows | value | verdict |
|---|---|---|
| mean intake | 1,962 kcal/day (recent 27 d: 1,867) | in range |
| mean protein | 155.9 g/day = 1.94 g/kg at 71.6 kg | good |
| mean total fat | 57.6 g/day = **26.4% of energy** | **not high** |
| weight trajectory | 77.5 → 71.6 kg | working |

So the existing four macros **rule out** "too many calories" and "too much total fat" — and then run out of things to say. The variables that would carry the answer are exactly the ones not recorded. What the food *names* hint at, which the schema cannot quantify:

| pattern (day-coverage over 132 days) | days |
|---|---|
| ≥1 clearly high-saturated-fat item (กะทิ/ทอด/ขาหมู/ชีส/ข้าวมันไก่ …) | **66** |
| coconut-milk dishes (กะทิ/เขียวหวาน/มัสมั่น) | 18 |
| ข้าวมันไก่ | 17 |
| ขาหมู/หมูกรอบ/ไส้กรอก/เล้ง | 29 |
| **fish** (excluding shrimp/crab/shellfish) | **5** |
| **fruit** | **4** |
| **oats / beans / nuts / whole grain** | **1** |

Five fish days in 132 is roughly one every 26 days. Fruit and whole-grain/legume coverage is effectively nil. That is a fiber and fat-quality story the app currently renders as a clean 1,867 kcal day — which is precisely the blind spot this task closes.

**Non-goal:** this task does not diagnose anything or set clinical targets. It makes the data capable of supporting that conversation elsewhere.

## 2. Schema

Four **optional** fields, added to every food-shaped object. Per DEC-004 rule 1, an unknown field is **omitted**, never `0`/`null`.

```jsonc
{
  "satFat_g":  0,      // saturated fat, grams per base serving   (subset of fat_g; satFat_g <= fat_g)
  "fiber_g":   0,      // dietary fiber, grams per base serving   (subset of carbs_g; fiber_g <= carbs_g)
  "sodium_mg": 0,      // sodium, milligrams per base serving
  "alcohol_g": 0,      // ethanol, grams per base serving         (7 kcal/g)
  "nutrientSource": "label" | "derived" | "estimated"   // DEC-004 rule 4 — present only when any of the four is
}
```

`nutrientSource` marks the *class of fact*, not the value: `label` = read from a nutrition label or an authoritative table · `derived` = computed from an existing field by the §4 rules · `estimated` = AI or human judgement. It exists so a later data pass can find and upgrade the weak values, and so audits never treat a derived number as evidence.

**Objects that need the fields:**

| object | count | notes |
|---|---|---|
| `meals.json` entries | 408 | the bulk of the work — see §4 |
| `branded_products.json` entries | 88 | labels carry satFat/sodium/fiber directly — highest-quality source |
| `ADDONS` ([index.html:749](../../index.html)) | 15 | hand-authored; small |
| `SPECIAL_MEAL_PRESETS` sizes ([index.html:~790](../../index.html)) | ~20 sizes | aggregate estimates; `estimated` |
| `SPECIAL_MEAL_ADDONS` ([index.html:965](../../index.html)) | — | same |
| `meal.customizations[]` deltas | many | `satFatChange`, `fiberChange`, `sodiumChange` alongside the existing `calChange`/`fatChange`; omit where unknown |
| entry `snapshot` objects | runtime | AI/OCR/custom logs freeze a snapshot; new fields flow in from the Netlify functions (§5) |

**Backfill reach — measured, not assumed.** `findMeal()` resolves from `state.preloadedMeals` + branded + scanned + `state.customMeals` ([index.html:1500](../../index.html)), and `calcEntryTotals` prefers `entry.snapshot` only when one exists — library logs are saved with `snapshot: null` ([index.html:10003](../../index.html)). **So filling `meals.json` retroactively enriches every past log that points at a library meal, at zero migration cost.** Of the 132-day export, **61% of logged calories** match a name in `meals.json`/`branded_products.json`. The largest single un-matched item is `Baam` (128 of 132 days, 30,597 kcal — the user's protein drink, a *custom meal*), which is also live-resolved: editing that one custom entry enriches all 128 days. Only true AI/OCR one-offs stay frozen.

`alcohol_g` additionally closes a **known open defect**: [TASK_BOARD.md:118](../../TASK_BOARD.md) records that `audit-meals.js` fails beer entries because `P×4 + C×4 + F×9` cannot reconcile with a calorie count that is mostly ethanol. With `alcohol_g` the check becomes `P×4 + C×4 + F×9 + A×7`.

## 3. Compliance with DEC-004

| DEC-004 rule | how T-024 satisfies it |
|---|---|
| 1 — absent ≠ zero | fields omitted when unknown; readers use `!= null`. An audit rule bans `|| 0` on these four. |
| 2 — coverage disclosed | every total renders as `12 g (จาก 4/6 รายการ)`; below 60% of the day's calories it renders as `ข้อมูลไม่ครบ` instead of a number |
| 3 — fail-safe lean | satFat/sodium/alcohol lean **high**; fiber leans **low** (§4) |
| 4 — derived marked | `nutrientSource` |
| 5 — no new gating | ring, streaks, planner, suggester, reports keep running on the original four macros; these four are read-outs only |

## 4. Deriving values — honest cost, and it differs sharply per nutrient

### 4a. `satFat_g` — derivable, two-tier

Saturated fat is a fraction of a number the schema already has (`fat_g`). Proposed baseline by `category`, overridden by cooking-method keywords in `name` (the override wins; leaning high per DEC-004):

| tier | key | ratio of `fat_g` | rationale |
|---|---|---|---|
| override | กะทิ / เขียวหวาน / มัสมั่น / แกงเผ็ด / บัวลอย | **0.70** | coconut fat is ~85–90% saturated |
| override | ชีส / cheese / ครีม / เค้ก / ทีรามิสุ / ไอศ | **0.60** | dairy fat |
| override | ขาหมู / หมูกรอบ / เบคอน / ไส้กรอก / สามชั้น | **0.42** | fatty pork cuts |
| override | ทอด / ฟรายส์ / นักเก็ต / กรอบ | **0.45** | Thai street frying is largely palm oil (~50% sat) |
| override | ต้ม / ย่าง / นึ่ง / ยำ / น้ำใส | **0.28** | no added frying fat |
| category | `fastfood`, `bakery`, `snacks` | 0.45 | palm/butter-heavy |
| category | `mains`, `rice_dishes` | 0.38 | mixed pork/chicken default |
| category | `noodles`, `soups`, `appetizers` | 0.33 | |
| category | `salads`, `healthy` | 0.28 | |
| category | `drinks`, `milk_drinks`, `coffee_drinks` | 0.55 | dairy/creamer dominated |
| category | `fruits` | 0.15 | |

Every value so produced is `nutrientSource: "derived"`. Branded products override with label values (`label`).

**Known weakness, stated up front:** `category` is a poor predictor inside `mains` (131 entries — a grilled fish and a green curry both live there). The keyword overrides carry most of the accuracy; entries matching no override should be reviewed by hand rather than trusted to the category default. Expect a review pass over `mains` + `fastfood` (191 entries) regardless.

### 4b. `fiber_g` — **not derivable**, needs real data

Fiber is a function of vegetable/legume/whole-grain content, which `protein_g`/`carbs_g`/`fat_g` do not encode: white rice and brown rice are near-identical on the existing four fields and differ ~4× in fiber. There is no honest derivation. Options:

| approach | cost | quality |
|---|---|---|
| conservative per-category floor (leaning low per DEC-004) | low | poor but never flattering — a placeholder, not an answer |
| hand-author 408 entries from a Thai food composition table | high | good |
| hand-author the ~80 entries covering most logged calories, leave the rest absent | **medium** | **good where it matters; DEC-004 coverage display makes the gaps visible** ← recommended |

The third option is the reason DEC-004 rule 2 exists: partial coverage is shippable when it is *disclosed*. Recommend authoring fiber for the entries that actually appear in the log (the export's 147 distinct names, of which ~60 carry most of the calories) and leaving the long tail absent.

### 4c. `sodium_mg` — label-driven, lowest priority

Accurate for the 88 branded products (printed on the label). For restaurant/street food it is close to unknowable without measurement. **Not related to the LDL question** — recommend it ships last, or is dropped from scope if effort is tight.

### 4d. `alcohol_g` — trivial and highest value per unit effort

Affects a handful of entries. `เบียร์ (1 ขวด 330ml)` and the two beer-bearing special presets. Unblocks the audit fix and makes the 27 drinking days (7.4% of all calories from beer alone, 19,095 kcal over the period) separable from food calories in every report.

## 5. Netlify functions

- `netlify/functions/estimate-meal.js` (Haiku) — extend the response schema and prompt with the four fields; instruct that **unknown must be omitted, not zeroed** (DEC-004), and apply the lean directions. Tag output `nutrientSource: "estimated"`.
- `netlify/functions/extract-nutrition.js` (Sonnet, OCR) — Thai nutrition labels print ไขมันอิ่มตัว / ใยอาหาร / โซเดียม directly. This is the **highest-quality inbound source** in the whole system; tag `label`.
- Both — extend the macro-consistency check to `P×4 + C×4 + F×9 + A×7`, and add `satFat_g <= fat_g`, `fiber_g <= carbs_g` as hard validations.

## 6. CSV export

Four new columns, plus the row-type column deferred from [T-023 §7](T-023-csv-addon-double-count-fix.md):

```
วันที่, ประเภทแถว, ชื่ออาหาร, จำนวน, ขนาด (%), แคลอรี่, โปรตีน(g), คาร์บ(g), น้ำตาล(g), ไขมัน(g),
        ไขมันอิ่มตัว(g), ใยอาหาร(g), โซเดียม(mg), แอลกอฮอล์(g), น้ำหนัก(kg)
```

`ประเภทแถว` ∈ `รายการ` / `ส่วนเสริม` / `สรุปวัน` — ends the ambiguity that made an analyst's naive summation risky. An unknown nutrient exports as an **empty cell**, never `0` (DEC-004 rule 1); `สรุปวัน` shows the covered subtotal, and a coverage column or note states how much of the day it covers.

## 7. Proposed phasing

| sub-task | scope | ships |
|---|---|---|
| **T-024a** | schema + `alcohol_g` on the affected entries + `audit-meals.js` alcohol-aware check + CSV columns & `ประเภทแถว` | small, self-contained, fixes a standing audit defect |
| **T-024b** | `satFat_g` across `meals.json` + branded, per §4a, with a hand-review pass over `mains`/`fastfood` | the LDL-relevant half |
| **T-024c** | `fiber_g` for the ~80 highest-frequency entries per §4b | the other LDL-relevant half |
| **T-024d** | UI surfaces (day detail, reports) + coverage display per DEC-004 rule 2 | makes it visible |
| **T-024e** | `sodium_mg` (label-driven only) | optional / last |

Netlify function changes ride with T-024b (the first sub-task whose values must round-trip through AI).

## 8. Audit plan

- `tools/audit-meals.js` — extend: `satFat_g <= fat_g`, `fiber_g <= carbs_g`, alcohol-aware calorie reconciliation, `nutrientSource` present whenever any of the four is, and a scan for `|| 0` reads of these fields in `index.html`.
- `tools/audit-csv-addon-rows.js` — extend to the new columns once §6 lands.
- Coverage report — % of `meals.json` carrying each field, and % of the **last 30 days of logged calories** covered, which is the number that decides whether a total is worth displaying.

## 9. Open questions for the scope gate

1. **Scope of `sodium_mg`** — keep (T-024e) or drop? It is the only one of the four with no bearing on the driving question.
2. **Fiber breadth** — the recommended ~80 entries, or commit to all 408?
3. **`nutrientSource` granularity** — one field per entry (proposed) or per nutrient? Per-entry is simpler but coarse when a branded item has a label sodium and a derived satFat.
4. **Should `satFat_g` eventually get a daily target?** DEC-004 rule 5 defers this deliberately; confirm it stays deferred.
5. **Re-baseline the analysis?** Re-running the §1 numbers 8–12 weeks after T-024b/c ship would give a genuine before/after on fat quality and fiber. Worth registering as its own task now, or later?

## 10. Definition of done — **not started**

This spec is `draft`. No `meals.json`, `index.html`, or Netlify function has been touched for T-024. Implementation begins only after the scope gate resolves §9.
