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

Six new source tests cover the transition, light/dark palette, nav/scripts, control IDs and contracts, destination URLs, key advisory text, and negative mutations. Missing or duplicate reviewed fragments, unrelated source bytes, altered IDs/nav/scripts/palette, incorrect captured CSS hashes, changed calculation outputs and changed storage keys must fail.

## Verified local checks

- Immutable baseline: **83/83** original tests pass
- UI commit before guard update: **77/83**, six failures reproduced
- Updated live guard chain: **89/89** source tests pass (88 before the inherited-Undo classifier regression test)
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

## Browser evidence and current status

First evidence run: [37222442585](https://github.com/econDS/ro-reform-preparation/actions/runs/37222442585), source `9609a9dc800216f0332bfc6d91e23d0d98604888`.

- Original first-run browser regression: **PASS**, 8 width/theme checks and 16 screenshots
- Original navigation browser regression: **PASS**, 66 checks and 12 screenshots
- New cohesion matrix: 64 isolated contexts, **666 passing / 32 failing observations**, 224 genuine screenshots
- All 32 failures are the same already-existing hidden-Undo rendering defect at 360/390 in both themes, reproduced on both immutable baseline and candidate in matching initial/restored/reloaded states. Clear/undo restored the exact inventory, outputs and storage correctly.
- The harness initially expected computed `inline-flex`, but the flex parent blockifies it to computed `flex`. The classifier now accepts only matching baseline/candidate computed values in the narrow mobile defect case. Negative tests reject newly visible Undo, missing baseline, desktop occurrences, different display states and incorrect semantics. **Full exact-head rerun is pending; this initial aggregate is intentionally recorded as failed.**
- All first-visit width/theme measurements have zero horizontal overflow. Section 01 top at 390px is 971.17→821.45px (light), 993.42→823.45px (dark). At 1440px its top moves down about 8.41px while the primary quantity field moves up about 90.39px. Geometry is observation, not a usability score.

The inherited mobile Undo visibility defect remains unfixed and explicitly out of scope. Its `hidden` property behaves correctly, but the mobile button CSS makes the button render even when unavailable. At 768/1440 it is visually hidden before clearing and after undo. This is not represented as an accessibility pass.

Eight untouched viewport screenshots (before/after, 390/1440, light/dark) are committed under [screenshots](screenshots/). They were visually inspected and show the compact quickstart, earlier mobile section 01, preserved navigation and quieter result hierarchy. Exact provenance, SHA-256 values, geometry, Undo observations and calculation fixtures are in [evidence-9609a9d.json](evidence-9609a9d.json). Complete full-page screenshots and reports are in the [CI artifact](https://github.com/econDS/ro-reform-preparation/actions/runs/37222442585/artifacts/11311395352), retained for 30 days.

Local browser execution was unavailable: Playwright lacked bundled Chromium, installed Chromium hit an environment socket restriction, and the managed browser blocked the loopback candidate. No restriction workaround or fabricated screenshot was used. CI installed the pinned browser successfully. The branch-only workflow has read-only repository permissions, no persisted checkout credentials, no deployment, and an aggregate gate that uses actual step **outcomes**, so continue-on-error cannot hide a failed suite.

## Limitations

- Final exact-head rerun is pending after the narrow inherited-defect classifier repair; initial failures remain documented
- Chromium emulation is not physical-device, WebKit or Firefox testing
- UI regression checks do not validate current game/server data or market prices
- No usability study or conversion claim
