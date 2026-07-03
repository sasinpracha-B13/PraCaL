# T-022a — Body composition logging: data model + input fields

**Status:** approved
**Owner:** Execution Agent
**Related:** T-012 (waist tracking — the pattern this mirrors) · T-022b (Reports charts, separate) · T-022c (Recomp Insight, separate)

> First of a 3-part split (a = data model + inputs · b = charts · c = insight). This task only lands the **storage shape + input UX**. No charts, no insight, no calc wiring.

---

## 1. Goal

Extend the existing weight-log entry so users can **optionally** record **muscle mass (kg)** and **body-fat (%)** from a home BIA scale, on the existing "📊 บันทึกร่างกาย" screen. Both fields independent and optional. Never blocks saving weight.

## 2. Current data shape (follow exactly)

Weight entries live at **`user.weights[]`** (per-user, in localStorage via `persist()`), each entry:

```js
{ date: 'YYYY-MM-DD', weight_kg: number }
```

Written by `setWeight(user, key, kg)` ([index.html:1922](../../index.html)); upserts by date; sorted ascending. Waist is a **separate** array `user.waist[]` — not touched here.

## 3. New shape (additive, optional)

```js
{ date: 'YYYY-MM-DD', weight_kg: number, muscleMass_kg?: number, bodyFat_pct?: number }
```

- Both new fields **optional and independent** — user may fill one, both, or neither.
- **Empty = field ABSENT from the entry** (never `null`, never `0`). Absence is the "no data" signal, consistent with how the codebase treats missing waist/optional fields.
- No schema/migration needed — existing entries simply lack the keys; every read path already treats them as absent.

## 4. Backward compatibility — enumerated read sites (hard requirement)

Every current reader of `user.weights[]` touches only `.date` and `.weight_kg`. Adding optional keys leaves all of them working unchanged. Full enumeration (verified by grep of `weight_kg` + the weights helpers):

| # | Site | Reads | Impact of new fields |
|---|---|---|---|
| 1 | `effectiveBodyWeight` (~L1211) | `weight_kg` only | **none** — MUST stay weight-only (constraint); will NOT read new fields |
| 2 | `weightOnDate` (~L1920) | `weight_kg` | none |
| 3 | `setWeight` (~L1922) | write path | **extended** (§6) — back-compat preserved |
| 4 | `removeWeight` (~L1929) | filter by `date` | none — deletes whole entry incl. new keys |
| 5 | `sortedWeights` (~L1933) | passthrough | none |
| 6 | `movingAverage` (~L1941, valueKey `weight_kg`) | `weight_kg` | none |
| 7 | `linearRegression` (~L1950) | valueKey | none |
| 8 | `weightTrend` (~L1963) | `weight_kg` | none |
| 9 | `weightChangeOver` (~L1969) | `weight_kg` | none |
| 10 | `latestWeight` (~L1974) | passthrough | none |
| 11 | `compute7DayCheckinStats` (~L2147) | `weight_kg` | none (BPC insight input; recomp CARD untouched) |
| 12 | `_localWeightMean` / `computeWeightTrend` (~L2341/2366) | `weight_kg` | none |
| 13 | `svgLineChart` (~L3091, valueKey) | valueKey | none |
| 14 | **CSV export** (~L3378) | `date`, `weight_kg` | none — new fields simply not exported (export of body-comp is out of scope for T-022a) |
| 15 | Reports weight display + chart (~L6078/6203/6247) | `weight_kg` | none (T-022b territory; not edited here) |
| 16 | `renderWeightLog` (~L6367) | `weight_kg` | **edited** (§5, §7) — inputs + minimal read-back |
| 17 | Settings latest-weight card (~L7865) | `weight_kg` | none |
| 18 | new-user seed (~L10041) | writes `{date, weight_kg}` | none — new fields optional, absent is valid |

**Conclusion:** no existing view, calc, or export path breaks. The only edits are the write path (`setWeight`) and the input screen (`renderWeightLog` + `save-weight`).

## 5. Input UX (on the existing 📊 บันทึกร่างกาย screen)

Add **two optional inputs** to the existing entry card, below waist, above the บันทึก button. Same styling/classes as `#wt-input` / `#waist-input`:

