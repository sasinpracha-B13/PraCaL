# T-013d — Recomp Insight Card + Status Logic

**Status:** approved (4 of 4 split sub-tasks · final sub-task for BPC Phase 1 MVP)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-013d · T-013a/b/b.1/c (all done) · Rule 16

> **Split discipline:** This task is the **interpretation layer** on top of the data + capture + viewing layers built by T-013a/b/b.1/c. It does NOT add new schema, NOT add ghost overlay/slider/video/auto-suggest (Phase 2), NOT add workout performance tracking, NOT claim muscle gain.

---

## Goal

Add a conservative **Body Recomp Insight** layer to BPC home that interprets:
- 7-day weight trend
- 7-day waist trend (when available)
- Calorie deficit trend
- Check-in/photo presence
- Training frequency (proxy only — count, not performance)

Output: one of **6 status labels** + **3 confidence levels** + a transparent expandable "what the app sees / why scale may differ / what to check next" section.

**Core principle:** *Help the user understand why scale weight may not perfectly match calorie-predicted weight loss. Reduce anxiety, not judge the body.*

## Non-goals (forbidden in this sub-task · audited at gate)

- ❌ Ghost overlay · Slider compare · Auto-suggest · Video frame · Timer mode · `getUserMedia` (all Phase 2)
- ❌ Workout performance tracking schema (lift weights, rep counts, RPE — NONE of this)
- ❌ "Muscle gain confirmed" / "กล้ามเพิ่มแน่นอน" / "กล้ามขึ้น" claims — ABSOLUTELY FORBIDDEN
- ❌ "Performance improvement" claims from training_count (training_count is frequency proxy ONLY)
- ❌ Strength progress / endurance progress language
- ❌ Shame language: "อ้วนขึ้น"/"แย่ลง"/"ล้มเหลว"/"ผอมลง"/"failed"
- ❌ Color-coding on weight/waist deltas implying good/bad
- ❌ Body composition estimates (BF%, lean mass kg) — we have no DEXA/BIA data
- ❌ "Fat gain confirmed" unless evidence is **extremely clear** — prefer "Review Needed"
- ❌ Photos auto-loaded on dashboard / outside BPC (unchanged from T-013a)

## The 6 status labels

| Status (key) | Thai label | When |
|---|---|---|
| `fat-loss-confirmed` | ✅ ไขมันลดยืนยันได้ | ≥14 days · meaningful weight↓ · waist↓ or flat · deficit consistent |
| `possible-recomp` | 💭 อาจมี Recomp | weight slower than predicted · waist↓ · training frequency exists · **never** says muscle gain |
| `water-noise-likely` | 💧 น่าจะเป็นน้ำ | short window <14d · weight spike/flat · waist not↑ · recent training |
| `review-needed` | 🔍 ลองทบทวน tracking | ≥21d · deficit logged · weight+waist not moving · or strong conflict |
| `progress-in-motion` | 🚶 ทิศทางกำลังมา | data moving but window too short / confidence too low for stronger label |
| `not-enough-data` | 📊 ข้อมูลยังไม่พอ | 0 check-ins · <7 days · <2 weight points |

## Decision tree (evaluated in order, first match wins)

