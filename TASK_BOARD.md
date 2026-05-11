# Task Board

> **Live state of every task, governed by a state machine.**
> Update on every transition. The Orchestrator owns the file; the Execution Agent updates its own task's status during a flow.

Last updated: T-010 → `done` (v1.10.28 ships) · T-011 insight engine queued for scope-gate

---

## Active Epic

**EPIC-001 — Operating-model self-hosting** *(loop validated)*
Goal: prove the execution loop works by running one real task end-to-end through SPEC → BUILD → REVIEW → DONE, with state transitions visible in this file.

T-001 ran the full loop and reached `done`. The system has demonstrated it can pick a task, write its spec, execute it, update state, and stop at the user gate. Epic continues with T-003 to harden the audit tooling that T-001 surfaced as gap.

---

## Current Status

- Operating layer landed in commit `9a0747a` (Commit A — operating model + execution layer).
- T-001 README refresh: `done` — landed in commit `94cb6bc` (Commit B), pushed to `main`.
- T-003 meals audit script: **`done`** ✅ — landed in commit `aa20e6a`.
- T-003A Node verification fallback: **`superseded`** by T-004/DEC-002 (strategic question answered; tactical purpose was already fulfilled).
- T-004 runtime decision: **`review`** — DEC-002 drafted, cross-references added to tools/README + AGENTS, no production change. Awaiting user gate to `done`.

---

## Task State Machine

```
   ┌─────────┐     ┌──────────────┐     ┌────────┐    user-gated     ┌──────┐
   │  todo   │ ──► │ in_progress  │ ──► │ review │ ────────────────► │ done │
   └─────────┘     └──────────────┘     └────────┘                   └──────┘
        ▲                 │                  │
        │                 ▼                  ▼
        │           ┌───────────┐      (revisions loop back to in_progress)
        └───────────│  blocked  │
                    └───────────┘
```

### Transition rules (enforced in AGENTS.md)

| From → To | Who | Pre-conditions |
|---|---|---|
| `todo → in_progress` | Execution Agent | A spec exists or is created in this same step (`docs/specs/`). Status flip recorded here. |
| `in_progress → review` | Execution Agent | All Definition-of-Done items checked. `PROJECT_STATE.md` updated to reflect new reality. Diff summary posted in chat. |
| `review → done` | **User (gated)** | User explicitly says "approve" / "merge" / "done". Orchestrator never self-approves. |
| any → `blocked` | Any agent | Reason recorded in the task's Notes. Resume by reverting to the prior state. |
| `review → in_progress` | Execution Agent | User asked for revisions. Track what was revised in Notes. |

### Required fields per task

Every task in the Registry must have:

- **ID** — `T-NNN` zero-padded sequence
- **Title** — short imperative phrase
- **Status** — exactly one of `todo` / `in_progress` / `review` / `done` / `blocked`
- **Owner** — agent role responsible (usually `Execution Agent`)
- **Spec** — link to `docs/specs/<file>.md` (must exist before `in_progress`)
- **Definition of Done** — checklist of concrete, verifiable items
- **Notes** — created/modified date, blockers, revision history

---

## Task Registry