```
⚖️ น้ำหนักวันนี้ (กก.)      [existing]
📐 รอบเอว (ซม. — ถ้ามี)     [existing]
💪 มวลกล้ามเนื้อ (กก. — ถ้ามี)   [new #mm-input]
🔥 % ไขมัน (ถ้ามี)              [new #bf-input]
[บันทึก]
```

- Both new inputs `type="number" inputmode="decimal"`, `step="0.1"`, empty by default, placeholder from the latest entry's value if present.
- Hint text updated to mention body-comp is optional and from a BIA scale.
- **Never blocks saving weight** — the existing weight/waist save flow is unchanged; body-comp is layered on.

### Validation (loose, per spec)
- `muscleMass_kg`: must be **> 0 and < reference body weight**. Reference weight = the entered weight this save if present, else today's existing weight entry, else `latestWeight`, else profile `u.weight`.
- `bodyFat_pct`: within **3–70**.
- **Out-of-range → inline warning + reject THAT field's value, but still save the weight** (and waist). "Inline warning" = the app's existing `toast(msg, true)` convention (same mechanism used today for weight/waist range errors) — but crucially **without** the early `return`, so the weight still saves. Warning message names which field was rejected.
- **Empty input → field LEFT UNCHANGED** (not deleted). This mirrors how the existing `#wt-input`/`#waist-input` behave: they render empty every time (only placeholders carry the last value), so an empty field means "don't touch this", not "clear it". Delete-on-empty was rejected because it would silently wipe a previously-saved BIA reading whenever the user saves a weight-only or waist-only update. To remove a reading, delete the whole day's entry with the existing 🗑️ (a field-level clear can be a later task). `setWeight` still supports `null`→delete as a reserved primitive; T-022a never passes it.
- Body-comp attaches only to a weight entry for today. Save-alone is allowed: if the user enters only body-comp (no new weight) **and a weight entry for today already exists** (e.g. weighed this morning, now adding the BIA reading), the body-comp attaches to that entry. If no weight is entered AND no today entry exists → warn "ต้องมีน้ำหนักของวันนี้ก่อนเพื่อบันทึกมวลกล้าม/ไขมัน" and skip body-comp (waist still saves if present). The "nothing to save" guard now also passes when only valid body-comp is present.

### Minimal read-back (in-scope so the feature is verifiable — NOT charts/insight)
- Latest-weight card + history rows: if an entry has `muscleMass_kg` / `bodyFat_pct`, show them as small muted text (e.g. `💪 35.0 กก. · 🔥 18%`). Display only; no trend, no chart, no interpretation.

## 6. Write path — extend `setWeight`

```js
// v1.10.48 — T-022a: optional body-comp fields. `extra` is optional; when omitted,
// body-comp fields are left untouched (existing callers unaffected). Per field:
//   key present + number  → set
//   key present + null    → delete (reserved primitive; T-022a never passes null)
//   key absent            → leave unchanged (empty input & invalid input both land here)
function setWeight(user, key, kg, extra) {
  user.weights = user.weights || [];
  let entry = user.weights.find(x => x.date === key);
  if (!entry) { entry = { date: key, weight_kg: kg }; user.weights.push(entry); }
  else { entry.weight_kg = kg; }
  if (extra) {
    if ('muscleMass_kg' in extra) {
      if (extra.muscleMass_kg == null) delete entry.muscleMass_kg;
      else entry.muscleMass_kg = extra.muscleMass_kg;
    }
    if ('bodyFat_pct' in extra) {
      if (extra.bodyFat_pct == null) delete entry.bodyFat_pct;
      else entry.bodyFat_pct = extra.bodyFat_pct;
    }
  }
  user.weights.sort((a, b) => a.date.localeCompare(b.date));
}
```

Existing callers `setWeight(u, today, kg)` (no `extra`) behave exactly as before. `save-weight` passes `extra`.

## 7. `save-weight` handler changes

- Read `#mm-input` / `#bf-input`.
- Keep existing weight+waist validation & save exactly as-is (weight/waist errors still block their own save, unchanged).
- Build `extra` object per §5 validation; collect body-comp warnings.
- Compute reference weight for the muscle `<` check.
- Attach `extra` to the today weight entry when applicable (§5).
- After saving, if any body-comp warnings, surface them via toast (weight already saved).
- `persist()` + `render()` as today.

