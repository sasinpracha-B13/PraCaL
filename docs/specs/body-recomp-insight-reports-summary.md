# T-013d.1 — Body Recomp Insight summary in Reports tab

**Status:** approved (small surface addition · hotfix-class)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-013d.1 · T-013d (done · v1.10.35) · Rule 16

> **Split discipline:** This task adds a *compact summary card* of the existing T-013d insight to the Reports tab. It does NOT duplicate classification logic, NOT add new schema, NOT add Phase 2/3 features.

---

## Why

The Body Recomp Insight from T-013d is genuinely useful for understanding why scale weight may not match calorie predictions — but it currently only surfaces inside Body Progress Center. Users browsing the Reports tab (which already shows weight trend + waist trend + calorie deficit + protein adherence) don't see the synthesis until they navigate to BPC. Adding a compact summary at the seam between Reports' body-data section and intake section is a small win without bloating Reports.

## Non-goals (forbidden in this sub-task · audited at gate)

- ❌ Duplicate the T-013d classifier — there must be **ONE** source of truth
- ❌ New status labels beyond the 6 from T-013d
- ❌ New schema fields
- ❌ Photo gallery / viewer / compare features in Reports
- ❌ Ghost overlay · Slider compare · Auto-suggest · Video frame · Timer · `getUserMedia`
- ❌ "Muscle gain confirmed" / "performance improvement" / "strength progress" claims
- ❌ Shame/value-judgment language

## Design

### Reuse, don't duplicate

The Reports card calls **`computeBodyProgressInsight(user)`** — the exact same helper used by BPC. Same `INSIGHT_THRESHOLDS`. Same `classifyBodyProgressStatus`. Same `getInsightConfidence`. Same status keys.

The ONLY new code is a renderer: `renderReportsInsightSummary(insight, user)` that produces a **compact card** (10-15 lines visible without expansion) — visually distinct from BPC's expandable card.

### Where it lands in Reports

Between the existing "📐 รอบเอว" stat-card and "🔥 แคลอรี่" stat-card. This placement:
- Groups the synthesis (insight) right next to the data it synthesizes (weight + waist)
- Doesn't push existing intake/protein cards down significantly
- Keeps Reports a summary view — the heavy/detailed insight rendering stays in BPC

### Compact card layout

```
┌─────────────────────────────────────────────┐
│ 🎯 Body Recomp Insight                       │
│ สรุปจากน้ำหนักเฉลี่ย รอบเอว แคลขาดดุล        │
│ และความสม่ำเสมอในการซ้อม                      │
│                                              │
│ [Status badge] [Confidence: Med]             │
│                                              │
│ ⚖️ น้ำหนักจริง  -1.2 kg                       │
│ 💡 แคลคาด     -2.0 kg                        │
│ ▶ ส่วนต่าง    +0.8 kg                        │
│ 📐 รอบเอว      -1.5 cm                        │
│                                              │
│ 💭 {one-line explanation per status}         │
│ 📝 {one-line what-to-check}                  │
│                                              │
│ [⚠️ ยังไม่ยืนยันว่ากล้ามเพิ่ม]                 │
│   (only for possible-recomp)                 │
│                                              │
│ [→ ดูรายละเอียดใน Body Progress Center]      │
└─────────────────────────────────────────────┘
```

For **Not Enough Data** state (special compact variant):

```
┌─────────────────────────────────────────────┐
│ 🎯 Body Recomp Insight                       │
│ [📊 ข้อมูลยังไม่พอ]                            │
│                                              │
│ ต้องการเพิ่ม:                                  │
│   • Check-in (ตอนนี้ N ครั้ง · ต้องการ ≥2)    │
│   • รอบเอว (ตอนนี้ {has/no})                  │
│   • บันทึกอาหารต่อเนื่อง ≥7 วัน                │
│                                              │
│ [📸 เริ่ม Body Check-in]   (only if 0 check-ins)
│ [→ ดู Body Progress Center]                  │
└─────────────────────────────────────────────┘
```

### CTA logic