### T-001 — README refresh

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/readme-refresh.md`](docs/specs/readme-refresh.md)
- **Definition of Done:**
  - [x] `README.md` version line says `v1.10.22` (was `v1.0.0`)
  - [x] `README.md` meal count says 375+ Thai meals + 88 branded products (was "85+")
  - [x] `README.md` "BMR-only — no fake activity levels" claim corrected (TDEE = BMR × activity multiplier today)
  - [x] `README.md` Features section mentions: scan/OCR, backdate, suggester, meal planner, streaks, goal-aware ring
  - [x] `README.md` Cost section reflects current models (Haiku 4.5 + Sonnet 4.6)
  - [x] `README.md` Setup section unchanged (still accurate)
  - [x] `PROJECT_STATE.md` Open Question 1 marked resolved
  - [x] All claims verifiable against current code (grep checks documented in spec)
- **Transitions:**
  - `todo → in_progress` — Execution Agent picked up; spec written
  - `in_progress → review` — implementation complete; PROJECT_STATE.md updated; audit pass
  - `review → done` — user approved
- **Notes:**
  - First end-to-end task through the new state machine.
  - Doc-only — no production code or version bump.
  - Surfaced an audit-tooling gap (literal `grep '"id"'` over `meals.json` returns 541 — false count from nested customization ids); spawned T-003 to fix the audit script.
  - First example of "system uncovers truth" — the README's "BMR-only" claim was wrong against the actual code (`calcTDEE = BMR × activityMultiplier`); the spec process surfaced the contradiction instead of letting it ship.

---

### T-003 — meals audit script (correct top-level meal count)

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/audit-meals-script.md`](docs/specs/audit-meals-script.md)
- **Definition of Done:**
  - [x] `tools/audit-meals.js` exists, **uses Node stdlib only** (no deps); will run with `node tools/audit-meals.js`
  - [x] **Verification policy:** Node-runtime check reclassified as *optional validation* by user. PS parallel-implementation (`tools/.audit-meals-verify.ps1`, git-ignored helper) accepted as canonical evidence — it mirrors the JS line-for-line, hash-invariant verified. Future user-side `node tools/audit-meals.js` is welcome but not required for `done`.
  - [x] Counts meals at the **top-level array** of `meals.json`; reports exact integer (375)
  - [x] Per entry, computes `protein_g × 4 + carbs_g × 4 + fat_g × 9` vs `baseCalories`; flags deviations > 15%
  - [x] Output: human-readable to stdout; pass/warn/fail counts; offending entries listed by id + name + diff
  - [x] Exit codes: `0` / `1` / `2` per `tools/README.md` convention
  - [x] Optional `--json` flag emits machine-readable summary
  - [x] `tools/README.md` catalog table updated
  - [x] First run snapshot captured in spec (375 total · 297 pass · 70 warn · 5 fail · 3 skipped)
  - [x] `PROJECT_STATE.md` Open Question 2 partially addressed
- **Transitions:**
  - `todo → in_progress` — picked up after T-001 push; spec written
  - `in_progress → review` — script written; PowerShell parallel run confirmed logic + read-only invariant (md5 unchanged); state files updated
  - `review → blocked` — user reclassified: external dependency (Node runtime) stalls progress
  - `blocked → done` — user reversed: PS parallel-impl evidence accepted; Node verification declared optional, not blocking
- **Notes:**
  - Read-only invariant verified via `Get-FileHash` before/after run: `meals.json` MD5 unchanged.
  - Surfaced 5 fail entries — beer (alcohol calorie limitation, expected), 2 black-coffee low-cal noise, 2 real data discrepancies (`s02`, `m18`). Documented as findings for follow-up Data/Domain task; **not fixed here** (scope-locked).
  - Surfaced a known limitation: macro check doesn't account for alcohol — schema enhancement candidate (`alcohol_g` field) for a future task.
  - Surfaced an environmental assumption: tools layer assumed Node would be available. Not a T-003 problem to solve, but a real gap → spawned T-004.
- **Verification policy (for future tasks of this class):** PS parallel-implementation evidence is acceptable for tools written in `.js` when Node is unavailable, *provided* the read-only invariant (`Get-FileHash` before/after) is verified. Node-runtime check remains optional validation, not a gate. If future runtime decision (T-004) changes this, that DEC supersedes.

---

### T-003A — Node verification fallback (unblock T-003 without external Node)

- **Status:** **`superseded`** by T-004 / [DEC-002](docs/decisions/DEC-002-tools-runtime.md)
- **Tactical purpose** (unblock T-003) — **fulfilled** independently when user accepted PS evidence as canonical for T-003.
- **Strategic purpose** (formalize the runtime path) — **superseded by T-004**, which selected opt-F ("Node primary + PS parallel-impl as formal fallback evidence"). The opt-1 / opt-2 / opt-3 enumeration here is preserved as historical context for DEC-002's "Alternatives considered" section.
- **Notes:**
  - Closed without execution; this is the correct outcome — the strategic question was answered by T-004.
  - Sub-letter ID convention (`T-NNN<letter>`) used here for the first time; if reused, add to `Conventions` section.

