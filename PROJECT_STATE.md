# Project State

> **Source of truth for what this project is, what's running, and what cannot change without approval.**
> Read this file first before any task. Update it when reality changes.

---

## Current Version / Current Build

- **App version:** `v1.10.41` (set in two places — must be kept in sync):
  - `index.html` — `const VERSION = 'v1.10.41';` (used at runtime, e.g., update banner / GET_VERSION message)
  - `service-worker.js` — `const VERSION = 'v1.10.41';` (drives cache name `pracal-${VERSION}` and cache invalidation)
- **`meals.json` data version:** `1.10.16` (T-013f.1 — 8 Chester's solo expansion entries · 397 → 405 entries · 2nd deep-research workflow + INMU verification of T-013f open questions).
- **`state.bpcRange`** (T-013d.3): persisted UI preference at root state level. Shape `{ preset: '7d'|'14d'|'30d'|'90d'|'all'|'custom', startDate?, endDate? }`. Defensive default `{ preset: '30d' }`. No schema migration needed (defensive read on first load).
- **User schema:** `u.waist = []` (T-012), `u.checkIns = []` (T-013a) + optional `updatedAt` (T-013b.1). T-013d added NO new schema fields — pure read-only interpretation over existing data.
- **IndexedDB:** database `PraCaLBodyProgress` (v1) with `photos` store. Lazy-init on first photo save (T-013a + T-013b + T-013b.1). T-013c + T-013d are read-only over this store.
- **localStorage draft key:** `pracal_checkin_draft_<userId>` — T-013b/b.1 schema unchanged. T-013c + T-013d added no new localStorage keys.
- **Bumping policy:** every shipped change that touches `index.html` or `service-worker.js` must bump both. Bumping only one ships stale UI to existing PWA installs.
- **Repo:** https://github.com/sasinpracha-B13/PraCaL · `main` is the deploy branch (Netlify auto-deploy).
- **Working tree:** clean as of this writing (no uncommitted changes).

> Note: the existing `README.md` still says `v1.0.0` — that line is stale and is **not** the source of truth for version. Treat the two `VERSION` constants as canonical.

---

## Current App Summary

**PraCaL** ("PraCal") — a Thai-language calorie tracking PWA for personal/family use. Single-file HTML app with two Netlify Functions for AI-assisted meal lookup. Data lives in browser `localStorage`; no backend database, no accounts.

### Main features (functional groupings)

- **Logging**
  - Pick from preloaded meal database (375 Thai meals + 88 branded products)
  - Online meal search (Claude Haiku 4.5 via Netlify Function)
  - Barcode scan + nutrition-label OCR (Claude Sonnet 4.6 via Netlify Function)
  - Custom meals, special meals (buffet/restaurant aggregate)
  - Backdate logging (up to 30 days)
- **Insights**
  - BMR + activity multiplier → TDEE
  - Goal-aware ring with zones (`win` / `extra` / `danger-low` / `danger-high`)
  - Streak tracking with freeze tokens
  - Weekly strip, reports, weight log
- **Planning** (newer surfaces, v1.10.13 onwards)
  - **"🍽️ มื้อต่อไปกินอะไรดี?"** — real-time suggester (search/sort/favorites filter, shows all matches in tolerance window)
  - **"📋 สร้างแผนอาหาร"** — meal planner (1 / 3 / 7 / 14 days) with live BMR/TDEE breakdown, projection card, swap drawer, plan-edit mode
- **Multi-user**
  - Up to 3 profiles per device (`MAX_USERS = 3` constant)
- **PWA**
  - Installable, offline-first (network-first for HTML to catch updates fast)

### Pages / views (state.view values)

`onboarding`, `dashboard`, `add`, `library`, `online`, `manual`, `meal-detail`, `history`, `history-day`, `similar-meals`, `suggest`, `meal-plan-setup`, `meal-plan`, `favorites`, `fav-edit`, `add-activity`, `users`, `settings`, `profile-edit`, `reports`, `weight-log`, `scan`, `scan-not-found`, `ocr`, `streaks`, `special-choose`, `special-quick`, `special-detail`, `special-add-config`.

---

## Current Architecture

### Frontend
- **Single-file HTML** — `index.html` (~7,500 lines) with inline `<style>` and `<script>` blocks. No framework, no build step.
- **State model:** one global `state` object holding `users`, `logs`, `favorites`, `customMeals`, `view`, `tmp` (view-scoped scratch state), `stack` (back-navigation history), `modal`.
- **Rendering:** single `render()` function dispatches on `state.view` to a per-view `renderXxx()` function that returns an HTML string. Innerhtml is replaced; **input focus is preserved across re-renders** by id-matching (`document.activeElement` snapshot → restore after replace).
- **Event delegation:** one `document.addEventListener('click', ...)` walks `e.target.closest('[data-act]')` and dispatches into a flat `actions` map. One `document.addEventListener('input', ...)` handles live form inputs by `id`.
- **Navigation:** `go(view, data)` pushes the current `{view, tmp}` onto `state.stack` and replaces `state.tmp = data || {}`. `back()` pops.

### Data files (loaded at startup, cached by service worker)
- `meals.json` — 375 preloaded Thai meals (data version `1.10.9`)
- `branded_products.json` — 88 packaged products

### Netlify Functions (serverless, called via `/api/*` redirect)
- `netlify/functions/estimate-meal.js` — Claude Haiku 4.5 (`claude-haiku-4-5`) for free-text meal estimation. Includes a reasoning prompt + macro/calorie consistency check (±15% rule).
- `netlify/functions/extract-nutrition.js` — Claude Sonnet 4.6 (`claude-sonnet-4-6`) for nutrition-label OCR from photos. Same macro consistency check.

### Service worker
- `service-worker.js` — versioned cache (`pracal-${VERSION}`), network-first for HTML, cache-first for everything else, never caches `/api/*` calls. Old caches purged on activate.

### Build / deploy
- **No build step.** Files in repo root are the deployable artifact.
- **Netlify** auto-deploys from `main` (config in `netlify.toml`).
- Cache headers force `index.html` and `service-worker.js` to revalidate every load.
- Required env: `ANTHROPIC_API_KEY` set in Netlify dashboard.

### Versioning
- `git` tags are not currently used. Version is encoded in `service-worker.js` and `index.html` constants and in commit message subjects (`vX.Y.Z: ...`).

---

## Current Active Task

**T-013f.1 — Chester's non-combo solo expansion** is in **`review`** state (v1.10.41, awaiting user gate). User-confirmed scope: option (c) "ทุกเมนู Chester ที่ไม่ใช่ combo/family set" · no drinks/sides · "ครบ" · OK to re-invoke deep-research. **2nd deep-research workflow** invoked (107 agents · 24 sources · 25 verified · 17 confirmed · 8 killed) — verified Part A open questions from T-013f (sticky rice MoPH Code 01039 = 230 kcal/100g · ส้มตำ INMU-attributed = 105 kcal/100g) AND researched 16 candidate Chester's expansion items. **Research-driven scope reduction**: 8 of 16 candidates have defensible anchors → INCLUDED (r29-r36); 8 candidates EXCLUDED with documented reasons (B9-B11 noodles: insufficient anchor 1-2 vote; B12-B16 steaks/salad/porridge: menu existence NOT verified on Chester's TH per menuinthai.com). Data integrity > entry count. Entries shipped: r29 ไก่ย่าง 1/2 ตัว (580) · r30 ไก่ย่าง ทั้งตัว (1160) · r31 ปีกไก่ทอด (200) · r32 น่องไก่ทอด (400) · r33 ไก่ทอด 3 ชิ้น (580) · r34 ข้าวไก่เทอริยากิ (555) · r35 ข้าวหน้าไก่ (455) · r36 ข้าวไก่ซอสพริก (520). 21 customizations across 8 entries. Per-entry diff% predictions match audit exactly to 2 decimal places — all PASS band: r29 +4.48% · r30 +4.48% · r31 -1.00% · r32 +3.50% · r33 +4.14% · r34 +3.60% · r35 -1.76% · r36 +4.62%. Aggregate: 397 → 405 (+8), pass 321 → 329 (+8), warn/fail/skipped unchanged. Sibling data files byte-identical. `meals.json` 1.10.15 → 1.10.16. VERSION v1.10.40 → v1.10.41. **r28/s19 decisions**: kept at shipped values; verified research anchors documented for future T-013f.2 correction option. **No commit/push yet — held per established gate pattern.**

21 tasks through operating model. Total `meals.json` entries: **405** (was 397). **T-014/T-015** still blocked (HOLD per user instruction). Cumulative deep-research across T-013f + T-013f.1: 212 agents · ~50 sources · ~40 confirmed claims · 10 killed.

Operating-model run history:
- T-001 (README refresh) — `done` ✅ — doc task
- T-003 (meals audit script) — `done` ✅ — tooling task
- T-003A (Node verification fallback) — `superseded` by T-004 / DEC-002
- T-004 (runtime decision → DEC-002) — `done` ✅ — policy task
- T-005 (data fix s02 + m18) — `done` ✅ — production-data task
- T-006 (add 4 ขนมจีนแกงเขียวหวาน variants) — `done` ✅ — user-visible product improvement
- T-007 (add 9 สปาเก็ตตี้ variants + Rule 17 + protocol doc + §3e real-user-fit) — `done` ✅ — user-visible + protocol codification (2 revision cycles in review: +4 variants, then real-user-fit pass)
- T-008 (add 9 protein add-ons to vegetarian pasta) — `done` ✅ — research-driven customizations · bases unchanged
- T-009 (Reports redesign · range-based view + 3 charts) — `done` ✅ — first code-only feature task
- T-010 (Reports chart interactivity + burn-line per-day fix) — `done` ✅ — bug fix (per-day burn line) + tap-to-read on 3 charts
- T-011 (Custom date range for Reports) — `done` ✅ — 5th segmented + native date pickers · refactored `rangeAggregate`
- T-012 (Waist circumference tracking) — `done` ✅ — `u.waist[]` schema + body-comp signal + WHO-based health flag
- T-013a (Body Progress Foundation) — `done` ✅ — IndexedDB + schema + empty-state view
- T-013b (Weekly Check-in Capture Flow) — `done` ✅ — 4-step capture flow · draft persistence · file picker primary · Timer Mode placeholder (Phase 2)
- T-013b.1 (Capture Source + Edit Check-in hotfix) — `done` ✅ — camera/gallery split · edit-mode flow · BPC latest-card entry
- T-013c (Timeline + Viewer + Side-by-side Compare) — `done` ✅ — 3 views · 6 helpers · 6 handlers · diff card numbers-only/no color/no value-judgment
- T-013d (Recomp Insight Card + Status Logic) — `done` ✅ — 6 status labels · 3 confidence tiers · mandatory "ไม่ได้แปลว่ากล้ามเพิ่ม" caveat · BPC Phase 1 MVP complete
- T-013d.1 (Body Recomp Insight summary in Reports tab) — `done` ✅ — compact card · reuses `computeBodyProgressInsight` · adds "ยังไม่ยืนยันว่ากล้ามเพิ่ม" caveat for Reports possible-recomp branch (superseded by T-013d.2)
- T-013d.2 (Body Recomp Insight: full detail card in Reports) — `done` ✅ — consolidation: Reports reuses BPC's `renderInsightCard` · compact summary deleted · stronger single-source-of-truth · first net-negative diff in BPC series
- T-013d.3 (BPC Date Range + Insight Window Controls) — `done` ✅ — 6 range presets · custom dates · analysis-window label + counts on every card · Timeline/Compare filtered by range · Reports threads its own range · first signature refactor with full back-compat
- T-013e (Add ก๋วยจั๊บ + ก๋วยจั๊บญวน menu entries · 4 entries) — `done` ✅ — n37/n38/n39/n40 · all PASS band (diff predictions exact to 2 decimal) · meals.json 1.10.13 → 1.10.14 · 388 → 392 entries · first menu-add task since T-008
- T-013f (Add Chester's Grill menu entries · 5 entries) — `done` ✅ — r25/r26/r27/r28/s19 · **first menu-add with deep-research citations** · 105 agents · all PASS band · meals.json 1.10.14 → 1.10.15 · 392 → 397 entries · scope criticism flagged → T-013f.1 expansion queued
- T-013f.1 (Chester's non-combo solo expansion · 8 entries + 8 documented exclusions) — `review` ⏳ — r29-r36 · **2nd deep-research workflow** verified T-013f open questions + researched 16 candidates → 8 PASS, 8 excluded with reasons · meals.json 1.10.15 → 1.10.16 · 397 → 405 entries
- T-014 (BPC Phase 2 features) — `todo` placeholder
- T-015 (BPC Phase 3 features) — `todo` placeholder
- T-016 (Insight Engine) — `todo` placeholder — 5th deferral

Rule 16 active and validated: T-006 produces both (a) measurable output (379 entries · all 4 in PASS band) and (b) real user impact (new menu options).

Total `meals.json` entries: **379** (was 375 since v1.10.0 baseline).

---

## Latest Completed Work

Recent shipped commits, newest first (from `git log`):

| Version | Summary |
|---|---|
| v1.10.41 | T-013f.1 — Chester's non-combo solo expansion (8 new entries r29-r36 + 8 documented exclusions). User confirmed scope option (c) "ทุกเมนู Chester ที่ไม่ใช่ combo/family set" · "ครบ" target. **2nd deep-research workflow**: 107 agents · 24 sources · 25 verified · 17 confirmed · 8 killed (including 0-3 unanimous refutation of US Chester's brand lineage to Thai Chester's). **Research-driven scope reduction**: 8 of 16 candidates have defensible anchors; 8 EXCLUDED for data integrity (B9-B11 noodles: anchor 1-2 vote; B12-B16 steaks/salad/porridge: menu existence NOT confirmed on Chester's TH). **Verified Part A anchors from T-013f**: sticky rice MoPH Code 01039 = 230 kcal/100g (3-0 vote · macro 0.4% delta); ส้มตำ INMU-attributed = 105 kcal/100g (2-1 vote). **Entries**: r29 ไก่ย่าง 1/2 ตัว (580 cal · linear 2× r26) · r30 ไก่ย่าง ทั้งตัว (1160 · linear 4× r26) · r31 ปีกไก่ทอด 2 ปีก (200 · USDA fried chicken) · r32 น่องไก่ทอด 2 ชิ้น (400 · USDA fried) · r33 ไก่ทอด 3 ชิ้น mix (580 · USDA fried) · r34 ข้าวไก่เทอริยากิ (555 · USDA components) · r35 ข้าวหน้าไก่ (455 · USDA components) · r36 ข้าวไก่ซอสพริก (520 · USDA components). 21 customizations across 8 entries (mix add/subtract). Per-entry diff% matches audit exact to 2 decimal: r29 +4.48% · r30 +4.48% · r31 -1.00% · r32 +3.50% · r33 +4.14% · r34 +3.60% · r35 -1.76% · r36 +4.62%. Aggregate: 397 → 405 (+8), pass 321 → 329 (+8), warn/fail/skipped unchanged. **r28/s19 decisions**: kept at shipped values (both 169 and 230 sticky-rice defensible per research; ส้มตำ verified value within band). `meals.json` 1.10.15 → 1.10.16. VERSION v1.10.40 → v1.10.41. Sibling data files byte-identical. |
| v1.10.40 | T-013f — Add 5 Chester's Grill menu entries with **deep-research citations** (first menu-add task to use external research). Per user request "หาข้อมูลให้ละเอียดนะ", invoked deep-research workflow: 105 agents · 23 sources fetched · 53 claims extracted · 25 adversarially-verified (3-vote, 2/3 refute threshold) · 23 confirmed · 2 killed. **Critical finding**: Chester's Thailand publishes NO official nutrition data anywhere accessible. Only ONE Chester-attributed anchor located on fit-d.com (`ข้าวอบไก่ย่าง` 397/28/44/12 · cites Chester's nutrition label · macro reconciles at 0.25% delta). Other 4 entries derived from validated USDA component anchors: chicken thigh+skin (247 kcal/100g · 3% delta), cooked jasmine rice (130 kcal/100g · 4.6% delta), sweet chili sauce (45 kcal/25g · 2.3% delta). **2 open questions flagged**: sticky rice + ส้มตำ not verified in INMU FCD synthesis — used common reference values with explicit uncertainty bands. Entries: **r25 ข้าวไก่ย่างเชสเตอร์** (397 cal / 380g · CITED fit-d.com) · **r26 ไก่ย่างเชสเตอร์ 1/4 ตัว** (290 cal / 150g · DERIVED USDA) · **r27 ข้าวไก่กระเทียมพริกไทยเชสเตอร์** (600 cal / 380g · DERIVED USDA + oil) · **r28 ข้าวเหนียวไก่ย่างเชสเตอร์** (540 cal / 320g · DERIVED + sticky-rice flag) · **s19 ส้มตำไก่ย่างเชสเตอร์คอมโบ** (420 cal / 280g · DERIVED + ส้มตำ flag). Per-entry diff% predictions match audit exactly to 2 decimal: r25 +0.25% · r26 +4.48% · r27 +4.17% · r28 +3.52% · s19 +4.29%. Aggregate: 392 → 397 (+5), pass 316 → 321 (+5), warn/fail unchanged. 13 customizations across 5 entries (mix of add/subtract per user "ทำ ADDON เฉพาะให้เหมาะสม"). `meals.json` 1.10.14 → 1.10.15. VERSION v1.10.39 → v1.10.40. Sibling data files byte-identical. |
| v1.10.39 | T-013e — Add 4 ก๋วยจั๊บ family menu entries. First menu-addition task since T-008 (v1.10.26). Follows menu-addition-protocol §3 (anchor derivation + sanity range + macro-cal prediction + real-user-fit). Entries inserted: **n37 ก๋วยจั๊บน้ำใส** (340 cal / 400g · P=18/C=44/F=9) anchored to n03 ก๋วยเตี๋ยวน้ำใส + offal/thicker-broth adjustments · **n38 ก๋วยจั๊บน้ำข้น (นายแอ๋ว style)** (620 cal / 450g · P=26/C=60/F=28) anchored to n01 + crispy pork belly + ไข่ต้ม + cornstarch broth, cross-checked against n06 ข้าวหมูกรอบ for fat ratio · **n39 ก๋วยจั๊บญวน** (400 cal / 420g · P=24/C=52/F=10) anchored to n04 + Vietnamese toppings (หมูยอ, ลูกชิ้น, ground pork) · **n40 ก๋วยจั๊บญวนรวมพิเศษ** (500 cal / 480g · P=32/C=55/F=15) anchored to n39 + extra toppings + ไข่ลวก. Per-entry diff% predictions match audit exactly to 2 decimal places — all PASS: n37 +3.24% · n38 +3.87% · n39 +1.50% · n40 +3.40%. Aggregate: 388 → 392 entries · pass +4 · warn/fail/skipped unchanged. Customizations density matches recent n24-n27 family (2-3 per entry; reuses existing IDs `no_egg`/`extra_noodles`/`no_chili`). `branded_products.json` + `tools/audit-meals.js` byte-identical. `meals.json` data version 1.10.13 → 1.10.14. VERSION v1.10.38 → v1.10.39 (sw + index). |
| v1.10.38 | T-013d.3 — BPC Date Range + Insight Window Controls. User can now select an analysis window for Body Progress Center via 6 presets (7d / 14d / 30d / 90d / ทั้งหมด / กำหนดเอง) + optional custom date pickers. Every insight card surfaces "🗓️ วิเคราะห์ช่วง: …" label + data counts row (น้ำหนัก N จุด · รอบเอว N จุด · Check-in N ครั้ง · อาหาร N วัน · Training N ครั้ง). **3 new pure helpers**: `resolveInsightWindow(rangeSpec, user)`, `formatInsightWindowLabel(start, end)`, `renderBpcRangeControls(rangeSpec, win)`. **`computeBodyProgressInsight` refactored** to accept optional `{ startDate, endDate, windowDays }` (back-compat preserved via positional-arg detection); the classifier itself untouched (single source of truth preserved — `classifyBodyProgressStatus` / `getInsightConfidence` / `computeBodyProgressInsight` / `renderInsightCard` each have exactly 1 definition). New persisted UI preference `state.bpcRange = { preset, startDate?, endDate? }` (defensive default `{ preset: '30d' }`, no schema migration needed). New handler `set-bpc-range-preset` + input listener for `bpc-range-start` / `bpc-range-end`. Timeline filters check-ins by selected range; header shows range label + filtered count + total count. Compare defaults to in-range check-ins for start-latest/prev-latest modes (custom-mode dropdowns still show all). Reports' insight uses Reports' own existing range selector (not `state.bpcRange`) — each surface's range is independent. Not-Enough-Data copy is now range-aware: lists which data is missing + suggests "ลองเลือกช่วงที่กว้างขึ้น หรือเพิ่มข้อมูล". All tone discipline preserved: BPC's `ไม่ได้แปลว่ากล้ามเพิ่ม` caveat still appears on possible-recomp branch (shared across BPC + Reports). Code-only · data files unchanged · no new schema fields on u.* · no IndexedDB writes. |
| v1.10.37 | T-013d.2 — Body Recomp Insight full detail in Reports tab. **Consolidation refinement on T-013d.1** per user request "ทำให้ดู Body Progress Center รายละเอียดเต็มๆได้ใน Tab รายงานด้วยเลย". Reports now reuses BPC's **full expandable `renderInsightCard`** (same expandable section showing "ทำไมเลขอาจไม่ตรง" + "สิ่งที่ควรเช็คต่อ" + Data confidence rows + privacy disclaimer) instead of a separate compact summary. **`renderReportsInsightSummary` deleted** — single source of truth strengthened: each of `classifyBodyProgressStatus`, `getInsightConfidence`, `computeBodyProgressInsight`, `renderInsightCard` now has exactly 1 definition. Reports adds a CTA row below the card: "📸 เริ่ม Body Check-in" (only when 0 check-ins) + "→ ดู Body Progress Center (Timeline / Compare)" (always). T-013d.1's `ยังไม่ยืนยันว่ากล้ามเพิ่ม` literal removed; BPC's existing `ไม่ได้แปลว่ากล้ามเพิ่ม` caveat now appears on Reports too via the shared component (semantically equivalent negation). Expand state per-view scoped (state.tmp resets on navigation); each surface starts collapsed by default. Code-only · data files unchanged · no new schema · no new handlers · no new event listeners. Net diff: index.html shrinks (removes ~115 lines of compact-summary renderer) while gaining ~12 lines of new call site + CTAs. |
| v1.10.36 | T-013d.1 — Body Recomp Insight summary in Reports tab. Surface addition only. **Reuses** existing `computeBodyProgressInsight(user)` from T-013d as single source of truth — NO duplicate classifier, NO duplicate confidence logic. **One new function**: `renderReportsInsightSummary(insight, user)` — compact card variant (vs T-013d's expandable BPC card). **Wired** into `renderReports` between waist stat-card and calorie stat-card (natural seam between body-comp data and intake data). Card shows: status badge + confidence + actual/predicted/gap weight numbers + waist (if available) + training-frequency line + one explanation line + one what-next line + CTA "→ ดูรายละเอียดใน Body Progress Center" (`nav-bpc`). Special compact variant for Not-Enough-Data lists missing prerequisites with conditional "📸 เริ่ม Body Check-in" CTA when `checkin_count === 0`. Possible-recomp branch includes mandatory caveat literal "ยังไม่ยืนยันว่ากล้ามเพิ่ม" (verified by grep: exactly 1 occurrence). Insight uses its own fixed 21-day window (independent of Reports' rolling/custom date range — synthesis stays stable as user toggles ranges). Zero new schema · zero new localStorage · zero new handlers · zero new event listeners · zero duplicate logic. |
| v1.10.35 | T-013d — Recomp Insight Card + Status Logic (4 of 4 split sub-tasks · **BPC Phase 1 MVP COMPLETE**). Conservative interpretation layer over weight/waist/deficit/check-in/training data — NO new schema. **9 new helpers**: `INSIGHT_THRESHOLDS` constants + `computeWeightTrend`, `computeWaistTrend`, `computePredictedLossFromDeficit`, `computeCheckinSnapshot`, `computeTrainingFrequency`, `classifyBodyProgressStatus`, `getInsightConfidence`, `computeBodyProgressInsight`. **6 status labels**: fat-loss-confirmed · possible-recomp · water-noise-likely · review-needed · progress-in-motion · not-enough-data. **3 confidence tiers** (low/medium/high) with hard downgrade rules: possible-recomp capped at medium; missing waist downgrades one tier; 1 check-in downgrades one tier. Decision tree evaluates first-match-wins in order: not-enough → review-needed → water-noise → fat-loss → possible-recomp → progress-in-motion. **`renderInsightCard`** view component with collapsed/expanded modes shown on BPC home above latest check-in cards (when ≥1 check-in). Expandable shows "ที่ระบบเห็น" + "ทำไมเลขอาจไม่ตรง" + "สิ่งที่ควรเช็คต่อ" + confidence-detail rows. **Mandatory caveat enforced**: literal "ไม่ได้แปลว่ากล้ามเพิ่ม" appears exactly once in possible-recomp card. **1 new handler**: `toggle-insight-details`. Compare view gets only a small "back to insight" hint — no evaluation logic on compare. Tone audit clean: 0 `muscle gain` / `กล้ามขึ้น` / `แข็งแรงขึ้น` / `ดีขึ้น` / `แย่ลง` / `ล้มเหลว` / `ผอมลง` / `อ้วนขึ้น` / `ทำผิด`. Code-only · data files unchanged · no new schema · no new localStorage · no IndexedDB writes. |
| v1.10.34 | T-013c — Timeline + Viewer + Side-by-side Compare (3 of 4 split sub-tasks for BPC Phase 1 MVP). **Three new views** routed via `state.view`: `bpc-timeline` (full check-in list grouped by Thai month-year, each card has View/Edit/Delete), `bpc-viewer` (single check-in detail with Front/Side/Back angle tabs · neutral "ยังไม่มีรูปสำหรับมุมนี้" and "รูปนี้ไม่พบในเครื่องนี้" missing-states), `bpc-compare` (side-by-side compare · 3 modes: Start vs Latest · Previous vs Latest · เลือกเอง · 3 angles · diff card shows numbers-only with explicit signs, NO color coding, NO good/bad value-judgment language, explicit deferral pointer to T-013d). **BPC home updated**: Timeline button when ≥1 check-ins; Compare button when ≥2 (disabled-card explanation when 1); latest-card now also has View button. **6 new helpers**: `groupCheckInsByMonth`, `formatThaiMonthYear`, `fetchCheckinPhotoUrls`, `revokeUrlMap`, `computeCheckinDelta`, `pickCompareDefaults`. **6 new handlers**: `nav-bpc-timeline`, `nav-bpc-viewer`, `nav-bpc-compare`, `viewer-set-angle`, `compare-set-mode`, `compare-set-angle`. `delete-checkin` made context-aware (gracefully routes away from viewer/compare when the deleted check-in was being shown). Object URLs revoked on view exit. Code-only · data file hashes unchanged · IndexedDB read-only · no new localStorage keys. No T-013d/Phase-2 features leaked (audit verified: insight=roadmap-only, status label=roadmap-only, ghost/slider/video/getUserMedia=0 new). |
| v1.10.33 | T-013b.1 — Capture Source + Edit Check-in (hotfix on T-013b). **Two source buttons per angle:** "📷 ถ่ายใหม่" (`capture="environment"`) + "🖼️ เลือกรูปจากเครื่อง" (NO capture attr — mobile gallery now works for all 3 angles). **Edit mode:** existing saved check-ins editable via Edit button on BPC latest-check-in cards. Date/weight/waist/note/photos all editable; cancel preserves saved data; replaced blobs cleaned up only after successful save. **BPC entry:** up to 3 most-recent check-in cards (plain, no comparison — full timeline still T-013c) with Edit + Delete buttons. New helper `updateCheckIn(user, id, patch)`. `handleCheckinPhotoUpload` + `discardCheckinDraftWithCleanup` made mode-aware (preserve original blobs in edit mode). Draft extended with `mode` + `editingId` + `originalPhotoIds` (single per-user draft key; mode in payload). Resume banner copy adapts. **Snapshot fields preserved on edit** (`weight_7day_avg` etc. NOT recomputed — history stays accurate). New handlers: `edit-checkin`, `delete-checkin`, `checkin-remove-back` (edit mode only). Change-listener regex updated. Code-only · data file hashes unchanged. No T-013c/d features leaked (audit verified: timeline=0 new, ghost overlay=1 roadmap-only, slider=0, video=0, getUserMedia=0, muscle gain=0). |
| v1.10.32 | T-013b — Weekly Check-in Capture Flow (2 of 4 split sub-tasks for BPC Phase 1 MVP). Multi-step state machine (Front → Side → Back → Review) routed via `state.view = 'checkin'`. 5 new helpers: `compute7DayCheckinStats` (auto-fill bundle: weight/waist/deficit/protein-pass-rate/training counts) + 4 draft I/O helpers (`getCheckinDraft`/`setCheckinDraft`/`clearCheckinDraft`/`discardCheckinDraftWithCleanup`). Draft persists in localStorage (`pracal_checkin_draft_<userId>`), photo blobs saved to IndexedDB immediately on capture (resume-friendly across reloads, orphan cleanup on discard). File picker with `capture="environment"` is the **only** capture path for all 3 angles. Back step shows "📷 Timer/Video — มาใน Phase 2" placeholder (Timer Mode deferred per user instruction — kept contained & safe). BPC view: "เริ่ม Check-in" button enabled + resume banner on draft. Review step: auto-filled stats + editable weight/waist (nullable) + textarea note. Validation: Front + Side required. Neutral tone + privacy copy on every step. **Code-only** — no data file changes. No T-013c/d features leaked (audit verified: timeline=0, insight=0, ghost=0, slider=0, video=0, getUserMedia=0, muscle-gain claims=0). |
| v1.10.31 | T-013a — Body Progress Foundation (1 of 4 split sub-tasks for BPC Phase 1 MVP). IndexedDB `photos` store + 6 helpers (open/save/get/delete/list/getUrl) · `compressPhoto` (Canvas-based, 1080px JPEG q=0.75) · `u.checkIns[]` schema + migration · 4 check-in CRUD helpers · BPC view with empty state + privacy banner + roadmap. Dashboard chip + body-log link → BPC. No capture flow yet (T-013b). |
| v1.10.30 | T-012 — Waist circumference tracking. New `u.waist[]` schema · 8 waist helpers · weight-log view extended ("📊 บันทึกร่างกาย") with 2nd input + waist chart + waist history. Reports gets new "📐 รอบเอว" stat-card with line chart + waist:height ratio + health flag (WHO-based thresholds). `movingAverage`/`linearRegression`/`svgLineChart` generalized with optional `valueKey` (backward-compat). Code-only. |
| v1.10.29 | T-011 — Custom date range for Reports. 5th segmented button `📅 กำหนดเอง` reveals 2 native `<input type="date">` for arbitrary start/end picking. Mode toggles preserve state (rolling↔custom). New `keysBetween` helper · `rangeAggregate` refactored to accept number-or-`{start,end}` (backward-compatible). Auto-swap inverted dates · clamp end to today. Code-only. |
| v1.10.28 | T-010 — Reports chart interactivity + burn-line per-day fix. **Bug fix:** calorie chart's burn target line now renders per-day (varies with actual logged exercise) instead of flat average. **Feature:** tap any column in 3 daily charts → detail box shows date + exact values; tap again to clear; range change clears selection. Code-only. |
| v1.10.27 | T-009 — Reports redesign: range-based view `[7][14][30][90] วัน` (default 30) replaces month nav · 3 new daily-trend charts (calorie line w/ TDEE target, energy-balance color-coded bars, protein bars w/ target line) · existing weight chart preserved · 2 new generic chart helpers (`svgDailyLineChart`, `svgDailyBarChart`) · new `rangeAggregate` helper. Code-only; no `meals.json` change. |
| v1.10.26 | T-008 — add 9 protein add-ons across the 3 vegetarian สปาเก็ตตี้ entries (n30 cream / n33 marinara / n34 pesto). Research-driven pairings: ไก่ย่าง (universal) · แซลม่อน (cream/pesto) · เบคอน (cream) · ไส้กรอก (tomato) · กุ้ง (tomato/pesto). Bases byte-identical; only customizations arrays grew. Data version 1.10.12→1.10.13. |
| v1.10.25 | T-007 — add 9 สปาเก็ตตี้ variants (n28 คาโบนาร่า · n29 โบโลเนส · n30 ครีมเห็ด · n31 ผัดกะเพราหมู · n32 กุ้งกระเทียม · n33 มาริน่า · n34 เพสโต้ · n35 มีทบอล · n36 ทูน่า); each macro-verified per anchor + sanity-range; data version 1.10.11→1.10.12. Also codifies AGENTS.md Rule 17 + new `docs/specs/menu-addition-protocol.md` per user instruction. Calorie spectrum 400-700 cal. |
| v1.10.24 | T-006 — add 4 ขนมจีนแกงเขียวหวาน variants (n24 ไก่ · n25 ไก่ใส่ฟัก · n26 เนื้อ · n27 ลูกชิ้นปลา); each macro-verified against r14/m03/n12 anchors; data version 1.10.10→1.10.11 |
| v1.10.23 | T-005 — fix s02 (`baseCalories` 165→195) + m18 (`fat_g` 32→42) macro/calorie discrepancies caught by `tools/audit-meals.js`; data version 1.10.9→1.10.10 |
| v1.10.22 | Suggester — show all + search + sort + favorites toggle + compact row design |
| v1.10.21 | `confirm-1day-plan` also logs the fixed slot (Vitaday etc.) via snapshot |
| v1.10.20 | Swap drawer — show all alternatives + search bar (relax budget cap when searching) |
| v1.10.19 | Meal-plan swap drawer (bottom sheet) + plan-edit mode (separates modify from log) |
| v1.10.18 | Meal-plan UX overhaul: live BMR/TDEE breakdown + projection card + 1-day mode + dashboard chip relocation |
| v1.10.17 | Remove "💡 เมนูแนะนำ" dashboard section (redundant with suggester) |
| v1.10.16 | Suggester — meals-left splitter (1/2/3) + custom tolerance (±cal cap 50) |
| v1.10.15 | Fix stale "375 รายการ" hardcode in meal-plan setup callout |
| v1.10.14 | Phase 3/3 — full N-day meal-plan generator with per-slot swap |
| v1.10.13 | Phase 2/3 — real-time meal suggester ("มื้อต่อไปกินอะไรดี?") |
| v1.10.12 | Phase 1/3 — "ดูเมนูที่คล้ายกัน" on meal-detail |

Themes of the v1.10.x series: macro/calorie correctness (v1.10.0, v1.10.7, v1.10.8), database growth (v1.10.2, v1.10.9, v1.10.10), backdate flow (v1.10.3, v1.10.4), planning surfaces (v1.10.12 → v1.10.22).

---

## Hard Guardrails

> Do **not** change these without an explicit, written approval that names the system.

### Calculation correctness
- **`calcBMR(p)`** (Mifflin–St Jeor) and **`calcTDEE(p)`** — touched only with a numerical justification.
- **`goalZoneEval(...)`** — drives the dashboard ring (zones: `win` / `extra` / `danger-low` / `danger-high`). UI changes that re-shape the zone bands need approval.
- **`calorieFloor(p)`** — 1200 (♀) / 1500 (♂). WHO-based; do not soften silently.
- **`proteinTarget(p)`** — goal- and age-tuned (1.6× for lose, 1.8× for gain, 1.2× for maintain, 1.3× for elderly).
- **Macro consistency check (±15%)** in both Netlify functions. The check downgrades AI confidence when `protein×4 + carbs×4 + fat×9` diverges from `calories` by >15%. Removing it lets hallucinations through.

### Data integrity
- **`addLogEntry(entry, dateKey)`** — single write path for log entries. Snapshot fallback (`entry.snapshot`) is what allows fixed-slot meals, scanned products, and OCR'd labels to survive without a meals.json row. Do not bypass.
- **Log entry shape** — `{ id, mealId, sizePct, quantity, addons, customizations, snapshot, dateKey, loggedAt, nutrition_version }`. Reports, CSV export, and edit flow assume this shape.
- **`meals.json` schema** — the 375-meal database has a stable shape (`id`, `name`, `emoji`, `category`, `baseCalories`, `baseWeight_g`, macros, optional `customizations`, optional `addons`). Schema changes need a migration plan.
- **`localStorage` keys** — user data lives client-side; key/shape changes break existing installs without a migration.

### Auth / accounts / payments
- **No auth, no payments, no server data.** All user data is in `localStorage`. The only network calls outside of static assets are the two Netlify Functions, which only proxy to Anthropic.

### Constants that hide breakage
- **`MAX_USERS = 3`** — referenced in three rendering sites and the add-user handler. v1.10.6 deduped this to a single constant; do not re-introduce magic numbers.
- **Service worker `VERSION`** — must match `index.html`'s `VERSION` constant. A mismatch causes either no cache invalidation (users stuck on old build) or an immediate cache miss for current users.

### AI prompt contracts
- The reasoning prompts in `estimate-meal.js` and `extract-nutrition.js` are tuned to specific failure modes (egg hallucination on stir-fry-on-rice queries, sugar > carbs, per-100g vs per-serving confusion). They should be edited with care and a test plan, not casual rewrites.

### Deploy surface
- `netlify.toml` `[[redirects]]` `/api/*` → `/.netlify/functions/:splat` is the API contract that the frontend depends on. Renaming functions or changing the redirect breaks meal search and OCR.
- `netlify.toml` `[[headers]]` `no-cache` on `service-worker.js` and `index.html` is what makes version bumps actually reach users. Removing them strands users on stale builds.

---

## File Ownership Rules

These rules govern the Orchestrator + Subagent workflow (full detail in `AGENTS.md`):

1. **One agent per file at a time.** Two parallel agents must not edit the same file. If they need to, the work must be sequenced.
2. **Production-file edits are reserved for the DEV Integration Agent** unless another agent is *explicitly* assigned a specific production file in the task brief.
3. **Production files** for this repo:
   - `index.html`
   - `service-worker.js`
   - `manifest.json`
   - `netlify.toml`
   - `netlify/functions/*.js`
   - `meals.json`, `branded_products.json` (data, but treated as production)
4. **Doc-only files** (subagents may write these freely if their workstream owns them):
   - `PROJECT_STATE.md`, `AGENTS.md`, `TASK_BOARD.md`
   - `docs/**`
   - `tools/**` (READMEs and audit scripts; audit scripts must be read-only with respect to production)
5. **Cross-file changes** that touch multiple production files (typical: `index.html` + `service-worker.js` version bump, or a feature spanning UI + a Netlify function) must be planned in `docs/specs/` first and integrated by a single DEV Integration Agent pass.
6. **No agent may delete or rename existing tracked files** without naming the rationale and getting approval.

---

## Open Questions

These are unresolved and worth a human decision before related work starts.

1. ~~**`README.md` is stale.**~~ **Resolved by T-001.** README now reflects `v1.10.22`, includes pointers to `PROJECT_STATE.md` / `AGENTS.md` / `TASK_BOARD.md`, and the three stale phrases (`v1.0.0`, `85+`, `BMR-only`) are gone (`grep` audit clean).
2. **Test infrastructure: partial.** ~~No automated tests, no QA scripts, no fixtures.~~ T-003 added `tools/audit-meals.js` (macro consistency + correct top-level count for `meals.json`) — first piece of test tooling. T-004 codified the runtime policy for `tools/*` (see [DEC-002](docs/decisions/DEC-002-tools-runtime.md): JS canonical, PowerShell parallel-impl acceptable as fallback evidence). Still open: `audit-branded-products.js`, `audit-stale-counts.js`, `audit-version-bumps.js`, optional pre-commit hook integration. Build incrementally on approved tasks; no blanket "add CI" decision yet.
3. **Git tags / releases.** Versions live in code constants and commit subjects, not in `git tag`. Worth tagging retroactively (`v1.10.22` → tagged at `dc26955`) for easier rollback, or leave as-is?
4. **Branch strategy.** All work has been on `main` directly. Do we want feature branches + PRs for upcoming work, or keep direct-to-main with the operating model providing the gate?
5. **AI cost / observability.** No metrics on Netlify Function invocations, error rates, or Anthropic spend. Worth a passive log-and-report tool?
6. **Customizations + addons in `confirm-1day-plan` round-trip** — covered in v1.10.19/v1.10.21 but not exercised end-to-end in any test. Worth a smoke-test checklist in `docs/specs/`?

---

## Next Recommended Step

**Stop and wait for user approval to start a feature task.** The operating structure is now in place; the next safe action is one of:

1. **Pick an Active Epic** for `TASK_BOARD.md` — either a new feature or one of the open questions above (e.g., refresh README, write the smoke-test checklist).
2. **Resolve a guardrail open question** — e.g., decide on git tags / branch strategy.
3. **Author the first feature spec** in `docs/specs/` so future feature work has a template.

The Orchestrator will not start any of these without an explicit "go" naming which one.
