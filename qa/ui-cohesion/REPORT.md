# First-run UI cohesion QA

## Scope and immutable sources

- Baseline: `00975def134eb9e0098f944e98b8286d8bc3bfdd` (main when this work resumed)
- Reviewed UI commit: `9437f375b531180663d0952540899b43c0321eea`
- Feature branch: `claude/charming-ptolemy-ak5ywx`
- Production delta: `index.html` and `styles.css` only. The app/calculator code, formulas, default prices, storage behavior, navigation artifacts and host-theme stylesheet remain unchanged.
- No deployment or merge is part of this work.

## UI already implemented

Compact orientation/quickstart; stronger section 01 starting point; explicit optional field groups; quieter result decoration, warnings and secondary controls; inline price advisory; quieter recipe guidance; first-run styles moved into the stylesheet. Existing light/dark root tokens, control IDs, destination URLs and script/navigation integration remain intact.

## Live-source guard transition

The historical guards still read live production files. `changes.json` records exact reviewed before/after fragments for HTML and CSS. `normalize.cjs` requires exactly one occurrence of every reviewed after-fragment, reverses only those fragments, and validates the resulting entire file against the immutable pre-cohesion SHA-256. Historical nav/theme/first-run guards then perform their existing reversals and compare their unchanged expected hashes.

Calculation capture still executes the real unchanged app and calculator. Its CSS digest is checked against the live file before comparing its strictly reversed digest to the historical fixture. No archived source is substituted for live-source validation. The original navigation browser regression reconstructs baseline CSS with the same strict transition in its baseline context only; its candidate always uses live CSS.

Five new source tests cover the transition, light/dark palette, nav/scripts, control IDs and contracts, destination URLs, key advisory text, and negative mutations. Missing or duplicate reviewed fragments, unrelated source bytes, altered IDs/nav/scripts/palette, incorrect captured CSS hashes, changed calculation outputs and changed storage keys must fail.

## Verified local checks

- Immutable baseline: **83/83** original tests pass
- UI commit before guard update: **77/83**, six failures reproduced
- Updated live guard chain: **88/88** source tests pass
- Existing application/calculator/nav/host-theme bytes unchanged
- Exact full input/output comparison of all three captured calculator fixtures passes
- Source diff whitespace validation passes with CRLF respected (`core.whitespace=cr-at-eol`)

### Recovered exact cases

All cases use unchanged default prices and zero inventory/reform requirements except the overrides below.

| Case | Input overrides | Total | Materials | NPC fees |
| --- | --- | ---: | ---: | ---: |
| A | Accessory, Supreme (grade 3), quantity 100, auto | 114,473,000 | 94,473,000 | 20,000,000 |
| B | Weapon, Medium (grade 1), quantity 12, auto; inventory: weaponStone1=2, weaponOreMedium=15, shadow=4 | 777,500 | 617,500 | 160,000 |
| C | Armor, High (grade 2), quantity 5, shadow; inventory: armorStone0=3, shadow=10, shadowOre=35, zeluniumOre=40; reform: shadow=6, zelunium=4 | 1,783,740 | 693,740 | 1,090,000 |

Full authoritative inputs and outputs are in `scripts/capture-ro-suite-baseline.cjs` and unchanged `tests/fixtures/ro-suite-nav-baseline.json`.

## Browser evidence status

**Pending CI, not yet claimed as passing.** Local Playwright lacked its bundled Chromium. The installed Chromium could not launch due to an environment socket restriction; the managed browser also blocked the loopback candidate URL. No workaround to those restrictions was used. No screenshots or visual measurements from the previous session are treated as verified evidence.

The dedicated branch-scoped GitHub Actions workflow uses pinned actions, Node 22.14.0, Playwright 1.55.1, read-only repository permissions and no persisted checkout credentials. It will run the existing navigation and first-run browser suites plus the UI cohesion baseline/candidate matrix at widths 360/390/768/1440 in light/dark themes. Genuine screenshots and JSON reports are uploaded even on failure. Each run records the exact tested source SHA.

The new matrix includes labels/IDs, overflow and geometry, quickstart and keyboard paths, all three calculator cases, price edits/reset, inventory clear/undo, persisted state, and actual Undo visibility. Any pre-existing mobile hidden-Undo issue must be reproduced in baseline and reported explicitly rather than silently counted as a pass or attributed to this UI change.

## Limitations

- Browser results and screenshots are pending until the exact-head CI run completes
- Chromium emulation is not physical-device, WebKit or Firefox testing
- UI regression checks do not validate current game/server data or market prices
- No usability study or conversion claim