```
1. Not Enough Data?
   IF weight_data_points < 2 OR window_days < 7 OR checkin_count === 0
     → not-enough-data (always low confidence)

2. Review Needed?
   IF window_days >= 21 AND deficit_logged_days >= 7 AND (
     (|weight_change_kg| < FLAT_WEIGHT_BAND AND waist_change_cm >= 0)
       OR
     (weight_change_kg < -0.5 AND waist_change_cm > +WAIST_FLAT_BAND)  // strong conflict
   )
     → review-needed
   Copy: suggest review tracking / TDEE estimate / measurement consistency
   NEVER use "failed"

3. Water Noise Likely?
   IF window_days < 14 AND (
     weight_change_kg > 0  // short-term gain
       OR
     |weight_change_kg| < FLAT_WEIGHT_BAND  // short-term flat
   ) AND waist_change_cm <= WAIST_FLAT_BAND
     AND training_count_window >= 3   // recent training is the noise source
     → water-noise-likely
   Copy: explain water/glycogen/sodium/training inflammation

4. Fat Loss Confirmed?
   IF window_days >= 14
     AND weight_change_kg <= -MEANINGFUL_WEIGHT_DROP_KG
     AND change_per_week_kg <= -MIN_WEEKLY_DROP_KG
     AND (waist_data_missing OR waist_change_cm <= WAIST_FLAT_BAND)
     AND avg_deficit_kcal >= MIN_DEFICIT_FOR_CONFIRMED
     AND deficit_logged_days >= 7
     → fat-loss-confirmed
   Confidence: HIGH if waist data + ≥21d + ≥2 check-ins; else MEDIUM

5. Possible Recomp?
   IF waist_data_exists  // CANNOT classify without waist
     AND waist_change_cm < -WAIST_FLAT_BAND  // waist actually trending down
     AND predicted_loss_kg - actual_loss_kg >= RECOMP_GAP_THRESHOLD_KG  // scale slower than predicted
     AND training_count_window >= 4  // some training frequency
     AND avg_deficit_kcal >= MIN_DEFICIT_FOR_CONFIRMED * 0.7  // some deficit
     → possible-recomp
   CRITICAL: copy must include "**ข้อความนี้ไม่ได้แปลว่ากล้ามเพิ่ม**"
   Confidence: never HIGH (best is MEDIUM) — we lack DEXA/performance data

6. Progress In Motion (catch-all when SOME direction exists but not enough)
   IF |weight_change_kg| >= 0.2 OR (waist_data_exists AND |waist_change_cm| >= 0.5)
     → progress-in-motion
   Copy: encourage continued tracking, mention "X more weeks to be sure"

7. Default → not-enough-data
   Should rarely hit if window/data checks above pass — defensive fallback
```

## Confidence levels

```
HIGH:
  - window_days >= 21
  - checkin_count >= 2
  - waist_data_points >= 2
  - weight_data_points >= 5
  - deficit_logged_days >= 10
  ALL must hold

MEDIUM:
  - window_days >= 14
  - weight_data_points >= 3
  - deficit_logged_days >= 7
  - (waist_data_points >= 1 OR checkin_count >= 1)

LOW:
  - everything else
```

**Hard downgrade rules** (apply AFTER initial classification):
- If `status === 'possible-recomp'`, confidence capped at MEDIUM (never HIGH)
- If `waist_data_missing`, confidence downgraded one tier (HIGH→MEDIUM, MEDIUM→LOW)
- If `checkin_count === 1`, confidence downgraded one tier

## Numerical thresholds (constants)

```js
const INSIGHT_THRESHOLDS = {
  // Window minimums
  MIN_DAYS_FOR_INSIGHT: 7,           // below = not-enough-data
  MIN_DAYS_FOR_CONFIRMED: 14,        // below = at most progress-in-motion
  MIN_DAYS_FOR_REVIEW_NEEDED: 21,    // below = give it more time

  // Weight movement thresholds (kg)
  MEANINGFUL_WEIGHT_DROP_KG: 0.5,    // total drop in window required for "fat loss confirmed"
  MIN_WEEKLY_DROP_KG: 0.15,          // weekly rate floor — slower than this = not confirmed
  FLAT_WEIGHT_BAND_KG: 0.3,          // |change| < this = flat

  // Waist movement (cm) — looser because tape measurement variability is real
  WAIST_FLAT_BAND_CM: 1.0,

  // Deficit
  KCAL_PER_KG_FAT: 7700,             // body energy density (rough)
  MIN_DEFICIT_FOR_CONFIRMED: 200,    // avg kcal/day below maintenance

  // Recomp signal
  RECOMP_GAP_THRESHOLD_KG: 0.5,      // predicted_loss - actual_loss must exceed this
  RECOMP_MIN_TRAINING_COUNT: 4,      // in window (~2x/wk over 14 days)

  // Window default
  DEFAULT_INSIGHT_WINDOW_DAYS: 21
};
```

