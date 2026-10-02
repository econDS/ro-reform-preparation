# Reform navigation 1.3.0 rollout

Base: 9d577c00b8fd13fd8687fbb936657ae035473917 (main). Fresh clean checkout; no AGENTS.md or local skills. Publishing root is repo root, public path /ro-reform-preparation/. Existing system light/dark theme, skip link, tool-id reform-workshop, Portal fallback and header retained.

Before edits, npm test passed 77 tests. before.json was captured before this upgrade using the existing baseline script (its embedded baseCommit identifies the original 1.2 integration baseline, not this rollout base). Three complete inputs/outputs and 22 storage keys remain identical. No import/export or share-state serialization exists; existing hashes/query preservation are tested.

Source: econDS/ro_tools_portal at e497e33, integrations/nav/releases/1.3.0; read source integration README. Bytes copied unchanged. SHA-256:
- nav.js: e0a75bce3f8ba21d73aff8aa28af1c624d977f1e8e3de483c6dd40785b3b84d2
- catalog.snapshot.json: a198338ddcb7857094ef950fb1315c532840cf53ac8e7a69b331d8cb4a87dd5d
- nav.lock.json: 7ac31d27c493071ad164326022854a637c5015ae7989ff8c2a4c129b021c59c3
First two agree with lock. 1.2.0 retained for rollback.

Production change: only index.html module reference plus three additive release files. app.js, calculator.js and styles.css byte-identical to baseline. No extra theme, storage key or catalog-url.

QA: npm test (77 passed locally). Browser tooling unavailable locally (missing Chromium executable); existing read-only PR workflow is adapted for this branch, with pinned Playwright 1.55.1 outside production dependencies. Browser script runs at the real public subpath via a QA-only server; four widths, both system themes, live theme changes, keyboard, geometry/contrast, module fallback, optional catalog failure fixture, full calculation baseline and changed market price persistence. Actual head-specific result and screenshots are in workflow artifacts, report.json includes exact commit and individual outcomes. Until CI succeeds browser results are pending.

Files: index.html; assets/ro-suite/1.3.0/{nav.js,catalog.snapshot.json,nav.lock.json}; tests/ro-suite-nav.{test,browser}.cjs; scripts/serve-nav-qa.cjs; .github/workflows/ro-suite-nav-qa.yml; docs/qa/ro-suite-nav-1.3.0/{REPORT.md,before.json,before-tests.log}.

Limitations: real devices, WebKit/Firefox, installed browsers and post-merge Pages not tested. External Google Fonts network failures classified separately; optional catalog failure is deliberate and isolated, production uses bundled snapshot. No business changes or unrelated bug fixes.

Rollback: revert module URL in index.html to ./assets/ro-suite/1.2.0/nav.js and associated QA pins. Existing 1.2 bytes remain; no storage/data migration to reverse. No merge or deployment performed.
