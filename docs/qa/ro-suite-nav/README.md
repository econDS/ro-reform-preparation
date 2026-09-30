# ro-suite-nav 1.2.0 integration QA

## Scope and baseline

Base: `main` at `4bc1653fec1901a4121b86342f1ad0cc4ef55313`.
Publishing root stays the repository root (`.`); public path is
`https://econds.github.io/ro-reform-preparation/`.
No Pages settings or portal repository files were changed.

The tagged [integration README](https://github.com/econDS/ro_tools_portal/blob/nav-v1.2.0/integrations/nav/README.md)
was read before integration. All three release files were downloaded directly from
that tag; no bundle was generated or edited locally.

Before editing application source, `npm test` passed **74/74**, and
`node scripts/capture-ro-suite-baseline.cjs > tests/fixtures/ro-suite-nav-baseline.json`
recorded three complete inputs/results, 22 storage keys, original source hashes,
URL behavior and publication path. The fixture is a pre-change record, not a
snapshot regenerated from changed calculation code.

| Case | Total | Materials | NPC fees |
| --- | ---: | ---: | ---: |
| Accessory Supreme 100, defaults | 114,473,000 | 94,473,000 | 20,000,000 |
| Weapon Medium 12, partial stock | 777,500 | 617,500 | 160,000 |
| Armor High 5, Shadowdecon mode plus Reform | 1,783,740 | 693,740 | 1,090,000 |

The complete inputs, including prices, inventory and direct Reform material
demand, are in [`tests/fixtures/ro-suite-nav-baseline.json`](../../../tests/fixtures/ro-suite-nav-baseline.json).
The third case includes 4,990 z of direct Reform material cost in the total.

- Storage: `reform-workshop.v1`, 20 existing migration flags, and
  `reform-workshop.v1.quickstart-hidden`; the fixture lists every exact key
- Share: no share-state/query serialization feature exists in this version;
  existing document anchors are `#main`, `#calculator`, `#materials`, `#recipe`,
  and `#results`
- Export/import: no file export/import UI or data format exists in this version;
  existing JSON localStorage persistence is unchanged
- Theme: the existing CSS follows `prefers-color-scheme` and has no theme toggle;
  the nav deliberately omits `theme` so both follow system theme changes

## Runtime change

Only six lines are added to `index.html`: the fallback-containing nav and the
relative, versioned module script immediately after the skip link. The original
sticky header remains after the nav. `app.js`, `calculator.js`, and `styles.css`
remain byte-for-byte identical. No CSS override, global selector, sticky-header
adjustment, new storage key, iframe or remote catalog is introduced.

## Verified release hashes

| File | SHA-256 |
| --- | --- |
| `nav.js` | `d75be916445feb4febeaada437841a1b3be68db16a00673198c78fd6f6c8dc5f` |
| `catalog.snapshot.json` | `800bb9c9d2b52a7fbae58e436b05529e69820fee3627d199da545a6f5e28f7dd` |
| `nav.lock.json` | `3b0350135ba5f455b38799c7940492938a209e8e0a6570a5126cb40c36127358` |

The first two match both the approved values and the downloaded lock.
The lock's `sourceCommit` is release metadata, not a substitute for verifying
artifact hashes or a claim that this integration rebuilt the bundle.

## Checks run locally

- `npm test` before integration: 74 passed, 0 failed
- `npm test` after integration: 77 passed, 0 failed
- `sha256sum assets/ro-suite/1.2.0/*`: values above
- `git -c core.whitespace=cr-at-eol diff --check`: passed; existing HTML uses CRLF
- Browser launch with the installed Playwright/Chromium: blocked by this
  execution environment (`socket() failed: Operation not permitted`), including
  a sandbox-escalated attempt. This is not a browser test pass

Browser checks and screenshots are run by the narrowly scoped, read-only PR
workflow and documented in the PR with the exact successful run and artifacts.