## Helper functions (pure, testable)

```js
computeWeightTrend(user, endDate, windowDays)
  → { has_data, data_points, latest_kg, oldest_kg, days_span,
      change_kg, change_per_week_kg, direction: 'down'|'up'|'flat' }

computeWaistTrend(user, endDate, windowDays)
  → similar shape (or { has_data: false } if no waist entries in window)

computePredictedLossFromDeficit(user, windowDays, endDate)
  → { avg_deficit_per_day_kcal, total_deficit_kcal,
      predicted_loss_kg, days_logged, data_quality }

computeCheckinSnapshot(user, windowDays, endDate)
  → { checkin_count, latest_checkin, days_since_last,
      has_photos: bool, waist_in_checkins: bool }

computeTrainingFrequency(user, windowDays, endDate)
  → { training_count, strength_count, cardio_count }
  // NEVER returns "you're getting stronger" — count only

classifyBodyProgressStatus(input)
  → { status, reasons: [string], primary_signal: string }
  // input = { weightTrend, waistTrend, predictedLoss, checkinSnap, training }

getInsightConfidence(input, status)
  → 'low' | 'medium' | 'high'
  // applies hard downgrades

computeBodyProgressInsight(user, endDate = todayKey(), windowDays = 21)
  → top-level bundle for renderer:
  {
    window_days, end_date,
    weightTrend, waistTrend, predictedLoss, checkinSnap, training,
    status, confidence, reasons, copy: { headline, whatSees, whyDiffer, whatNext }
  }
```

All helpers must be:
- **Null-safe** (handle missing waist / weight / logs without throwing)
- **Pure** (no DOM access, no localStorage, no IndexedDB)
- Return `has_data: false` shapes gracefully

## Copy bank (locked Thai text — neutral, no shame)

Each status has 4 copy slots: `headline`, `whatSees`, `whyDiffer`, `whatNext`.

### fat-loss-confirmed
- `headline`: "ข้อมูลบ่งชี้ว่าไขมันกำลังลด"
- `whatSees`: dynamic from data (auto-formatted)
- `whyDiffer`: "น้ำหนัก + รอบเอว + แคลขาดดุล สอดคล้องไปด้วยกัน"
- `whatNext`: "บันทึกต่อ · ดูแลโปรตีนให้ถึงเป้า · เวทไม่ตก = good baseline"

### possible-recomp
- `headline`: "อาจมีสัญญาณ Recomp"
- `whatSees`: dynamic
- `whyDiffer`: "น้ำหนักลงช้ากว่าที่แคลคาด · รอบเอวยังลด · มี training ในช่วงนี้ · อาจเป็นน้ำในกล้าม / ไกลโคเจน / lean mass retention / TDEE estimate สูงไป"
- `whatNext`: "ดูแรงเวท ถ้ายังไม่ตก → สัญญาณดี · รอบเอวยังลด → สัญญาณดี · บันทึกต่อ 2-3 สัปดาห์"
- **MANDATORY caveat appended**: "⚠️ ข้อความนี้ไม่ได้แปลว่ากล้ามเพิ่ม · ไม่มีข้อมูล performance หรือ DEXA"

### water-noise-likely
- `headline`: "น้ำหนักแกว่งช่วงสั้น · น่าจะเป็นน้ำ"
- `whatSees`: dynamic
- `whyDiffer`: "น้ำในกล้าม + ไกลโคเจน + โซเดียม + การซ้อมหนัก = น้ำหนักแกว่งได้ 1-2 กก. โดยไม่ใช่ไขมัน"
- `whatNext`: "ให้เวลาอีก 1-2 สัปดาห์ · ดูค่าเฉลี่ย 7 วัน ไม่ใช่ค่ารายวัน"