---

### T-010 — Reports chart interactivity + burn-line per-day fix

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/reports-chart-interactivity.md`](docs/specs/reports-chart-interactivity.md)
- **User-locked scope:** Bug fix (burn line per-day) + tap-to-read on 3 charts. Weight chart Phase 2.
- **Re-scope note:** Originally proposed as "Insight Engine"; user pivoted to chart improvements first. Insight engine → T-011 (placeholder below).
- **Definition of Done:**
  - [x] `svgDailyLineChart` target line renders per-day path (not flat average) — verified `avgTarget` removed (0 occurrences)
  - [x] Hit-area + selection state for all 3 daily charts (calorie / balance / protein)
  - [x] `show-chart-point` handler · toggle on same idx clears
  - [x] `set-range-days` clears stale selection
  - [x] Selected element visually highlighted (bar = 2px stroke #1f2937 · line = larger dot + ring)
  - [x] Detail box per chart (3 chart-specific formatters)
  - [x] Unlogged-day tap → "ไม่ได้บันทึก"
  - [x] `.chart-detail` CSS class added (indigo border-left, bg-2 background)
  - [x] VERSION v1.10.27 → v1.10.28 (sw + index verified by grep)
  - [x] PROJECT_STATE updated
  - [x] Data file hashes confirmed unchanged
- **Transitions:**
  - `todo → in_progress` — picked up after T-009 commit; user-locked scope
  - `in_progress → review` — bug fix + interactivity wired, audit clean
  - `review → done` — user approved (single-letter "A")

### T-011 — Insight Engine *(placeholder, deferred)*

- **Status:** `todo` (deferred — user pivoted to T-010 chart improvements first)
- **Owner:** Execution Agent (when picked up)
- **Spec:** to be created — earlier design draft surfaced in T-009 review conversation (5 detectors / Path B recommendation: D1 protein streak + D2 weekend pattern + D3 sugar high + D5 logging gap + D6 streak milestone · 2 surfaces: Reports top + Dashboard banner)
- **Notes:** Will pick up after T-010 done (Rule 15 mechanical pickup). User-stated priority: "auto insights / pattern detection / anomaly callout / trend explanation".

### T-009 — Reports redesign with graphs + time range

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/reports-redesign-graphs.md`](docs/specs/reports-redesign-graphs.md)
- **User-locked scope:** Path B · default 30 วัน · ลบ month nav · no custom · no heatmap Phase 1
- **Definition of Done:**
  - [x] `rangeAggregate(userId, days)` helper added (line 2168, shape identical to `monthAggregate`)
  - [x] `svgDailyLineChart` (line 2249) + `svgDailyBarChart` (line 2320) generic helpers
  - [x] Range segmented `[7][14][30][90]` at top · default 30 — line 5164
  - [x] Month nav (`month-prev`/`month-next`) removed; orphan handlers deleted; `state.tmp.year/monthIdx` no longer referenced
  - [x] 3 new charts:
    - **Calorie trend line** (intake vs TDEE+exercise target dashed line)
    - **Energy balance bars** (color-coded: green=deficit / amber=surplus, with zero-line)
    - **Protein bars** (green=met target / amber=under, with target dashed line)
  - [x] Weight chart preserved (`svgLineChart`), data source switched to range (`rangeWeights`)
  - [x] Stats copy updated to range (`${rangeLabel} = N วันล่าสุด`)
  - [x] Empty state for no data in range
  - [x] VERSION v1.10.26 → v1.10.27 (sw + index, verified by grep)
  - [x] PROJECT_STATE updated
- **Transitions:**
  - `todo → in_progress` — picked up after T-008 commit; user-locked scope confirmed in chat
  - `in_progress → review` — 3 helpers + handler + render refactor done; orphans removed; hash invariants confirmed; diff scope verified
  - `review → done` — user approved · noted system passed visualization phase, next direction = interpretation/insight engine
