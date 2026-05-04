# Project State

> **Source of truth for what this project is, what's running, and what cannot change without approval.**
> Read this file first before any task. Update it when reality changes.

---

## Current Version / Current Build

- **App version:** `v1.10.22` (set in two places — must be kept in sync):
  - `index.html` — `const VERSION = 'v1.10.22';` (used at runtime, e.g., update banner / GET_VERSION message)
  - `service-worker.js` — `const VERSION = 'v1.10.22';` (drives cache name `pracal-${VERSION}` and cache invalidation)
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

**EPIC-001 — Operating-model self-hosting** *(loop validated by T-001 + T-003)*.

- T-001 (README refresh) — `done` ✅
- T-003 (meals audit script) — `done` ✅ (PS parallel-impl evidence accepted as canonical; Node-runtime check declared optional)
- T-003A (Node verification fallback) — `todo`, lower priority since user accepted PS evidence policy
- T-004 (runtime decision DEC-002) — `todo`, picks up automatically per execution loop after T-003 commit + push

Loop has now demonstrated: pick → spec → execute → audit → state update → review → done · gate, twice. Continuous execution rule active: pickup of the next `todo` is mechanical when there's no blocker.

---

## Latest Completed Work

Recent shipped commits, newest first (from `git log`):

| Version | Summary |
|---|---|
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
2. **Test infrastructure: partial.** ~~No automated tests, no QA scripts, no fixtures.~~ T-003 added `tools/audit-meals.js` (macro consistency + correct top-level count for `meals.json`) — first piece of test tooling. Still open: `audit-branded-products.js`, `audit-stale-counts.js`, `audit-version-bumps.js`, optional pre-commit hook integration. Build incrementally on approved tasks; no blanket "add CI" decision yet.
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