- **Always**: "→ ดูรายละเอียดใน Body Progress Center" → `nav-bpc` (existing handler)
- **When `checkin_count === 0`**: also show "📸 เริ่ม Body Check-in" → `nav-checkin` (existing handler)

No new handlers, no new event listeners, no new localStorage keys.

### Numerical display

- "น้ำหนักจริง" = `weightTrend.change_kg` (signed; "-1.2 kg" or "+0.3 kg")
- "แคลคาด" = `-predictedLoss.predicted_loss_kg` (negate to express as "change"; a positive predicted_loss means we predicted a loss, displayed as negative change)
- "ส่วนต่าง" = `(-predictedLoss.predicted_loss_kg) - weightTrend.change_kg` (positive = scale moved less than predicted; the recomp signal)
- "รอบเอว" = `waistTrend.change_cm` (signed, only shown if `waistTrend.has_data && data_points >= 2`)

All deltas shown with explicit signs ("+" or "-"). **No color coding by direction.** Status badge color uses the same neutral palette as T-013d's BPC card (indigo / amber / blue / gray).

### Copy bank (compact one-liners — locked text per user-supplied)

| Status | Short explanation (`💭` line) | What to check (`📝` line) |
|---|---|---|
| `fat-loss-confirmed` | "น้ำหนักเฉลี่ยและรอบเอวไปในทิศทางเดียวกัน พร้อมข้อมูลแคลขาดดุลที่รองรับ" | "บันทึกต่อ · ดูแลโปรตีนถึงเป้า" |
| `possible-recomp` | "น้ำหนักจริงลงช้ากว่าที่แคลคาด แต่รอบเอวยังมีสัญญาณที่ดี จึงอาจเป็น recomp หรือ water/glycogen noise ได้" | "บันทึกต่อ · ดูรอบเอวร่วมกับแรงเวท" |
| `water-noise-likely` | "น้ำหนักช่วงสั้นอาจถูกกวนจากน้ำในกล้าม ไกลโคเจน โซเดียม หรือการซ้อมหนัก" | "รอ 1-2 สัปดาห์ · ดูค่าเฉลี่ย 7 วัน" |
| `review-needed` | "ข้อมูลเริ่มขัดกับแผน ควรทบทวนการบันทึกอาหาร TDEE exercise calories หรือความสม่ำเสมอของการวัด" | "ทบทวน tracking · ลด TDEE estimate 100-150 kcal" |
| `progress-in-motion` | "ทิศทางเริ่มมาแล้ว ยังต้องเก็บข้อมูลเพิ่มเพื่อยืนยัน" | "บันทึกต่อให้ครบ · อีก 1-2 สัปดาห์ชัดขึ้น" |
| `not-enough-data` | (uses the missing-data variant card, see above) | — |

### Mandatory caveat (possible-recomp only)

The card MUST render the literal text "**ยังไม่ยืนยันว่ากล้ามเพิ่ม**" (per user-supplied copy) when status is `possible-recomp`. This is enforced by grep at audit time. Visually rendered as a small amber-bordered hint below the explanation.