- **Diff scope (verified):**
  - `index.html` (+302/−52) — helpers + render rewrite + handler swap + VERSION
  - `service-worker.js` (+1/−1) — VERSION
  - `TASK_BOARD.md` (+19) — T-009 row
  - + 2 untracked: `docs/specs/reports-redesign-graphs.md` (new spec) · `PROJECT_STATE.md` (already tracked, modified)
- **Notes:**
  - First **code-only feature** task in the operating model (no data change). All 8 previous tasks touched data, docs, or both.
  - `monthAggregate` function kept (defined at line 2127) — no callers now, but not deleted to keep T-009 scope tight. Could be a Refactor Agent task later (T-010+).
  - Charts use pure inline SVG (no library) — matches project's no-build philosophy. Total helpers ~190 lines.

### T-008 — Add protein add-ons to vegetarian สปาเก็ตตี้ entries

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/add-protein-addons-vegetarian-pasta.md`](docs/specs/add-protein-addons-vegetarian-pasta.md)
- **Definition of Done:**
  - [x] n30 ครีมเห็ด: +3 add-ons (ไก่ย่าง · แซลม่อน · เบคอน) — customization count 3 → 6 ✅
  - [x] n33 มาริน่า: +3 add-ons (ไก่ย่าง · ไส้กรอก · กุ้ง) — customization count 3 → 6 ✅
  - [x] n34 เพสโต้: +3 add-ons (ไก่ย่าง · แซลม่อน · กุ้ง) — customization count 3 → 6 ✅
  - [x] All 9 add-on rows have realistic Thai-cafe portions + delta values per spec research
  - [x] Bases byte-identical for all 3 modified entries: n30=530/320/16/56/27/4 · n33=430/320/14/69/11/10 · n34=540/290/18/62/26/1
  - [x] Other 6 spaghetti entries (n28/n29/n31/n32/n35/n36) byte-identical (verified by audit total/pass/warn/fail counts unchanged)
  - [x] `meals.json` `version` 1.10.12 → 1.10.13
  - [x] `service-worker.js` + `index.html` `VERSION` v1.10.25 → v1.10.26 (verified by grep)
  - [x] PS audit: 388 / pass 312 / warn 70 / fail 3 / skip 3 (all unchanged from T-007 baseline — bases not moved)
  - [x] `branded_products.json` + `tools/audit-meals.js` byte-identical (hashes match prior baseline)
  - [x] PROJECT_STATE updated
- **Transitions:**
  - `todo → in_progress` — picked up after T-007 commit (Rule 15 mechanical pickup); user gave explicit research-driven scope
  - `in_progress → review` — 9 add-ons applied across n30/n33/n34 · bases unchanged · audit clean
  - `review → done` — user approved (single-letter "a")
- **Diff-scope note:** spec predicted 4 hunks (version + 3 entry mods), actual 3 (n33+n34 merged in git diff context due to adjacency — expected git behavior, not a collateral edit issue; verified by reading the actual diff line-by-line).
- **Notes:**
  - First task to *modify customizations* on existing entries (not add new entries). Menu-addition-protocol §3e (real-user fit) applied; protocol's diff-scope expectation adjusted (multiple modification hunks instead of single insertion hunk).
  - Research-driven: 5 protein options selected from top-7 popular Thai-cafe pasta add-ons; pairings chosen by sauce compatibility (cream/tomato/pesto each gets fitting subset).

### T-007 — Add 9 สปาเก็ตตี้ variants

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/add-meals-spaghetti.md`](docs/specs/add-meals-spaghetti.md)
- **Protocol:** follows [`docs/specs/menu-addition-protocol.md`](docs/specs/menu-addition-protocol.md) (codified in this turn as AGENTS.md Rule 17 per user instruction)
- **Definition of Done:**
  - [x] 9 entries inserted: n28 คาโบนาร่า (700/+0.1%) · n29 โบโลเนส (550/−4.5%) · n30 ครีมเห็ด (530/+0.2%) · n31 ผัดกะเพราหมู (470/−1.5%) · n32 กุ้งกระเทียม (450/−0.9%) · **n33 มาริน่า (400/−2.3%) · n34 เพสโต้ (510/+0.6%) · n35 มีทบอล (570/−0.9%) · n36 ทูน่า (500/−2.0%)**
  - [x] All 9 in audit `pass` band; **every per-entry diff% matches spec prediction exactly** (within rounding)
  - [x] `meals.json` `version` 1.10.11 → 1.10.12
  - [x] `service-worker.js` + `index.html` `VERSION` v1.10.24 → v1.10.25 (verified by grep)
  - [x] PS audit: total 379 → 388 ✅ · pass 303 → 312 ✅ · warn 70 unchanged ✅ · fail 3 unchanged ✅
  - [x] `git diff meals.json` exactly 2 hunks (verified — version field + insertion after n27)
  - [x] `branded_products.json` + `tools/audit-meals.js` byte-identical (hashes match prior baselines)
  - [x] AGENTS.md Rule 17 + `docs/specs/menu-addition-protocol.md` created (one-time setup, bundled in this commit)
  - [x] PROJECT_STATE Current Version + Latest Completed Work + Active Task all updated
