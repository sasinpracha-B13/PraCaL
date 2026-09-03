# T-024 — Nutrient schema: saturated fat · fiber · alcohol

> **Note on the filename:** it still says `sodium` because `sodium_mg` was in scope when this spec was written. It was **cut at the scope gate** (§9 decision 1). The filename is kept so existing links do not break; the field does not exist anywhere in the implementation.

**Status:** approved — scope gate resolved 2026-09-03 (see §9). Implementation proceeding by sub-task.
**Owner:** Architecture (this spec) → Data/Domain + DEV Integration (implementation)
**Governed by:** [DEC-004](../decisions/DEC-004-unknown-nutrient-direction.md) (absent ≠ zero; fail-safe lean direction) · [DEC-003](../decisions/DEC-003-calorie-safety-direction.md)
**Depends on:** [T-023](T-023-csv-addon-double-count-fix.md) (the export must be trustworthy before it carries more columns)
**Related:** T-022 (`docs/AI-HANDOFF-BRIEF.md` — the consultant loop this feeds) · [`menu-addition-protocol.md`](menu-addition-protocol.md)

> Adds three optional nutrients to the food schema (four were proposed; `sodium_mg` was cut at the gate). The driving question — *why is LDL 162 when the diet log looks clean?* — is unanswerable from the data the app records today, because the app tracks total fat but not its type, and does not track fiber at all.

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

Three **optional** fields, added to every food-shaped object. Per DEC-004 rule 1, an unknown field is **omitted**, never `0`/`null`.

```jsonc
{
  "satFat_g":  0,      // saturated fat, grams per base serving   (subset of fat_g; satFat_g <= fat_g)
  "fiber_g":   0,      // dietary fiber, grams per base serving   (subset of carbs_g; fiber_g <= carbs_g)
  "alcohol_g": 0,      // ethanol, grams per base serving         (7 kcal/g)
  "nutrientSource": "label" | "derived" | "estimated"   // DEC-004 rule 4 — present only when any of the three is
}
```

`nutrientSource` marks the *class of fact*, not the value: `label` = read from a nutrition label or an authoritative table · `derived` = computed from an existing field by the §4 rules · `estimated` = AI or human judgement. It exists so a later data pass can find and upgrade the weak values, and so audits never treat a derived number as evidence.

**Objects that need the fields:**

| object | count | notes |
|---|---|---|
| `meals.json` entries | 408 | the bulk of the work — see §4 |
| `branded_products.json` entries | 88 | labels carry satFat and fiber directly — highest-quality source |
| `ADDONS` ([index.html:749](../../index.html)) | 14 | hand-authored; small |
| `SPECIAL_MEAL_PRESETS` sizes ([index.html:~790](../../index.html)) | ~20 sizes | aggregate estimates; `estimated` |
| `SPECIAL_MEAL_ADDONS` ([index.html:965](../../index.html)) | — | same |
| `meal.customizations[]` deltas | many | `satFatChange`, `fiberChange`, `alcoholChange` alongside the existing `calChange`/`fatChange`; omit where unknown |
| entry `snapshot` objects | runtime | AI/OCR/custom logs freeze a snapshot; new fields flow in from the Netlify functions (§5) |