(Note: the T-013d BPC card uses "ไม่ได้แปลว่ากล้ามเพิ่ม". Both phrasings are negations — for Reports we use the user-specified "ยังไม่ยืนยันว่ากล้ามเพิ่ม" which fits the compact card better. Both are semantically equivalent negations.)

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) `renderReportsInsightSummary(insight, user)` renderer (the only new function) · (2) wire into `renderReports` at the seam between waist card and calorie card · (3) VERSION |
| `service-worker.js` | VERSION → v1.10.36 |
| `docs/specs/body-recomp-insight-reports-summary.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | status updates |

## Hard guardrails

- No new helpers for trend/classify/confidence — Reports calls `computeBodyProgressInsight(user)` and reads the existing bundle
- No new schema · no new localStorage keys · no IndexedDB writes
- No new handlers (CTAs reuse `nav-bpc` and `nav-checkin`)
- No new event listeners
- VERSION sync between `index.html` and `service-worker.js`
- Data file hashes unchanged
- The literal "ยังไม่ยืนยันว่ากล้ามเพิ่ม" appears exactly once (in the possible-recomp branch of `renderReportsInsightSummary`) · enforced by grep
- T-013d's existing "ไม่ได้แปลว่ากล้ามเพิ่ม" caveat stays exactly once on the BPC side · this hotfix doesn't touch that path

## Definition of Done

- [ ] `renderReportsInsightSummary` renderer added (the only new function)
- [ ] Wired into `renderReports` between waist card and calorie card
- [ ] `computeBodyProgressInsight(user)` called exactly once in Reports view (single source of truth)
- [ ] No duplicate classifier · no copy/paste of `classifyBodyProgressStatus` / `getInsightConfidence` logic into Reports
- [ ] All 6 status branches handled in the compact renderer
- [ ] Not-Enough-Data variant card shows what data is missing + appropriate CTAs
- [ ] CTA "ดูรายละเอียดใน Body Progress Center" uses `nav-bpc` (existing handler · no new wiring)
- [ ] CTA "เริ่ม Body Check-in" uses `nav-checkin` (existing handler) · shown only when `checkin_count === 0`
- [ ] Possible-Recomp branch renders literal "ยังไม่ยืนยันว่ากล้ามเพิ่ม"
- [ ] No new status labels beyond T-013d's 6
- [ ] No new schema, no new localStorage, no IndexedDB writes
- [ ] No new handlers · no new event listeners
- [ ] No color coding implying good/bad direction on deltas
- [ ] Tone audit clean: 0 `muscle gain confirmed` / `performance improvement` / `strength progress` / `กล้ามขึ้น` / `แข็งแรงขึ้น` / `อ้วนขึ้น` / `แย่ลง` / `ล้มเหลว` / `ทำผิด`
- [ ] VERSION v1.10.35 → v1.10.36 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## Test plan (manual)

1. **0 check-ins, no weights, no waist, no logs** → Reports shows Not-Enough-Data card with both CTAs ("เริ่ม Body Check-in" + "ดู BPC")
2. **0 check-ins, has weights + logs** → Reports shows Not-Enough-Data card with "เริ่ม Body Check-in" CTA (because check-in count is the gate)
3. **1 check-in + 14 days data + waist + deficit logged** → Reports shows same status as BPC (verified by side-by-side comparison)
4. **Possible-Recomp case (predicted > actual + waist down + training)** → Reports card includes amber-bordered "⚠️ ยังไม่ยืนยันว่ากล้ามเพิ่ม" caveat
5. **Missing waist** → confidence downgrades consistently; copy mentions waist would help
6. **Tap "ดูรายละเอียดใน Body Progress Center"** → navigates to BPC home; insight card there matches Reports' status
7. **Tap "เริ่ม Body Check-in" when no check-ins** → navigates to check-in flow
8. **Open Reports tab while T-013d BPC card is in expanded state on BPC** → Reports card renders independent collapsed-compact view (Reports doesn't use `state.tmp.bpcInsightExpanded`)
9. **No regression**: existing Reports cards (weight / waist / calorie / protein / carb-sugar / logging) all render correctly · charts still work · custom date range still works
10. **Tone audit**: page text grep — 0 occurrences of forbidden phrases

## Rollback plan

`git revert <T-013d.1 commit>` removes the compact card + its insertion into renderReports. Reports falls back to v1.10.35 layout (no insight summary). T-013d's BPC insight card untouched. No data shape changes to revert.

## Open questions (locked)

- **Should the Reports card respect the BPC expanded state?** Spec locks: **NO** — Reports is summary view; the card is always compact. Tapping the CTA routes to BPC where the expandable detail lives.
- **Should the Reports card show training_count too?** Spec locks: **YES, briefly** — one line in the data summary. But still labeled "Training: N ครั้ง" — never "you're getting stronger".
- **What about the custom date range in Reports?** Spec locks: **insight uses its own 21-day default window, not the Reports range**. The insight's window is fixed per T-013d. If the user has a custom Reports range of 7 days, the insight still computes over 21. This avoids the insight flickering as user toggles date ranges and keeps the synthesis stable. Documented in card subtitle as implicit by the "สรุปจาก…" framing.