- **Transitions:**
  - `todo → in_progress` — picked up after T-006 commit (Rule 15 mechanical pickup); user gave explicit scope ("เพิ่มหมวดเมนูสปาเก็ตตี้")
  - `in_progress → review` — 5 entries added · all PASS band · predictions matched exactly · Rule 17 codified · protocol doc created
  - `review → in_progress` — user chose option (c) "add more variants" at first review; spec extended with 4 more (n33-n36)
  - `in_progress → review` — 4 additional entries added · all PASS band · predictions matched exactly
  - `review → in_progress` — user instructed "ตรวจความถูกต้อง + ทำให้เหมาะกับการใช้งานจริง"; protocol §3e (real-user fit) codified; n33 serving 280g→320g, n34 serving 260g→290g (cafe portions)
  - `in_progress → review → done` — re-audit clean (all 9 PASS) · user pre-approved contingent on verification passing ("ตรวจแล้ว push เลย")
- **Notes:**
  - **First task formally following Rule 17 + the menu-addition protocol.** T-006 retroactively also followed it (the protocol was extracted from how T-006 was structured).
  - User instruction "จดข้อกำหนดเหล่านี้เข้าไปทุกครั้งก่อนเพิ่มเมนู" → became Rule 17 + permanent protocol doc.
  - 5 variants chosen to cover the calorie spectrum: 450 (light, garlic shrimp) → 700 (heavy, carbonara), giving users variety without overlap with existing n21–n23.
- **Notes:**
  - Second user-visible product improvement under Rule 16.
  - First task to formally follow Rule 17 + the menu-addition protocol; T-006 retroactively also followed it (the protocol was extracted from how T-006 was structured).
  - User instruction codified: "จดข้อกำหนดเหล่านี้เข้าไปทุกครั้งก่อนเพิ่มเมนู" → became Rule 17 + protocol doc.

