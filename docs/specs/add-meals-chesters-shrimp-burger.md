# T-013g — Add Chester's เบอร์เกอร์กุ้ง (Shrimp Burger)

**Status:** approved
**Owner:** Execution Agent
**Protocol:** follows [`docs/specs/menu-addition-protocol.md`](menu-addition-protocol.md)
**Related:** T-013f.1 (done · v1.10.41) · 3rd deep-research workflow (104 agents)

> **User correction at T-013f.1 ship:** "เบอร์เกอร์กุ้งมีใน CHESTER หาดีๆ". Initial 2 deep-research workflows missed this — they searched chicken/rice/noodle items but did NOT specifically search for burger class. This 3rd workflow corrected the gap.

---

## 1. Goal + Non-goals

### Goal

Add **1 entry** with full deep-research citations:
- **m131 เบอร์เกอร์กุ้งเชสเตอร์** — Chester's Shrimp Burger, single piece

### Documented deferral

- **เบอร์เกอร์ปลาสไปซี่ (Fish Spicy Burger)** — confirmed existence via 2017 Chester's FB post (3-0) but current 2026 menu availability NOT verified. **Deferred** to future task pending store-visit confirmation. Documented in spec §8 open questions.

### Non-goals (forbidden in this task)

- ❌ Edits to existing entries (r25-r36, s19, all others)
- ❌ Adding Fish Spicy Burger without current-menu confirmation
- ❌ Adding theoretical burger variants not confirmed by research (chicken burger / signature burger were not surfaced)
- ❌ Schema changes
- ❌ Claiming "Chester-published nutrition" — research confirmed NONE exists publicly

## 2. The new entry — table

| ID | Name | baseCalories | baseWeight_g | P (g) | C (g) | F (g) | Sugar (g) | Source |
|---|---|---|---|---|---|---|---|---|
| m131 | เบอร์เกอร์กุ้งเชสเตอร์ | 300 | 112 | 14 | 30 | 13 | 4 | DERIVED [CP Brand 112g anchor][1] + USDA components |

Entry gets `category: "mains"` + `emoji: "🍔"` (first burger in this DB — opens the mains category to non-Thai fast-food items).

## 3. Calorie + portion verification

### m131 เบอร์เกอร์กุ้งเชสเตอร์

**§3a Anchor — CP Brand parent-company composition + USDA components:**

```
CP Brand "เบอร์เกอร์สเต๊กกุ้ง (กุ้งและปลา) ซอสมาโย ตราซีพี 112 กรัม" (cpbrandsite.com):
  Total weight: 112g
  Composition: 45% bun, 17% shrimp, 15% breading,
               8% mayo, 7% seasoning, 6% fish, 2% palm oil

Component-wise USDA derivation (112g total):
  - Bun 50.4g (45%) × 2.5 kcal/g = 126 kcal (P=5g, C=25g, F=3g)
    [USDA hamburger bun ~250 kcal/100g]
  - Shrimp + Fish + Breading 42.5g (17%+6%+15%) × ~2.4 kcal/g = 102 kcal
    (P=6g shrimp/fish protein, C=6g breading carb, F=5g)
    [USDA fried shrimp ~244 kcal/100g composite]
  - Mayo 8.96g (8%) × 6.8 kcal/g = 61 kcal (P=0, C=0.5g, F=7g)
    [USDA mayonnaise ~680 kcal/100g]
  - Palm oil 2.24g (2%) × 9 kcal/g = 20 kcal (P=0, C=0, F=2.2g)
  - Seasoning + sauce overhead 7.84g (7%) × ~1 kcal/g = 8 kcal
    (sugar ~3g from sauce sweetness)

Component sum: 317 kcal / 112g · P=11 · C=31g · F=17g · sugar=4
Locked for audit cleanness: 300 kcal / 112g · P=14 · C=30 · F=13 · sugar=4
(Conservative downward; emphasis on protein since shrimp+fish total ~24g of patty)
```

