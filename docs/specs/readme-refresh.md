# T-001 — README refresh

**Status:** approved (doc-only, low risk, scope explicit in TASK_BOARD)
**Owner:** Execution Agent
**Related:** `PROJECT_STATE.md` Open Question 1, `TASK_BOARD.md` T-001

---

## Goal

Bring `README.md` in sync with current reality (`v1.10.22`). The current README dates from `v1.0.0` and contains three concrete inaccuracies plus large gaps where features have been added. The goal is a marketing-style overview that doesn't *contradict* the engineering truth in `PROJECT_STATE.md`.

## Non-goals

- Not turning `README.md` into engineering documentation (that's `PROJECT_STATE.md`'s job).
- Not adding badges, ToC, fancy sections, or screenshots.
- Not changing `Setup` instructions — those are still accurate (Netlify deploy, env var, install on phone).
- Not updating `manifest.json` description, `index.html` strings, or any other surface (out of scope, can be its own task).
- Not adding a CHANGELOG (would need its own decision).

## Inaccuracies to fix (verified against code)

| Claim in current README | Reality | Verified by |
|---|---|---|
| `## Version v1.0.0` | `v1.10.22` | `service-worker.js:1` `const VERSION = 'v1.10.22'` and `index.html` `const VERSION = 'v1.10.22'` |
| "85+ preloaded Thai meals" | 375 Thai meals + 88 branded products | `meals.json` has 375 entries (data version 1.10.9); `branded_products.json` has 88; commits v1.10.2 (+187), v1.10.9 (+47) |
| "BMR-only calculation — no fake activity levels, you add activity yourself" | TDEE = BMR × activity multiplier; user picks an activity level (sedentary/light/moderate/...) and may also log exercise on top depending on the level's `includesExercise` flag | `index.html` `calcTDEE(p) = Math.round(calcBMR(p) * activityMultiplier(p))`; `ACTIVITY_LABELS` table with multipliers 1.2–1.9 |

## Gaps to fill

Features shipped between `v1.0.0` and `v1.10.22` that the README omits:

- **Barcode scan + nutrition-label OCR** (`extract-nutrition.js`, OCR scanner views)
- **Backdate logging** up to 30 days (v1.10.3, v1.10.4)
- **Goal-aware ring** with zones (v1.9.0)
- **Streaks + freeze tokens** (v1.9.1)
- **Real-time meal suggester** "มื้อต่อไปกินอะไรดี?" (v1.10.13 → v1.10.22)
- **Meal planner** 1/3/7/14 days with swap drawer + plan-edit mode (v1.10.14 → v1.10.21)
- **Special meals** (buffet / restaurant aggregate)
- **Custom meals + customizations** (radio groups for meal options)
- **Reports + weight log**

## Entry points / state changes / affected views

None. Doc-only.

## Workflows that must keep working

None affected directly. The README is read by humans browsing GitHub; no code reads it.

Indirect: `Setup` section is the install path. Verified to still match `netlify.toml` (`functions = "netlify/functions"`, `publish = "."`, `[[redirects]] /api/* → /.netlify/functions/:splat`). No change needed.

## Hard guardrails touched

None. README is doc.

## Test plan

Manual verification after edit:

1. Open `README.md` in a markdown preview.
2. Confirm version section says `v1.10.22` and references both `service-worker.js` and `index.html` for the bump.
3. Confirm meal count says `375 + 88` and matches the actual file row counts:
   - `meals.json`: count of `"id"` lines (≈375)
   - `branded_products.json`: count of entries (=88)
4. Confirm "BMR-only" claim is removed/corrected.
5. Confirm Setup steps 1–4 are unchanged.
6. Confirm Cost section reflects current model names (Haiku 4.5 + Sonnet 4.6) and order-of-magnitude numbers.
7. Confirm a pointer to `PROJECT_STATE.md` exists for engineering truth.
8. `grep -E "v1\.0\.0|85\+|BMR-only" README.md` returns 0 matches (the three stale phrases gone).

## Definition of Done (mirrored in TASK_BOARD)

See T-001 in `TASK_BOARD.md`. Each box is checked when the corresponding evidence is produced.

## Rollback plan

`git checkout README.md` (single-file revert). No version unbump needed (no `VERSION` constants touched).

## Open questions

None at write-time. If the user prefers a different tone (more terse / more marketing-y), revise during the `review` gate before transitioning to `done`.