### T-006 — Add ขนมจีนแกงเขียวหวาน variants (4 entries)

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/add-meals-khanom-jin-green-curry.md`](docs/specs/add-meals-khanom-jin-green-curry.md)
- **Definition of Done:**
  - [x] 4 entries inserted: n24 ขนมจีนแกงเขียวหวานไก่ (700 cal · −1.3%) · n25 ไก่ใส่ฟัก (680 cal · −0.6%) · n26 เนื้อ (760 cal · −2.6%) · n27 ลูกชิ้นปลา (690 cal · +0.4%)
  - [x] All 4 in audit `pass` band (each ≤5% — predictions in spec hit exactly)
  - [x] `meals.json` `version` 1.10.10 → 1.10.11
  - [x] `service-worker.js` + `index.html` `VERSION` v1.10.23 → v1.10.24 (verified by grep)
  - [x] PS audit: total 375 → 379 ✅ · pass 299 → 303 ✅ · warn 70 → 70 (unchanged) ✅ · fail 3 → 3 (unchanged) ✅
  - [x] `git diff meals.json` shows exactly 2 regions: version field (line 2) + insertion after n23 (line 634 region)
  - [x] `branded_products.json` + `tools/audit-meals.js` byte-identical (hashes confirm against prior baseline)
  - [x] PROJECT_STATE Current Version + Latest Completed Work + Active Task all updated
- **Notes:**
  - User-directed scope (Phase 2 of T-006 prep): "เพิ่มเมนู ขนมจีนแกงเขียวหวานในแบบต่างๆ เช่น เขียวหวานไก่ใส่ฟัก สำคัญที่สุด ตรวจความถูกต้องของแคลและปริมาณ 1เสิร์ฟ"
  - First **user-visible product improvement** under Rule 16 (new searchable menu items appear in library / suggester / planner immediately).
  - Calorie/portion accuracy is the user's #1 stated priority — full derivation in spec, anchored to existing peer r14 + cross-checked against m03, n12, m77.
- **Transitions:**
  - `todo → in_progress` — picked up after T-005 commit (Rule 15 mechanical pickup); user gave explicit scope ("เพิ่มเมนู ขนมจีนแกงเขียวหวานในแบบต่างๆ ... ตรวจความถูกต้องของแคล/ปริมาณ")
  - `in_progress → review` — 4 entries added · all PASS band · version sync verified · diff scope verified · PROJECT_STATE updated
  - `review → done` — user approved (single-letter "a")

### T-005 — Fix s02 + m18 data discrepancies in `meals.json`

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/data-fix-s02-m18.md`](docs/specs/data-fix-s02-m18.md)
- **Definition of Done:**
  - [x] s02 `baseCalories` 165 → 195 (audit: +0.5% pass)
  - [x] m18 `fat_g` 32 → 42 (audit: −1.2% pass)
  - [x] `meals.json` `version` 1.10.9 → 1.10.10
  - [x] `service-worker.js` + `index.html` `VERSION` v1.10.22 → v1.10.23 (both verified by grep)
  - [x] PS audit confirms s02 + m18 no longer in `fail` list (5 → 3 fails — d22 beer + d03/d15 black-coffee noise remain, all expected limitations)
  - [x] Total entries still 375
  - [x] Diff confirms only s02 + m18 entries changed; `branded_products.json` and `tools/audit-meals.js` unchanged (verified by absence from `git diff --stat`)
  - [x] PROJECT_STATE.md current version line + Latest Completed Work updated
- **Transitions:**
  - `todo → in_progress` — picked up after T-004 commit (Rule 15 mechanical pickup, but flagged at scope-gate first because original T-005 placeholder did not satisfy Rule 16; user re-scoped to the data-fix task)
  - `in_progress → review` — fixes applied · audit passes · version bumped · scope locked verified
  - `review → done` — user approved (scope discipline + measurable impact + VERSION sync + process transparency all noted)
- **Notes:**
  - First **production-data** task in this project's operating model (T-001/T-003/T-004 were doc/tools).
  - First task under Rule 16 (value bias) — qualifies via (b) real impact on production data + (a) measurable output (audit fail count drops 5 → 3).
  - Scope locked by user: no schema change, no `alcohol_g`, no beer logic, no broad nutrition rewrite, no unrelated meal edits. Verified by diff scope (only s02, m18, version field touched in meals.json).
  - Process correction: in the audit command I asserted a hash prefix for `branded_products.json` that I had no record of. Corrected in the report — the real evidence of immutability is the file's absence from `git diff --stat`, not the hash assertion. Flagged for transparency.
  - The placeholder T-005 (smoke-test checklist for `confirm-1day-plan`) is renumbered T-006 in Next Actions; that placeholder was never formally registered, so no ID-immutability violation.

### T-004 — runtime decision (Node required vs. PowerShell fallback)