**Backfill reach — measured, not assumed.** `findMeal()` resolves from `state.preloadedMeals` + branded + scanned + `state.customMeals` ([index.html:1500](../../index.html)), and `calcEntryTotals` prefers `entry.snapshot` only when one exists — library logs are saved with `snapshot: null` ([index.html:10003](../../index.html)). **So filling `meals.json` retroactively enriches every past log that points at a library meal, at zero migration cost.** Of the 132-day export, **61% of logged calories** match a name in `meals.json`/`branded_products.json`. The largest single un-matched item is `Baam` (128 of 132 days, 30,597 kcal — the user's protein drink, a *custom meal*), which is also live-resolved: editing that one custom entry enriches all 128 days. Only true AI/OCR one-offs stay frozen.

`alcohol_g` additionally closes a **known open defect**: [TASK_BOARD.md:118](../../TASK_BOARD.md) records that `audit-meals.js` fails beer entries because `P×4 + C×4 + F×9` cannot reconcile with a calorie count that is mostly ethanol. With `alcohol_g` the check becomes `P×4 + C×4 + F×9 + A×7`.

## 3. Compliance with DEC-004

| DEC-004 rule | how T-024 satisfies it |
|---|---|
| 1 — absent ≠ zero | fields omitted when unknown; readers use `!= null`. An audit rule bans `|| 0` on these four. |
| 2 — coverage disclosed | every total renders as `12 g (จาก 4/6 รายการ)`; below 60% of the day's calories it renders as `ข้อมูลไม่ครบ` instead of a number |
| 3 — fail-safe lean | satFat and alcohol lean **high**; fiber leans **low** (§4) |
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

### 4b. `fiber_g` — not derivable **from the macros**, but derivable from the starch base

> **Revised at implementation (T-024c).** The claim below — that fiber needs hand-authored per-entry data — was half right. Fiber is not recoverable from `protein_g`/`carbs_g`/`fat_g` *as numbers*: white rice and brown rice are near-identical on those and differ ~4× in fiber. But it **is** estimable as a **ratio of `carbs_g`** once the dish's starch base is identified from its name, and a ratio scales correctly across serving sizes (one pizza slice vs a whole large pizza are separate entries here) while making `fiber_g <= carbs_g` true by construction. The gate's "all 408" was therefore achievable without 408 guesses. The 17 whole foods in `fruits`/`healthy` are still hand-set, because for a banana a composition figure beats any ratio.

Fiber is a function of vegetable/legume/whole-grain content, which `protein_g`/`carbs_g`/`fat_g` do not encode: white rice and brown rice are near-identical on the existing four fields and differ ~4× in fiber. There is no honest derivation. Options:

| approach | cost | quality |
|---|---|---|
| conservative per-category floor (leaning low per DEC-004) | low | poor but never flattering — a placeholder, not an answer |
| hand-author 408 entries from a Thai food composition table | high | good |
| hand-author the ~80 entries covering most logged calories, leave the rest absent | **medium** | **good where it matters; DEC-004 coverage display makes the gaps visible** ← recommended |

The third option is the reason DEC-004 rule 2 exists: partial coverage is shippable when it is *disclosed*. Recommend authoring fiber for the entries that actually appear in the log (the export's 147 distinct names, of which ~60 carry most of the calories) and leaving the long tail absent.

### 4c. ~~`sodium_mg`~~ — **cut at the scope gate**

Was proposed as label-driven and lowest priority: accurate for the 88 branded products, close to unknowable for restaurant/street food, and unrelated to the LDL question. The gate cut it (§9 decision 1). No field, no column, no audit rule.

### 4d. `alcohol_g` — trivial and highest value per unit effort

Affects a handful of entries. `เบียร์ (1 ขวด 330ml)` and the two beer-bearing special presets. Unblocks the audit fix and makes the 27 drinking days (7.4% of all calories from beer alone, 19,095 kcal over the period) separable from food calories in every report.

## 5. Netlify functions

- `netlify/functions/estimate-meal.js` (Haiku) — extend the response schema and prompt with the three fields; instruct that **unknown must be omitted, not zeroed** (DEC-004), and apply the lean directions. Tag output `nutrientSource: "estimated"`.
- `netlify/functions/extract-nutrition.js` (Sonnet, OCR) — Thai nutrition labels print ไขมันอิ่มตัว and ใยอาหาร directly. This is the **highest-quality inbound source** in the whole system; tag `label`.
- Both — extend the macro-consistency check to `P×4 + C×4 + F×9 + A×7`, and add `satFat_g <= fat_g`, `fiber_g <= carbs_g` as hard validations.

## 6. CSV export

Three new columns, plus the row-type column deferred from [T-023 §7](T-023-csv-addon-double-count-fix.md):

```
วันที่, ประเภทแถว, ชื่ออาหาร, จำนวน, ขนาด (%), แคลอรี่, โปรตีน(g), คาร์บ(g), น้ำตาล(g), ไขมัน(g),
        ไขมันอิ่มตัว(g), ใยอาหาร(g), แอลกอฮอล์(g), น้ำหนัก(kg)
```

`ประเภทแถว` ∈ `รายการ` / `ส่วนเสริม` / `สรุปวัน` — ends the ambiguity that made an analyst's naive summation risky. An unknown nutrient exports as an **empty cell**, never `0` (DEC-004 rule 1); `สรุปวัน` shows the covered subtotal, and a coverage column or note states how much of the day it covers.

## 7. Proposed phasing

| sub-task | scope | ships |
|---|---|---|
| **T-024a** | schema + `alcohol_g` on the affected entries + `audit-meals.js` alcohol-aware check + CSV columns & `ประเภทแถว` | small, self-contained, fixes a standing audit defect |
| **T-024b** | `satFat_g` across `meals.json` + branded, per §4a, with a hand-review pass over `mains`/`fastfood` | the LDL-relevant half |
| **T-024c** | `fiber_g` for **all 408** entries per §4b + gate decision 2 | the other LDL-relevant half |
| **T-024d** | UI surfaces (day detail, reports) + coverage display per DEC-004 rule 2 | makes it visible |
| ~~T-024e~~ | ~~`sodium_mg`~~ | **cancelled at the gate** |

Netlify function changes ride with T-024b (the first sub-task whose values must round-trip through AI).

## 8. Audit plan

- `tools/audit-meals.js` — extend: `satFat_g <= fat_g`, `fiber_g <= carbs_g`, alcohol-aware calorie reconciliation (`P×4 + C×4 + F×9 + A×7`), `nutrientSource` present whenever any of the three is, and a scan for `|| 0` reads of these fields in `index.html`.
- `tools/audit-csv-addon-rows.js` — extend to the new columns once §6 lands.
- Coverage report — % of `meals.json` carrying each field, and % of the **last 30 days of logged calories** covered, which is the number that decides whether a total is worth displaying.

## 9. Scope gate — resolved 2026-09-03

| # | question | decision |
|---|---|---|
| 1 | keep or drop `sodium_mg`? | **Dropped entirely.** T-024e cancelled. The schema field is not added, no column is exported, and §2/§4c below are struck. |
| 2 | fiber for ~80 entries or all 408? | **All 408.** The recommendation was ~80; the user chose full coverage. This makes T-024c the largest sub-task in the project's history — see the cost note below. |
| 3 | `nutrientSource` granularity | **Per-entry** (the proposal), unchallenged at the gate. |
| 4 | daily target for `satFat_g`? | **Stays deferred** per DEC-004 rule 5. |
| 5 | register a re-baseline task? | **Yes — T-025**, blocked until T-024b + T-024c ship and 8–12 weeks of data accumulate. |

**Consequence of decision 2, stated plainly:** §4b argued fiber is not derivable from any existing field, so "all 408" means 408 hand-authored values, not a script. DEC-004 still governs each one — lean **low**, mark `nutrientSource`, and omit rather than guess where a dish's composition is genuinely unknown. "Complete coverage" must not become "408 confident-looking numbers"; an entry whose fiber cannot be honestly estimated is still left absent, and the coverage display exists to show that. T-024c will report how many of the 408 got a real value versus how many stayed absent.

**Struck by decision 1:** all `sodium_mg` rows in §2, §4c in full, the `โซเดียม(mg)` column in §6, and T-024e in §7.

## 10. Definition of done — by sub-task

- **T-024a** — schema + `alcohol_g` + coverage-aware totals + CSV columns/`ประเภทแถว` + alcohol-aware `audit-meals.js`
- [x] **T-024b + T-024c** — `satFat_g` **and** `fiber_g` across all 408 meals + 88 branded *(v1.10.53)*. Shipped together because both fall out of one generator, `tools/gen-nutrient-derivation.js`. Coverage **496 / 496**, zero left absent, zero sanity violations: 391 rule-derived meals + 17 hand-set whole foods + 88 branded.
- [ ] **T-024d** — UI surfaces + coverage display per DEC-004 rule 2

## 11. What the data now says — back-test over the original 132 days

Re-scoring the export that started this task, using only the entries whose names resolve to the database (**61.8%** of logged calories):

| | measured over the covered 62% | reference |
|---|---|---|
| saturated fat | **17.0 g/day** | — |
| fiber | **3.5 g/day** | 25–30 g/day |
| satFat as % of energy, extrapolated to the whole day | **~12.6%** | **<6%** (AHA, for LDL lowering) |

**The conclusion survives the most favourable possible assumption.** Even if every one of the uncovered 38% of calories contributed *exactly zero* saturated fat and *zero* fiber, the floor is still 17 g of satFat — **7.8% of energy, still above the 6% ceiling** — and **3.5 g of fiber**, about an eighth of the low end of the target. The extrapolated ~12.6% is the likelier figure. The uncovered items cut both ways: the protein drink (`Baam`, 12% of all calories) carries near-zero of both, while the restaurant and shabu aggregates almost certainly run *higher* in saturated fat than average.

This is exactly what the four original macros could not show — a diet that is correct on calories (1,962/day), strong on protein (1.94 g/kg) and unremarkable on total fat (26.4% of energy), while sitting at roughly **double** the saturated-fat ceiling with roughly **a fifth** of the fiber floor.

**These are derived estimates, not measurements.** Good enough to identify a direction and to compare against a re-baseline (T-025); not good enough to quote as intake figures. Nothing here is a clinical assessment.
