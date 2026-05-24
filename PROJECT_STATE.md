# Project State

> **Source of truth for what this project is, what's running, and what cannot change without approval.**
> Read this file first before any task. Update it when reality changes.

---

## Current Version / Current Build

- **App version:** `v1.10.34` (set in two places — must be kept in sync):
  - `index.html` — `const VERSION = 'v1.10.34';` (used at runtime, e.g., update banner / GET_VERSION message)
  - `service-worker.js` — `const VERSION = 'v1.10.34';` (drives cache name `pracal-${VERSION}` and cache invalidation)
- **`meals.json` data version:** `1.10.13` (unchanged in T-013c; code-only task).
- **User schema:** `u.waist = []` (T-012), `u.checkIns = []` (T-013a). Check-in entries gain optional `updatedAt: number` field in T-013b.1 (no migration needed; absent = original entry). Auto-migrated.
- **IndexedDB:** database `PraCaLBodyProgress` (v1) with `photos` store. Lazy-init on first photo save (T-013a + T-013b + T-013b.1). T-013c is read-only over this store.
- **localStorage draft key:** `pracal_checkin_draft_<userId>` — holds in-progress check-in across reloads (T-013b). T-013b.1 extended the draft JSON with `mode: 'new' | 'edit'`, `editingId`, `originalPhotoIds`. T-013c added no new localStorage keys (viewer/compare are read-only views).
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

**No active task** as of v1.10.34 ship. T-013c done — Timeline + Viewer + Side-by-side Compare live (3 new views, 6 helpers, 6 handlers, neutral tone enforced on diff card). **T-013d HOLD** per explicit user instruction "Do not start T-013d until I approve the next pickup" — mechanical pickup remains suspended; wait for next approval before starting Recomp Insight Card + Status Logic.

15 tasks through operating model. **T-013d** still blocked (HOLD) · **T-014/T-015** = BPC Phase 2/3 · **T-016 Insight Engine** = 5th deferral.

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
- T-013d (Recomp Insight Card + Status Logic) — `todo`, blocked (HOLD per user instruction)
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
