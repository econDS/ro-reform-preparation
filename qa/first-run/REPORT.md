# ro-reform-preparation first-run UX

## Baseline
Clean default branch at `65adf653de32864182c33d1792d8346365375767` archived before edits. Existing unit checks passed on untouched source. Before browser evidence uses that immutable archive, never the candidate with features removed. See `baseline.json` for structural inventory and `local-first-run-results.json` for exact source hash, widths, measured geometry and three before/after output cases.

## Changes
Existing result/shopping-before-price layout and collapsed comparisons were already appropriate. Retained them. Shorter quickstart, compact spacing and direct start/result links clarify the three minimum target inputs; optional Reform materials and alternate routes remain accessible. Existing example banner and price/exclusion cautions preserved.

## Actual verification
- `node --test tests/*.test.*`: 78 tests (final result also in CI)
- `BASE_ROOT=… node tests/first-run.browser.cjs`: PASS at360/390/768/1440 and all configured real app themes, native keyboard paths, view-only storage/output invariants, no added overflow, IDs/native labels valid;3 exact before/after calculation snapshots passed
- `node tests/ro-suite-nav.browser.cjs`: existing full functional/nav/fallback suite rerun; see final-head CI logs for authoritative outcome and full details
- Immutable shared navigation1.3 hashes, default data/formulas and all old calculation fixtures remain tested
- Historical whole-page invariant checks now first reverse only `changes.json` before checking their historical hashes. This keeps approved presentation edits explicit and preserves original business/data byte checks

## Evidence
Before/after390/1440 screenshots are lossless WebP conversions of actual Chromium viewport captures. All widths/themes and source-linked outputs are in local JSON and final-head CI artifacts. No human usability study or conversion claim.

## Limitations and findings
Real devices, WebKit/Firefox and post-merge Pages not tested. Local Dim SheetJS CDN requests returned `ERR_EMPTY_RESPONSE` in Chromium, so local XLS/XLSX checks are not claimed passed; final CI must exercise real CDN/format round trips before readiness. Other existing limitations remain out of scope.

## Rollback
Revert feature commit. No storage migration, schema, tool-ID, URL, game-data, formula or nav release changes. Draft only; do not merge before suite review.