### review-needed
- `headline`: "ลองทบทวน tracking สักนิด"
- `whatSees`: dynamic
- `whyDiffer`: "ขาดดุลตามบันทึกมี · แต่น้ำหนัก/รอบเอวไม่ขยับ · ขาดดุลจริงอาจไม่เท่าที่บันทึก · TDEE จริงอาจต่ำกว่าประเมิน · การวัดอาจคลาดเคลื่อน"
- `whatNext`: "ลองบันทึกอาหารแม่นยิ่งขึ้น (ชั่ง/ตวง) · ลด TDEE estimate ลง 100-150 kcal · วัดเอวเวลาเดียวกัน · ดูเร็วๆ ที่ไม่ใช่ exercise calories ที่ประเมินสูง"
- **NEVER use** "ล้มเหลว" / "ทำผิด" / "เสีย"

### progress-in-motion
- `headline`: "ทิศทางเริ่มมาแล้ว · ยังต้องรอดูต่อ"
- `whatSees`: dynamic
- `whyDiffer`: "ข้อมูลเริ่มเห็นทิศทาง แต่ยังเร็วเกินจะสรุป"
- `whatNext`: "บันทึกต่อให้ครบ · อีก X สัปดาห์จะชัดขึ้น"

### not-enough-data
- `headline`: "ข้อมูลยังไม่พอให้ประเมิน"
- `whatSees`: dynamic (list what IS available)
- `whyDiffer`: N/A
- `whatNext`: "ต้องการ: weight ≥3 จุด · check-in ≥2 ครั้ง · บันทึกอาหารต่อเนื่อง ≥7 วัน · วัดเอวจะช่วยมาก"

## UI placement

**BPC home, above Timeline/Compare buttons:**

```
[Privacy banner]
[Resume banner if draft]

┌─────────────────────────────────────────┐
│ 🎯 Body Recomp Insight                   │
│ [Status badge · neutral color]           │
│ [Confidence: High/Medium/Low]            │
│                                          │
│ ที่ระบบเห็น (4-5 lines auto-formatted)   │
│                                          │
│ [▼ ดูรายละเอียด]                          │
└─────────────────────────────────────────┘

[Latest check-in card from T-013b.1]
[Older card if any]
[Timeline button]
[Compare button]
```

Expanded state (when `state.tmp.bpcInsightExpanded === true`):

```
┌─────────────────────────────────────────┐
│ [collapsed card content above]           │
│                                          │
│ 📊 ที่ระบบเห็น                            │
│   ⚖️ น้ำหนัก -1.2 กก. (-0.6/สัปดาห์)        │
│   📐 รอบเอว -1.5 ซม.                       │
│   ⚡ ขาดดุล ~350 kcal/วัน (logged 12/14)   │
│   📸 Check-in 2 ครั้ง                       │
│   💪 Training: 8 ครั้ง (เวท 4 · คาร์ดิโอ 4) │
│                                          │
│ 💭 ทำไมเลขอาจไม่ตรงกัน                    │
│   {whyDiffer copy}                       │
│                                          │
│ 📝 สิ่งที่ควรเช็คต่อ                       │
│   {whatNext copy}                        │
│                                          │
│ 🎯 ความเชื่อมั่น: High/Medium/Low         │
│   ✓ Window: 14 วันขึ้นไป                  │
│   ✓ Check-in: 2 ครั้ง                      │
│   — รอบเอว: มีข้อมูล                      │
│                                          │
│ 📌 ตัวเลขเป็นการประเมินจากข้อมูลที่บันทึก  │
│    เท่านั้น ไม่ใช่ผลตรวจร่างกาย              │
│                                          │
│ [▲ ย่อ]                                    │
└─────────────────────────────────────────┘
```

Color discipline:
- Status badge uses neutral border + subtle bg per status (NOT green=good/red=bad). Confirmed has indigo (matches BPC primary). Review Needed has amber (warning, not fail). Water Noise has blue. Progress In Motion has gray. Not Enough Data has gray. Possible Recomp has indigo + dashed border to signal "tentative".
- **No green = lost weight = good** semantics. No red on any delta.

## New handlers

```
toggle-insight-details  →  state.tmp.bpcInsightExpanded = !state.tmp.bpcInsightExpanded · render
```

That's the only new handler. The insight card is otherwise read-only.

## Compare view link (optional, contained)

