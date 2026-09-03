# Tools

Small, focused scripts that audit, validate, or analyze the project without modifying production data.

## Runtime policy *(per [DEC-002](../docs/decisions/DEC-002-tools-runtime.md))*

- **`tools/audit-*.js` is canonical.** JavaScript is the source of truth for the audit class.
- **PowerShell parallel-implementation is acceptable evidence** for a task's DoD when Node is not available, provided:
  1. Read-only invariant verified (`Get-FileHash` before/after — input unchanged)
  2. PS verifier mirrors the JS line-for-line (not approximate)
  3. Verifier lives at `tools/.<script-name>-verify.ps1` (dot-prefix) and is gitignored as a local helper
- **The PS verifier is a development aid, not a deliverable.** The JS in `tools/` is what ships.
- This policy applies to the audit class. Other tool classes (generators, hooks, etc.) may need their own decision when introduced.

## Conventions

- **Naming:** `audit-<area>.js` for audit scripts. `report-<area>.js` for read-only reports. `gen-<area>.js` for generators (rare).
- **Runtime:** plain Node.js where possible (no bundler, no build step). The repo has no `package.json` today; if a script needs deps, propose adding `package.json` first via a decision record.
- **Read-only by default.** Tools should not mutate `meals.json`, `branded_products.json`, `index.html`, etc. If a fix is needed, the tool reports it and a human / DEV Integration applies it.
- **Output format:** human-readable to stdout. Optional `--json` flag for machine-readable output. Exit code: `0` = clean, `1` = warnings, `2` = failures.
- **Documentation:** every tool gets a header comment explaining what it does, how to run it, and what its exit codes mean. The most useful tools also get a row in this README.

## Catalog

| Script | Purpose | Run | Exit codes |
|---|---|---|---|
| `audit-meals.js` | Validate macro consistency on `meals.json` (counts top-level meals correctly; flags `protein×4 + carbs×4 + fat×9 + alcohol×7` deviations >15% from `baseCalories`) **plus optional-nutrient sanity** (T-024a / DEC-004): `satFat_g ≤ fat_g`, `fiber_g ≤ carbs_g`, no negatives, `nutrientSource` present and valid. A sanity violation is a hard fail regardless of calorie deviation. Read-only. | `node tools/audit-meals.js` <br> `node tools/audit-meals.js --json` | `0` = all ≤5% and no violation (clean) · `1` = warnings only (5–15%) · `2` = failures (>15% or a sanity violation) or script error |
| `audit-csv-addon-rows.js` | Verify an exported CSV reconciles: does "sum every item row" equal that day's `สรุปวัน`? Regression guard for [T-023](../docs/specs/T-023-csv-addon-double-count-fix.md) (add-on double-count), and identifies pre-v1.10.51 exports so old files aren't mistaken for corrupt data. Reads the header to handle **both** layouts — 10-column (≤v1.10.51) and 14-column (≥v1.10.52, with `ประเภทแถว` + the three optional nutrients). Read-only. | `node tools/audit-csv-addon-rows.js <exported.csv>` <br> `… --json` | `0` = every day reconciles · `1` = macro drift beyond the per-row `toFixed(1)` tolerance, calories fine · `2` = calorie mismatch (pre-fix export, or the bug is back) or script error |

| `gen-nutrient-derivation.js` | **Generator** (the only one that writes). Derives `satFat_g` (= `fat_g` × ratio, leaning **high**) and `fiber_g` (= `carbs_g` × ratio, leaning **low**) for every entry in `meals.json` + `branded_products.json`, per [DEC-004](../docs/decisions/DEC-004-unknown-nutrient-direction.md) rule 3. Ordered keyword rules → category default; 17 whole foods are hand-set. Writes **surgically** (one line per entry, no reformat) and re-parses the result to assert nothing but the three intended fields changed. Idempotent — a second run rewrites 0 lines. | `node tools/gen-nutrient-derivation.js` (dry run) <br> `… --report` (per-entry table) <br> `… --apply` (write) | `0` = clean · `1` = some entries left absent · `2` = a derived value violated a sanity rule (refuses to write) |

## Suggested next tools (not yet built)

These are candidates from `PROJECT_STATE.md → Open Questions` and `TASK_BOARD.md → Next Actions`. Build them only when an audit task is approved.

1. **`audit-version-bumps.js`** — given a git diff range, check that any commit touching `index.html` or `service-worker.js` bumps both `VERSION` constants. Catches the single-bump regression class. Suggested when: pre-commit hook strategy is on the table.
2. **`audit-stale-counts.js`** — scan `index.html` for hardcoded `\d+ (เมนู|รายการ|สินค้า|ผู้ใช้)` patterns and compare against runtime sources (`meals.json` length, `MAX_USERS`, `branded_products.json` length). The recurring v1.10.5/v1.10.15 class of bug.
3. **`audit-branded-products.js`** — analogous to `audit-meals.js` but for `branded_products.json` (different schema: `servingSize`, `servingsPerPackage`, etc.).
4. **`report-feature-map.js`** — list every `state.view` value, the `render*` function that handles it, and every `data-act` that navigates to it. Useful for orientation / Architecture specs.

None of these will be built without an explicit task assignment.

## Anti-patterns

- **Tools that mutate production data automatically.** Always report → human applies. *(One deliberate exception: `gen-nutrient-derivation.js` writes, because 496 values cannot be hand-applied from a report. It earns the exception by being dry-run-by-default, idempotent, refusing to write on any sanity violation, and self-verifying that it changed nothing but the fields it owns.)*
- **Tools that need npm install.** Until we add `package.json` (decision record required), tools should run with `node` and standard library only.
- **Tools that hide failures.** Exit codes matter; a tool that returns 0 on warnings is worse than no tool.
- **Tools without a README row.** If it's worth keeping, document it here.