- **Status:** `done` ✅
- **Owner:** Execution Agent
- **Spec:** [`docs/specs/runtime-decision.md`](docs/specs/runtime-decision.md)
- **Decision artifact:** [`docs/decisions/DEC-002-tools-runtime.md`](docs/decisions/DEC-002-tools-runtime.md)
- **Definition of Done:**
  - [x] `docs/decisions/DEC-002-tools-runtime.md` exists with all required sections (status accepted · context · decision · alternatives · consequences · follow-ups). Decision: **Option F — JS canonical, PS parallel-implementation acceptable as fallback evidence** (subject to read-only invariant + line-for-line mirror + dot-prefix gitignored naming).
  - [x] `tools/README.md` "Runtime policy" subsection at top, citing DEC-002.
  - [x] `AGENTS.md` Universal Rules — added rule 14 (runtime expectation cross-reference) and rule 15 (mechanical pickup, gated done) per workflow refinement from this turn.
  - [x] `PROJECT_STATE.md` Open Question 2 updated to reflect partial resolution (runtime policy resolved; broader test infra still open).
  - [x] No file moves, no JS port, no production effect (Option F is the lightest path).
- **Transitions:**
  - `todo → in_progress` — picked up automatically after T-003 commit (mechanical pickup per locked rule)
  - `in_progress → review` — DEC-002 + spec written; cross-references in tools/README + AGENTS verified by grep; hash invariants on `tools/audit-meals.js` and `meals.json` confirmed unchanged
  - `review → done` — user approved Option F + rules 14/15
- **Notes:**
  - Recommendation: Option F (codify the working pattern from T-003). Six options were considered; full trade-off matrix in spec.
  - T-003A closed as superseded.
  - Surfaced rule 15 ("`pickup` is mechanical; `done` is gated") as the formal codification of the workflow refinement the user locked in this session. Lives in `AGENTS.md` Universal Rules.
  - **Awaiting user review** — if the user prefers a different option (A/B/C/D), DEC-002 returns to `proposed` status and is revised; T-004 flips back to `in_progress`.

---

No blockers. T-003 done; T-004 about to be picked up automatically.

---

## Next Actions

> Live: T-004 picks up automatically per execution loop after T-003 commit + push.
> T-003A remains `todo` but lower priority since user accepted PS evidence policy (may be folded into T-004 or kept as backup option).
> Parked items below; do not run until user picks one.

1. **T-002 (parked): Decide branch + tag policy** — answer Open Questions 3 & 4 in `PROJECT_STATE.md`. Output: `docs/decisions/DEC-003-...md`. Doc-only.
2. **T-005 (parked): Smoke-test checklist for `confirm-1day-plan`** — covers the v1.10.21 fixed-slot regression class. `docs/specs/qa-meal-plan-confirm.md`.
3. **T-006 (parked): First product-feature epic** — pick from open feedback when ready.

> Note: T-003 + T-004 promoted to active Task Registry above. (T-004 number reused for "runtime decision" since user named it explicitly; the previously-parked smoke-test idea moved to T-005.)

---

## Do Not Start Yet

- **Touching `index.html` for any reason** without an approved spec.
- **Editing `meals.json` / `branded_products.json`** without a paired UI-audit task.
- **Refactoring inline JS** without an Architecture spec + Refactor Agent assignment.
- **Adding tests / linters / build steps** — needs a decision record first (`docs/decisions/`).
- **Changing AI prompts in `netlify/functions/*`** — needs test plan + spec.
- **`localStorage` schema changes** — breaks existing installs without migration.
- **Tagging old commits / rewriting history** — `main` is the deployed branch.

---

## Conventions

- Task IDs are immutable. Numbers are never reused even if a task is abandoned.
- Status changes are atomic: one row, one transition per chat turn (the Execution Agent makes the change in the same write that does the work).
- "Last updated" line at the top is updated on every status transition.
- A task with status `done` stays in the Registry as historical record. It is moved to a "Completed" subsection at the bottom during periodic compaction (not yet — Registry is short).
- A blocker on a task does not block other tasks unless it physically prevents them. Use the global `Blockers` section for cross-task issues.