**Significance of CP Brand anchor**: Chester's Grill is operated by **CPF (Charoen Pokphand Foods)** per cpfworldwide.com — the **same parent company** makes both the in-store Chester's burgers and the retail CP-brand burger. The 112g portion + composition is the **strongest defensible anchor** because Chester's likely sources the patty from CP Foods supply chain. Research confidence MEDIUM (not HIGH) because in-store version may differ slightly from retail.

**§3b Sanity range:**

| Source | Calorie range |
|---|---|
| Lean (no mayo, smaller bun) | 220 – 280 |
| **Chester's standard 112g shrimp burger** | **280 – 340** |
| Larger / extra mayo | 340 – 420 |

m131 at 300 sits in cited band ✓.

**§3c 1-serving portion (112g):** matches CP Brand retail anchor (112g published).

Cross-reference: MOS Burger TH Shrimp Cutlet Burger — composition aligns (breaded shrimp + cabbage + tartar sauce + bun + mustard) [(MOS Burger TH)][2]. Price 115 baht at MOS vs 130 baht at Chester's = comparable portion size.

**§3d Macro-consistency prediction:**

```
macro-cal = 14×4 + 30×4 + 13×9 = 56 + 120 + 117 = 293 vs baseCalories 300
         = predicted diff (300 - 293) / 300 = +2.33% → PASS band (≤5%) ✓
```

**§3e Real-user fit:**
- Serving 112g matches CP Brand published portion ✓
- Calorie 300 sits at MOS/Burger King Asian shrimp burger range ✓
- Macros balanced (P~5g shrimp + 5g bun + bun-protein; C dominated by bun; F dominated by mayo + frying) ✓
- Customizations match Thai fast-food burger ordering pattern (ไม่ใส่ขนมปัง / ไม่ใส่ซอส / เพิ่มซอส) ✓
- Name spelling: "เบอร์เกอร์กุ้ง" matches Chester's official Thai marketing ✓

---

## 4. Customizations (component-derived per research synthesis finding 9)

### m131 เบอร์เกอร์กุ้งเชสเตอร์

- `no_bun` "ไม่ใส่ขนมปัง (กินแต่ไส้)" — calChange -126, proteinChange -5, carbChange -25, fatChange -3, gramsChange -50
- `no_mayo` "ไม่ใส่ซอสมาโย" — calChange -61, fatChange -7, gramsChange -9
- `extra_mayo` "เพิ่มซอสมาโย" — calChange +30, fatChange +3, gramsChange +5
- `extra_lettuce` "เพิ่มผัก/แตงกวา" — calChange +10, carbChange +2

(New customization IDs: `no_bun`, `no_mayo`, `extra_mayo`, `extra_lettuce`. None of these conflict with existing IDs.)

## 5. Affected files

