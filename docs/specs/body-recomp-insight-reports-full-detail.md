# T-013d.2 — Body Recomp Insight: full detail card in Reports tab

**Status:** approved (small refinement on T-013d.1)
**Owner:** Execution Agent
**Related:** `TASK_BOARD.md` T-013d.2 · T-013d.1 (done · v1.10.36) · T-013d (done · v1.10.35)

> **Refinement scope:** T-013d.1 added a *compact* Body Recomp Insight summary to Reports. User now wants the *full* expandable detail (same as BPC) in Reports too. This task swaps the compact `renderReportsInsightSummary` for the existing `renderInsightCard` from T-013d, preserving single source of truth.

---

## Why

User feedback after v1.10.36: "ทำให้ดู Body Progress Center รายละเอียดเต็มๆ ได้ใน Tab รายงานด้วยเลย." The compact card on Reports surfaces the status/confidence/numbers, but not the deeper "ทำไมเลขอาจไม่ตรง · สิ่งที่ควรเช็คต่อ · Data confidence" sections that BPC has. Users browsing Reports want the same depth without context-switching to BPC.

## Non-goals (forbidden in this sub-task · audited at gate)

- ❌ Duplicate the classifier — must remain single source of truth (T-013d's `classifyBodyProgressStatus` + `getInsightConfidence` + `computeBodyProgressInsight` stay as the only definitions)
- ❌ Build a separate "expand state" for Reports — reuse the existing `state.tmp.bpcInsightExpanded` (despite the name; state.tmp is per-view scoped so the key works on Reports too)
- ❌ Duplicate the full insight rendering logic — Reports calls the same `renderInsightCard(insight, expanded)` as BPC
- ❌ Show photos / timeline / compare inside Reports (those stay BPC-only)
- ❌ Schema changes, new localStorage, IndexedDB writes
- ❌ New status labels, ghost overlay, slider, video frame, getUserMedia
- ❌ Muscle gain confirmed / performance improvement / strength progress claims
- ❌ Shame/value-judgment language

## Design

### Reuse, again

Reports now calls **`renderInsightCard(computeBodyProgressInsight(u), !!state.tmp.bpcInsightExpanded)`** — the exact same component BPC uses. Same data, same toggle handler (`toggle-insight-details`), same expand-state key.

### CTA row below the card (Reports-specific)

The BPC insight card already includes the toggle for expand/collapse. Reports adds **a CTA row below the card** for Reports-only affordances:

- **Always shown:** "→ ดู Body Progress Center (Timeline / Compare)" → `nav-bpc`
- **Conditionally shown** (when `insight.checkinSnap.checkin_count === 0`): "📸 เริ่ม Body Check-in" → `nav-checkin`

These are the same two affordances the compact T-013d.1 card had. They now sit *below* the insight card instead of inside its layout.

### Remove `renderReportsInsightSummary`

T-013d.1's `renderReportsInsightSummary` becomes dead code. **Delete it.** No reason to keep two renderers — the goal of this task is to consolidate.

Side effect: the literal text "ยังไม่ยืนยันว่ากล้ามเพิ่ม" (introduced by T-013d.1 in `renderReportsInsightSummary`) is removed. The canonical possible-recomp negation caveat becomes BPC's existing **"ไม่ได้แปลว่ากล้ามเพิ่ม"** (in `renderInsightCard`), which will now render on Reports too via the shared component. Both phrasings are semantically equivalent ("does not mean / does not confirm muscle gain"). Documented here so future audits don't flag the disappearance as a regression.

### What the Reports card now looks like

Between the existing 📐 รอบเอว stat-card and 🔥 แคลอรี่ stat-card:

```
┌──────────────────────────────────────────────┐
│ 🎯 Body Recomp Insight                        │   <- same card as BPC home
│ [Status badge]  [Confidence: Med]             │
│                                               │
│ Headline (status-specific)                    │
│                                               │
│ ⚖️ น้ำหนัก ...                                 │
│ 📐 รอบเอว ...                                  │
│ ⚡ ขาดดุล ...                                  │
│ 📸 Check-in ...                                │
│ 💪 Training ...                                │
│                                               │
│ ⚠️ ไม่ได้แปลว่ากล้ามเพิ่ม                       │   <- only on possible-recomp
│                                               │
│ [▼ ดูรายละเอียด]   <- toggles state.tmp.bpcInsightExpanded
│                                               │
│ (expanded shows: ทำไมเลขอาจไม่ตรงกัน +         │
│  สิ่งที่ควรเช็คต่อ + Confidence detail rows +  │
│  privacy disclaimer)                          │
└──────────────────────────────────────────────┘

[📸 เริ่ม Body Check-in]              <- only when 0 check-ins
[→ ดู Body Progress Center
   (Timeline / Compare)]              <- always
```

### Expanded-state behavior across surfaces

- `state.tmp` is per-view (replaced on `go()`), so `bpcInsightExpanded` on BPC home does NOT carry to Reports — each surface starts collapsed by default
- Tapping the toggle on Reports flips Reports' state.tmp.bpcInsightExpanded; subsequent renders of Reports respect it
- Navigating away from Reports clears the state (next entry starts collapsed again) — consistent with BPC behavior

## Affected files

| File | Change |
|---|---|
| `index.html` | (1) Replace `renderReportsInsightSummary(...)` call in `renderReports` with `renderInsightCard(...)` + CTA row · (2) Remove `renderReportsInsightSummary` function definition (now unused) · (3) VERSION |
| `service-worker.js` | VERSION → v1.10.37 |
| `docs/specs/body-recomp-insight-reports-full-detail.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | status updates |

## Hard guardrails

- Each of `classifyBodyProgressStatus` / `getInsightConfidence` / `computeBodyProgressInsight` / `renderInsightCard` retains **exactly 1 definition**
- No new schema · no new localStorage · no new IndexedDB writes
- No new handlers (reuses `nav-bpc` + `nav-checkin` + `toggle-insight-details`)
- VERSION sync
- Data file hashes unchanged
- T-013d's existing "ไม่ได้แปลว่ากล้ามเพิ่ม" caveat literal stays at exactly 1 occurrence (in `renderInsightCard`'s possible-recomp branch)
- T-013d.1's "ยังไม่ยืนยันว่ากล้ามเพิ่ม" literal is **removed** (was only in the now-deleted `renderReportsInsightSummary`). Documented in spec; not a regression — the canonical caveat in `renderInsightCard` covers both surfaces.

## Definition of Done

- [ ] Reports calls `renderInsightCard(computeBodyProgressInsight(u), !!state.tmp.bpcInsightExpanded)` at the same insertion point (between waist card and calorie card)
- [ ] CTA row below the card: "→ ดู Body Progress Center" (always) + "📸 เริ่ม Body Check-in" (only when 0 check-ins)
- [ ] `renderReportsInsightSummary` function definition deleted from index.html
- [ ] T-013d's `ไม่ได้แปลว่ากล้ามเพิ่ม` caveat still present at exactly 1 occurrence
- [ ] T-013d.1's `ยังไม่ยืนยันว่ากล้ามเพิ่ม` literal removed (= 0 occurrences) — documented as intentional consolidation
- [ ] `renderInsightCard` def count = 1 (single source of truth preserved)
- [ ] No new handlers · no new event listeners · no new schema
- [ ] Tone audit clean (all forbidden phrases = 0)
- [ ] VERSION v1.10.36 → v1.10.37 (sw + index)
- [ ] PROJECT_STATE updated
- [ ] Data file hashes unchanged

## Test plan (manual)

1. **2+ check-ins · normal data** → Reports shows full insight card (same as BPC); toggle expand → reveals "ทำไมเลขอาจไม่ตรงกัน" + "สิ่งที่ควรเช็คต่อ" + Confidence detail
2. **Possible-Recomp case** → Reports card shows red-bordered "⚠️ ไม่ได้แปลว่ากล้ามเพิ่ม" caveat (same wording as BPC now; was "ยังไม่ยืนยัน" in the compact T-013d.1 version)
3. **0 check-ins** → Reports shows the not-enough-data variant of `renderInsightCard` (terse: "ข้อมูลยังไม่พอให้ประเมิน") + "📸 เริ่ม Body Check-in" CTA below card + "→ ดู Body Progress Center" CTA below card
4. **Expand on Reports, navigate to BPC, navigate back to Reports** → Reports card starts collapsed again (state.tmp scoped per view)
5. **Expand on BPC, navigate to Reports** → Reports card starts collapsed (state isolated per view scope)
6. **Tap "→ ดู Body Progress Center"** → routes to BPC home; BPC's insight card same status/confidence as Reports' (same helper)
7. **Tap "📸 เริ่ม Body Check-in" when no check-ins** → routes to check-in flow
8. **Tone audit**: page text — 0 occurrences of forbidden phrases
9. **No regression**: existing Reports cards (weight / waist / calorie / protein / carb-sugar / logging) all render correctly

## Rollback plan

`git revert <T-013d.2 commit>` restores the compact `renderReportsInsightSummary` + its insertion. The full-detail surfacing on Reports disappears; BPC behavior untouched. No data shape changes to revert.

## Open questions (locked)

- **Should Reports' expand state persist across navigations?** Spec locks: **NO** — `state.tmp` is per-view; opens collapsed by default. This is consistent with how BPC's expand state works (also resets when leaving BPC).
- **Two CTAs vs one combined?** Spec locks: **two separate buttons** — clearer affordances. The CTA to BPC is always relevant; the Check-in CTA appears only when needed.
- **What about the T-013d.1 caveat literal "ยังไม่ยืนยัน"?** Spec locks: **removed**. The canonical caveat "ไม่ได้แปลว่า" in `renderInsightCard` now shows on Reports too. Both phrasings are semantically equivalent negations.
