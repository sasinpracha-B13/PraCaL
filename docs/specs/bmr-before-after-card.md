# T-020 — "BMR ปรับตามน้ำหนักจริง" before/after card in Settings

**Status:** approved
**Owner:** Execution Agent
**Related:** T-019 (dynamic BMR · v1.10.45) — this surfaces T-019's effect visibly

---

## 1. Goal

User couldn't tell whether T-019's dynamic-BMR change took effect. Add a **read-only before/after card** in the Settings (ตั้งค่า) screen that shows, when the logged weight differs from the onboarding snapshot:

- น้ำหนักโปรไฟล์ (snapshot) vs น้ำหนักล่าสุด (7-day avg) + delta
- BMR / TDEE / เป้าแคล / เป้าโปรตีน — **old → new** with deltas

So the user sees concretely that their target moved with their weight.

## 2. Non-goals

- ❌ Touching `calcBMR` / `calcTDEE` / `proteinTarget` / `defaultCalorieTarget` (read-only — reuse as-is; **no guardrail change**)
- ❌ Schema changes / data file changes
- ❌ New handlers / event listeners
- ❌ Color-coding deltas as good/bad (neutral tone per T-013 discipline — direction arrow only, no green=good/red=bad)
- ❌ Showing the card when there's nothing to compare (weight matches snapshot → no card)
- ❌ Dashboard changes (the breakdown note from T-019 already lives there; this card is Settings-only per user request "ในหน้าโปรไฟล์")

## 3. Design

### Placement

In `renderSettings()`, immediately **after** the "📊 เป้าแคลอรี่/วัน" card and **before** the "🥩 เป้าโปรตีน/วัน" card. Rendered via an IIFE that returns `''` when no meaningful weight difference exists (card simply absent).

### Trigger condition

```js
const snapW = Number(u.weight) || 0;
const effW  = effectiveBodyWeight(u);
const show  = snapW > 0 && Math.abs(effW - snapW) >= 0.5;   // same 0.5 kg threshold as the T-019 breakdown note
```

### Computation (reuses existing functions — single source of truth)

```js
// Snapshot pseudo-user = original onboarding weight + age (no log, no birthYear)
const snapU = { ...u, weights: [], birthYear: undefined };
const bmrSnap  = Math.round(calcBMR(snapU)),   bmrNow  = Math.round(calcBMR(u));
const tdeeSnap = calcTDEE(snapU),               tdeeNow = calcTDEE(u);
const tgtSnap  = defaultCalorieTarget(snapU),   tgtNow  = defaultCalorieTarget(u);
const protSnap = proteinTarget(snapU),          protNow = proteinTarget(u);
```

`effectiveBodyWeight(snapU)` → `[]` log → falls back to `snapU.weight` (= snapshot). `effectiveAge(snapU)` → `birthYear: undefined` → falls back to `snapU.age`. So the snapshot column reflects the original onboarding state; the "now" column reflects current weight + current age. Any age delta (year rollover) folds naturally into the BMR numbers.

### Card layout

```
┌──────────────────────────────────────────┐
│ 📊 BMR ปรับตามน้ำหนักจริง                 │
│                                           │
│ น้ำหนักโปรไฟล์      80.0 kg               │
│ น้ำหนักล่าสุด       78.0 kg  ⬇️ −2.0      │
│ (เฉลี่ย 7 วัน)                             │
│ ──────────────────────────────           │
│ BMR          1650 → 1630   (−20)          │
│ TDEE         2558 → 2527   (−31)          │
│ เป้าแคล/วัน    2058 → 2027   (−31)         │
│ โปรตีน/วัน      128 → 125 ก. (−3)          │
│                                           │
│ 💡 เป้าปรับอัตโนมัติตามน้ำหนักล่าสุด ·     │
│    log น้ำหนักสม่ำเสมอ = เป้าแม่นขึ้น       │
└──────────────────────────────────────────┘
```

- Weight delta: `⬇️`/`⬆️` arrow + signed number, **muted color** (no good/bad semantics)
- Old→new rows: arrow `→`, delta in parentheses, muted
- One-line hint at the bottom explaining the auto-adjust

## 4. Affected files

| File | Change |
|---|---|
| `index.html` | One IIFE card block in `renderSettings` (after เป้าแคลอรี่ card) · VERSION |
| `service-worker.js` | VERSION → v1.10.46 |
| `docs/specs/bmr-before-after-card.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-020 entry |

## 5. Hard guardrails

- No change to `calcBMR` / `calcTDEE` / `proteinTarget` / `defaultCalorieTarget` / `calorieFloor` — read-only reuse
- No data file changes · no schema changes · no new handlers/listeners
- VERSION sync (`index.html` ↔ `service-worker.js`)
- Card absent when weight matches snapshot (no false "your target changed" when it didn't)
- Neutral tone — deltas not colored good/bad

## 6. Definition of Done

- [ ] IIFE card block added in `renderSettings` after the "เป้าแคลอรี่/วัน" card
- [ ] Card shows only when `|effW − snapW| ≥ 0.5 kg`
- [ ] Snapshot pseudo-user `{ ...u, weights: [], birthYear: undefined }` drives the "before" column
- [ ] Rows: weight (profile vs latest + Δ), BMR, TDEE, calorie target, protein target — each old → new (Δ)
- [ ] Deltas neutral-colored (arrow only, no green=good/red=bad)
- [ ] Bottom hint explaining auto-adjust
- [ ] Reuses `calcBMR`/`calcTDEE`/`defaultCalorieTarget`/`proteinTarget` — no edits to those
- [ ] VERSION v1.10.45 → v1.10.46 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## 7. Test plan

1. **User with no weight change** (logged = profile, or no log) → card absent (correct)
2. **Log a weight −2 kg from profile** → open Settings → card appears: profile 80 / latest 78 / BMR/TDEE/target/protein all show old→new with negative deltas
3. **Log a weight +2 kg** → card shows ⬆️ + positive deltas
4. **Multi-day log (79/78/77)** → "latest" shows 78.0 (7-day avg), not 77
5. **Floor case**: very light user whose new target would dip below floor → "now" target clamps at 1200♀/1500♂ (since it reuses `defaultCalorieTarget`)
6. **No regression**: other Settings cards (profile facts, calorie target, protein, streaks, weight, products) render unchanged

## 8. Rollback plan

`git revert <T-020 commit>` removes the card block. T-019 behavior and all other Settings cards untouched.

## 9. Open questions (locked)

- **Also on dashboard?** No — T-019 already shows the one-line "⚖️ คำนวณจากน้ำหนักล่าสุด" note on the dashboard breakdown. This fuller before/after card is Settings-only to avoid dashboard clutter.
- **Color the "good" direction?** No — neutral per T-013 tone discipline. A weight-loss user's BMR dropping is physics, not a judgment.
