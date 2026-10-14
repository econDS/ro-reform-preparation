# Dynamic navigation 2.0.0

The publishing root remains the repository root and the stable identity remains `reform-workshop`. Only the local module URL changes in production HTML; application code, calculator formulas, local storage, host CSS tokens, and historic releases remain untouched.

The local component renders its frozen catalog immediately and fetches `https://econds.github.io/ro_tools_portal/catalog/v1/tools.json` when connected. Registry additions, removals, titles, and ordering are refreshed without child deployments. Schema version 1 accepts up to 500 tools within 256 KiB with a 1.5-second timeout. Controlled HTTPS repository-root URLs on econds.github.io are validated without per-tool allowlists. Failures retain fallback; no remote executable code is loaded.

Migration: publish the Portal catalog before deploying this child after review. No Pages configuration changes are needed. Rollback: restore the script URL in index.html to `./assets/ro-suite/1.5.1/nav.js`; all old release files remain available. Roll back the accompanying tests when reverting this integration commit.

Validation preserves the historical release/hash/calculator tests using one exact module-path reversal, with separate raw v2 candidate assertions. Browser tests mock the exact central endpoint before navigation and retain the existing responsive, light/dark, keyboard, blocked-module, storage, and calculation matrix. Additional dynamic cases verify unknown identity, 120 tools, rename/removal/reorder and rejected remote data using unchanged local bundle bytes.