Per user instruction "Compare view may show a small link back to Insight Card, but do not turn compare into an evaluation page":
- Add a small hint at bottom of compare diff card: "🎯 ดู Insight Card ที่ BPC home" (`data-act="nav-bpc"`)
- The compare view itself does NOT compute or display status/confidence — that stays exclusively on BPC home.

## Validation / error handling

- **0 check-ins**: `not-enough-data` · confidence low · suggestNext copy points to starting first check-in
- **1 check-in**: classification still tries to run on weight/waist/log data; check-in count downgrade applied
- **Missing waist throughout**: `possible-recomp` becomes UNREACHABLE; other statuses still classify but confidence may downgrade. Copy notes "วัดเอวเพิ่มจะช่วยมาก"
- **Missing deficit data** (no food logs in window): cannot compute predicted loss; `fat-loss-confirmed` blocked (deficit_logged_days < 7); falls to progress-in-motion or not-enough-data
- **Bad numerical input** (e.g., weight_kg null in some entries): `null` propagates · helpers handle gracefully · UI shows "ยังไม่มีข้อมูล"
- **TDEE calculation issue** (rare — depends on user profile): falls through, doesn't crash; deficit/predicted shown as "—"

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) `INSIGHT_THRESHOLDS` constant block · (2) 7-8 helper functions (compute trend + classify + confidence + top-level bundle + copy builder) · (3) `renderInsightCard` component · (4) `renderBodyProgressCenter` updated to include insight card above timeline button · (5) `toggle-insight-details` handler · (6) `renderBpcCompare` adds small "back to insight" hint · (7) VERSION |
| `service-worker.js` | VERSION → v1.10.35 |
| `docs/specs/body-progress-recomp-insight.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | status updates |

## Hard guardrails

- No data file changes (`meals.json`, `branded_products.json`, `audit-meals.js` byte-identical)
- VERSION sync between `index.html` and `service-worker.js`
- IndexedDB schema unchanged (read-only over `photos` store)
- `u.checkIns[]` shape unchanged (no new fields)
- `u.weights[]` / `u.waist[]` shape unchanged
- No new `localStorage` keys (insight is computed every render · expanded state is state.tmp only)
- No workout performance schema (`u.workouts[]`, `u.lifts[]`, `u.rpe` — none added)
- T-014/T-015 features stay deferred (ghost/slider/video/PIN/face crop = 0 new)
- "muscle gain" / "performance improvement" / "strength progress" claims = 0
- Tone audit at gate: shame/value-judgment words = 0
- The literal string "ไม่ได้แปลว่ากล้ามเพิ่ม" MUST appear in the possible-recomp copy (caveat enforcement)

## Definition of Done

- [ ] `INSIGHT_THRESHOLDS` constant block added
- [ ] `computeWeightTrend(user, endDate, windowDays)` helper
- [ ] `computeWaistTrend(user, endDate, windowDays)` helper
- [ ] `computePredictedLossFromDeficit(user, windowDays, endDate)` helper
- [ ] `computeCheckinSnapshot(user, windowDays, endDate)` helper
- [ ] `computeTrainingFrequency(user, windowDays, endDate)` helper
- [ ] `classifyBodyProgressStatus(input)` decision-tree helper
- [ ] `getInsightConfidence(input, status)` confidence helper with downgrade rules
- [ ] `computeBodyProgressInsight(user)` top-level bundle
- [ ] `renderInsightCard(insight)` view component
- [ ] BPC home shows insight card above timeline/compare buttons
- [ ] `toggle-insight-details` handler · state.tmp.bpcInsightExpanded
- [ ] Compare view: small "ดู Insight Card" link (no evaluation on compare page itself)
- [ ] Status classification follows decision tree in order; first match wins
- [ ] Confidence downgrade rules applied (possible-recomp caps at MEDIUM · missing waist or 1 check-in downgrades by one tier)
- [ ] Possible Recomp copy includes literal "ไม่ได้แปลว่ากล้ามเพิ่ม"
- [ ] Review Needed copy does NOT use "ล้มเหลว"/"ทำผิด"/"เสีย"
- [ ] Tone audit (grep at gate): 0 occurrences of forbidden phrases
- [ ] No color-coding implying good/bad on weight/waist deltas
- [ ] `training_count` surfaced as "Training frequency" / "ครั้ง" — NEVER "strength progress" or "you're getting stronger"
- [ ] 0 check-ins: `not-enough-data` cleanly; no crash
- [ ] 1 check-in: classifies but with low confidence; no overclaim
- [ ] Missing waist: `possible-recomp` blocked; copy mentions waist would help
- [ ] Short-term spike: classified as `water-noise-likely`, NOT fat gain
- [ ] 21+ days stuck: `review-needed` with neutral copy
- [ ] No new schema fields
- [ ] No ghost/slider/video/getUserMedia (grep = 0)
- [ ] VERSION v1.10.34 → v1.10.35 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## Test plan (manual)

1. **User with 0 check-ins, 0 weights, 0 logs** → `not-enough-data` · low confidence · copy lists what's needed
2. **User with 1 check-in, 3 weight entries over 5 days, no waist** → `not-enough-data` (window too short)
3. **User with 14 days · weight -1.0 kg · waist -1.5 cm · avg deficit -400 kcal · deficit logged 10/14** → `fat-loss-confirmed` · medium-or-high confidence
4. **User with 21 days · weight flat (±0.2 kg) · waist flat · deficit -300 kcal logged 18/21** → `review-needed`
5. **User with 21 days · weight -0.5 kg · waist -2 cm · deficit -250 kcal · training 8 times (4 strength)** → could match either fat-loss-confirmed OR possible-recomp · spec says fat-loss wins because waist+deficit align (decision tree order)
6. **User with 14 days · weight -0.2 kg (slower than predicted -1.5 kg) · waist -1.5 cm · training 6 strength** → `possible-recomp` · medium confidence · copy includes "ไม่ได้แปลว่ากล้ามเพิ่ม"
7. **User with 7 days · weight +0.5 kg · waist flat · training 5 times** → `water-noise-likely` · explains glycogen/water/sodium
8. **User with all data but no waist** → `possible-recomp` UNREACHABLE; could land on `fat-loss-confirmed` (low confidence) or `progress-in-motion`
9. **Expand/collapse**: tap "ดูรายละเอียด" → details expand; tap "ย่อ" → collapse · state preserved within BPC view, resets on navigation away
10. **Compare view**: see small "ดู Insight Card" hint at bottom; tapping routes back to BPC; compare itself shows no status
11. **Tone audit**: open dev tools, grep page text for forbidden phrases — 0 occurrences
12. **No regression**: existing T-013a/b/b.1/c flows (capture, edit, timeline, viewer, compare) still work · no UI break · no console errors

## Rollback plan

`git revert <T-013d commit>` removes the insight card + helpers + handler. BPC home falls back to T-013c layout (latest cards + Timeline + Compare). Compare view's "back to insight" hint disappears. No data shape changes to revert. Any user-facing copy in `progress-in-motion` / `review-needed` / etc. disappears — but no schema mutation, no localStorage, no IndexedDB write paths involved.

## Open questions (locked in spec)

- **Time window default?** Spec locks: **21 days** (gives review-needed enough runway to fire; matches "MIN_DAYS_FOR_REVIEW_NEEDED").
- **Recompute on every render?** Spec locks: **YES** — computed inline in `renderInsightCard` from current user data. No caching. Speed concern: with ≤90 days of data, computation is trivial (linear scan of weights/waist/logs/activities).
- **Show predicted_loss number raw?** Spec locks: **YES** in the expandable details, with a disclaimer "ค่าคาดคะเนจาก 7700 kcal/kg · เป็นการประมาณ ไม่ใช่กฎเป๊ะ".
- **Add user override "I want to ignore the insight card"?** Spec locks: **NO** — keep surface simple. User can collapse the details; that's enough.
- **Trigger insight only with consent?** Spec locks: **NO** — no privacy concern (all computation is client-side from data the user already provided). No new opt-in needed.