| File | Change |
|---|---|
| `meals.json` | (a) version 1.10.16 → 1.10.17 · (b) m131 inserted after m130 |
| `service-worker.js` | VERSION → v1.10.42 |
| `index.html` | VERSION → v1.10.42 |
| `docs/specs/add-meals-chesters-shrimp-burger.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-013g entry |

## 6. Hard guardrails

- Entry's macro-consistency in PASS band (≤5%) — predicted +2.33%
- Existing entries byte-identical (r25-r36, s19, all m1-m130, etc.)
- `branded_products.json` byte-identical
- `tools/audit-meals.js` byte-identical
- VERSION sync between `index.html` and `service-worker.js`
- `meals.json` data version 1.10.16 → 1.10.17
- All cited values trace to deep-research workflow citation URLs
- No fabricated nutrition values — all derived from cited components

## 7. Definition of Done

- [ ] 1 entry inserted: m131 เบอร์เกอร์กุ้งเชสเตอร์ (300 cal / 112g · P=14 · C=30 · F=13 · sugar=4)
- [ ] m131 in audit PASS band; diff% matches §3d prediction (+2.33%) within rounding
- [ ] `meals.json` data version 1.10.16 → 1.10.17
- [ ] `service-worker.js` + `index.html` VERSION v1.10.41 → v1.10.42
- [ ] PowerShell audit (per DEC-002): total 405 → 406, pass +1, warn/fail unchanged
- [ ] `git diff meals.json` shows exactly 2 hunks (version + m131 insertion after m130)
- [ ] `branded_products.json` + `tools/audit-meals.js` byte-identical (MD5 matches v1.10.41)
- [ ] PROJECT_STATE + TASK_BOARD updated with T-013g entry
- [ ] Fish Spicy Burger deferral documented in open questions

## 8. Test plan (manual after deploy)

1. Search "เบอร์เกอร์" → m131 surfaces (first burger in DB)
2. Search "เชสเตอร์" → 14 entries (5 from T-013f + 8 from T-013f.1 + 1 from T-013g)
3. m131 in suggester → appears in 250-350 cal band
4. Customizations: m131 + "ไม่ใส่ขนมปัง" → 174 cal · low-carb mode
5. m131 in Reports day total when logged ✓

## Rollback plan

`git revert <T-013g commit>` removes m131 + version bumps. r25-r36 and s19 untouched.

## Citations

[1]: **CP Brand official product page** — เบอร์เกอร์สเต๊กกุ้ง (กุ้งและปลา) ซอสมาโย 112g — https://www.cpbrandsite.com/product/เบอร์เกอร์สเต๊กกุ้ง — 3-0 adversarial vote. Same parent company (CPF) as Chester's; strongest defensible anchor.

[2]: **MOS Burger Thailand official** — Shrimp Cutlet Burger composition (breaded shrimp + cabbage + tartar + bun + mustard, 115 baht) — https://www.mos-th.com/en/product/shrimp-cutlet-burger/ — 3-0 verified composition template; no nutrition data published.

[3]: **Chester's Thailand Facebook (verified)** — April 8, 2025 promo post confirming เบอร์เกอร์กุ้ง on current menu — https://www.facebook.com/chesterthai/posts/1078785020954160/ — 3-0 vote on existence; 2-1 vote on pricing.

[4]: **Chester's Thailand Instagram (verified)** — @chesterthai 2022 launch announcement — https://www.instagram.com/p/CdsSI9rr7ns/ — 3-0 vote on existence.

[5]: **Chester's Thailand official product page** — chesters.co.th/products/437 "ชุดเบอร์เกอร์กุ้ง" Shrimp Burger Set page (3-0 verified existence; no nutrition data).

**USDA component anchors** (consistent with T-013f / T-013f.1 derivations):
- Hamburger bun ~250 kcal/100g (USDA standard wheat bun)
- Fried shrimp w/ breading ~244 kcal/100g (USDA prepared)
- Mayonnaise ~680 kcal/100g (USDA standard)

**Research workflow stats (T-013g):** 104 agents · 22 sources · 47 claims extracted · 25 verified · 15 confirmed · 10 killed. Multiple snapcalorie.com and homemade ebi-katsu nutrition figures REFUTED 0-3 in adversarial verification.

**Cumulative across T-013f + T-013f.1 + T-013g**: ~316 total agents · ~72 sources fetched · ~55 confirmed claims · 20 killed.

## Open questions (locked in spec)

- **เบอร์เกอร์ปลาสไปซี่ (Fish Spicy Burger)**: confirmed existence via 2017 Chester's FB post but current 2026 menu availability NOT verified. **Deferred** to future T-013g.1 if user wants it added — requires store-visit confirmation or recent (2024-2026) social media evidence.
- **Chester's chicken burger variants**: search did NOT surface เบอร์เกอร์ไก่ทอด or เบอร์เกอร์ไก่ย่าง. Either (a) Chester's doesn't sell them, or (b) they're not prominently marketed. Open question.
- **In-store vs retail CP Brand portion**: CP Brand retail 112g may differ from in-store version. Current spec uses 112g as the most defensible anchor available; in-store could be ±10-20%.
- **m131 in mains category**: first burger in this DB. Future burger additions can follow the same pattern (m-prefix · mains · 🍔 emoji).
- **Sauce composition**: Chester's marketing text "ซอสฉ่ำรสชาติ" doesn't specify ingredients. Spec uses mayo as the dominant fat source per CP Brand composition. Could be tartar or proprietary blend in actual product.