## 8. Non-goals / DO NOT TOUCH (verified at gate)
- `calcBMR` / `calcTDEE` / `calorieFloor` / `proteinTarget` / `goalZoneEval` — untouched (grep unchanged)
- `effectiveBodyWeight` — MUST still read `weight_kg` only; must NOT reference the new fields (grep)
- `meals.json` / `branded_products.json` / `tools/audit-meals.js` — byte-identical
- Recomp Insight card (T-022c) · Reports charts (T-022b) · IndexedDB / photo pipeline — untouched
- No new charts, no trend, no interpretation of body-comp in this task

## 9. Affected files
| File | Change |
|---|---|
| `index.html` | `setWeight` +`extra` param · `renderWeightLog` +2 inputs +minimal read-back · `save-weight` handler body-comp path · VERSION |
| `service-worker.js` | VERSION → v1.10.48 |
| `docs/specs/T-022a-body-comp-logging.md` | this spec |
| `PROJECT_STATE.md` + `TASK_BOARD.md` | T-022a entry · schema note (`u.weights[]` gains optional `muscleMass_kg`/`bodyFat_pct`) |

## 10. Definition of Done
- [ ] `setWeight(user, key, kg, extra?)` — optional `extra`, per-field set/delete/leave semantics; existing no-extra callers unchanged
- [ ] Two inputs `#mm-input` / `#bf-input` on the weight screen, optional, styled like existing
- [ ] Empty → field left unchanged (no silent wipe); filled+valid → set; filled+invalid → rejected + warned, weight still saves; body-comp-only save attaches to today's entry when it exists
- [ ] Validation: muscle > 0 and < reference weight; body-fat 3–70; loose, non-blocking for weight
- [ ] Minimal read-back of saved body-comp on latest card + history rows (display only)
- [ ] Backward compat: all 18 enumerated read sites work with old (field-absent) entries unchanged
- [ ] `effectiveBodyWeight` still reads `weight_kg` only (grep: no `muscleMass_kg`/`bodyFat_pct` inside it)
- [ ] Guardrail functions untouched (grep unchanged): calcBMR/calcTDEE/calorieFloor/proteinTarget/goalZoneEval
- [ ] Thai labels, consistent styling
- [ ] VERSION v1.10.47 → v1.10.48 (sw + index)
- [ ] PROJECT_STATE updated (schema note)
- [ ] Data file hashes unchanged (meals/branded/audit)

## 11. Test plan
1. Save weight only → entry `{date, weight_kg}` (no new keys) — verify in DevTools localStorage
2. Save weight + muscle 35 + fat 18 → entry has `muscleMass_kg:35, bodyFat_pct:18`; latest card shows "💪 35.0 กก. · 🔥 18%"
3. Save weight + muscle = body weight (invalid) → toast warns muscle rejected, weight still saved, no `muscleMass_kg` on entry
4. Save weight + fat 80 (out of range) → toast warns fat rejected, weight saved
5. Save weight only (body-comp inputs empty) when today's entry already has muscle=35 → muscle preserved (empty ≠ wipe); weight updated
6. Old entry (pre-feature, no new keys) → renders everywhere unchanged; charts/reports/settings fine
7. Muscle/fat typed but no weight & no today entry → warned, body-comp skipped, waist (if any) saved
7b. Muscle/fat typed, no weight, but today entry EXISTS → body-comp attaches to today's entry (save-alone)
8. Existing weight/waist errors still block their own save (unchanged)
9. Grep: guardrail functions + effectiveBodyWeight byte-identical / weight-only

## 12. Rollback
`git revert <T-022a commit>` removes the inputs, the `extra` param, and the read-back. Any saved `muscleMass_kg`/`bodyFat_pct` become harmless unused keys (ignored by reverted code). No data loss.

## Open questions (locked)
- **Inline warning = toast?** Yes — matches the existing weight/waist range-error UX; the key behavior (reject field, still save weight) is what matters. A per-field inline `<div>` would be a styling escalation; deferred unless requested.
- **Empty = delete or leave?** Resolved to **leave unchanged** (safer, consistent with weight/waist), reversing the initial draft. Rationale in §5. Field-level clear deferred; whole-entry 🗑️ covers removal today.
- **Export body-comp to CSV?** Out of scope (T-022a is model+input). Can be a later small task.
- **Body-comp on the BPC check-in flow too?** No — this task is the weight-log screen only; check-in structure is separate.
