'use strict';

// CI-only browser evidence. Install the pinned Playwright outside the checkout.
// Both versions are served from their own complete tree; no response rewriting,
// injected styles, seeded localStorage, or shared browser contexts are used.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const {execFileSync} = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const BASE_SHA = '00975def134eb9e0098f944e98b8286d8bc3bfdd';
const BASE = process.env.BASE_ROOT && path.resolve(process.env.BASE_ROOT);
const OUT = path.resolve(process.env.QA_OUTPUT || path.join(ROOT, 'qa-artifacts/ui-cohesion'));
const PREFIX = '/ro-reform-preparation/';
const KEY = 'reform-workshop.v1';
const WIDTHS = [360, 390, 768, 1440];
const THEMES = ['light', 'dark'];
const OUTPUT_IDS = ['total', 'material-cost', 'npc-cost', 'reform-cost', 'target-name',
  'unit-cost', 'savings', 'shopping-count', 'shopping-list', 'recipe-steps',
  'shadow-total', 'shadow-additional', 'shadow-detail', 'shadow-detail-total',
  'route-comparison-cards', 'route-comparison-verdict', 'inventory-summary'];
const servers = [];
const observed = new Map();
const report = {
  status: 'running', startedAt: new Date().toISOString(), baseCommit: BASE_SHA,
  sourceCommit: process.env.SOURCE_SHA || 'local-candidate', checks: [], scenarios: [],
  screenshots: [], baselineIssues: [], geometry: [],
  limitations: ['Chromium emulation only; not physical devices, Firefox, or WebKit',
    'Screenshots are actual browser captures, not a perceptual-diff or usability score',
    'No deployment, production traffic, or game-data accuracy validation'],
};
fs.mkdirSync(OUT, {recursive: true});
const writeReport = () => fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2) + '\n');
const digest = buffer => crypto.createHash('sha256').update(buffer).digest('hex');

async function check(name, action) {
  try {
    const detail = await action();
    report.checks.push({name, status: 'passed', ...(detail === undefined ? {} : {detail})});
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    report.checks.push({name, status: 'failed', error: error.stack || String(error)});
    console.error(`FAIL ${name}: ${error.message}`);
    return false;
  } finally { writeReport(); }
}

function verifyBase() {
  assert(BASE, 'BASE_ROOT must point to the complete immutable baseline archive');
  assert.notEqual(fs.realpathSync(BASE), fs.realpathSync(ROOT), 'Before and after roots must differ');
  if (process.env.BASE_SHA) assert.equal(process.env.BASE_SHA, BASE_SHA, 'Do not silently change the baseline');
  const tree = execFileSync('git', ['ls-tree', '-rz', BASE_SHA], {cwd: ROOT, encoding: 'utf8'});
  const manifest = {};
  for (const entry of tree.split('\0').filter(Boolean)) {
    const [metadata, filename] = entry.split('\t');
    const [mode, type, object] = metadata.split(' ');
    assert.equal(type, 'blob', `Unsupported baseline entry: ${filename}`);
    assert.notEqual(mode, '120000', `Baseline symlinks are not served: ${filename}`);
    const bytes = fs.readFileSync(path.join(BASE, filename));
    const actual = crypto.createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
    assert.equal(actual, object, `BASE_ROOT differs from ${BASE_SHA}: ${filename}`);
    manifest[filename] = digest(bytes);
  }
  assert(Object.keys(manifest).length > 0, 'Baseline tree is not empty');
  return manifest;
}

async function serve(root) {
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith(PREFIX)) throw new Error('Outside publishing path');
      const file = path.resolve(root, decodeURIComponent(url.pathname.slice(PREFIX.length)) || 'index.html');
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        response.writeHead(404); response.end('Not found'); return;
      }
      const contentType = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript',
        '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
        '.png': 'image/png', '.webp': 'image/webp'}[path.extname(file)] || 'application/octet-stream';
      response.writeHead(200, {'Content-Type': contentType, 'Cache-Control': 'no-store'});
      fs.createReadStream(file).pipe(response);
    } catch { response.writeHead(400); response.end('Bad request'); }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  servers.push(server);
  return `http://127.0.0.1:${server.address().port}${PREFIX}`;
}

async function settled(page) {
  await page.waitForFunction(() => window.Reform && document.querySelectorAll('[data-inventory]').length > 0);
  await page.evaluate(() => document.fonts.ready);
  // app.js debounces input rendering for 90ms. Await it, then two paints.
  await page.waitForTimeout(140);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function snapshot(page) {
  return page.evaluate(({key, ids}) => {
    const storage = Object.fromEntries(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]));
    const input = JSON.parse(localStorage.getItem(key));
    return {
      storage, input, calculation: window.Reform.calculate(input),
      output: Object.fromEntries(ids.map(id => {
        const node = document.getElementById(id);
        if (!node) throw new Error(`Missing output #${id}`);
        return [id, node.textContent.replace(/\s+/g, ' ').trim()];
      })),
      location: {pathname: location.pathname, search: location.search, hash: location.hash},
    };
  }, {key: KEY, ids: OUTPUT_IDS});
}

async function capture(page, label) {
  const file = `${label}.png`;
  await page.screenshot({path: path.join(OUT, file), fullPage: true, animations: 'disabled'});
  report.screenshots.push({file, fullPage: true, ...await page.evaluate(() => ({
    viewport: {width: innerWidth, height: innerHeight}, documentHeight: document.documentElement.scrollHeight,
  }))});
  writeReport();
}

async function saveStage(page, scenario, stage) {
  const value = await snapshot(page);
  scenario.stages[stage] = value;
  await capture(page, `${scenario.id}-${stage}`);
  await check(`${scenario.id}: ${stage} displayed costs match the stored calculation`, () => {
    const fmt = n => new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(n);
    const plan = value.calculation;
    assert.equal(value.output.total, plan.total == null ? 'รอใส่ราคา' : fmt(plan.total));
    assert.equal(value.output['material-cost'], `${fmt(plan.materialCost)} z${plan.total == null ? ' + รอใส่ราคา' : ''}`);
    assert.equal(value.output['npc-cost'], `${fmt(plan.fees)} z`);
  });
  if (scenario.variant === 'after') {
    const before = observed.get(scenario.counterpart)?.stages[stage];
    await check(`${scenario.id}: ${stage} exact before/after output and storage parity`, () => {
      assert(before, 'Matching baseline stage must have completed; parity is not assumed');
      assert.deepEqual(value, before);
    });
  }
  return value;
}

async function geometry(page) {
  return page.evaluate(() => {
    const rect = node => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return {x: r.x, y: r.y + scrollY, width: r.width, height: r.height,
        right: r.right, bottom: r.bottom + scrollY};
    };
    const panel = document.querySelector('.target-panel');
    const controls = [...panel.querySelectorAll('input,select,button,a')]
      .filter(node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden')
      .map(node => ({id: node.id || node.dataset.type || node.className || node.textContent.trim(),
        tag: node.tagName, ...rect(node)}));
    const overlaps = [];
    for (let a = 0; a < controls.length; a++) for (let b = a + 1; b < controls.length; b++) {
      const one = controls[a], two = controls[b];
      if (Math.min(one.right, two.right) - Math.max(one.x, two.x) > 1 &&
          Math.min(one.bottom, two.bottom) - Math.max(one.y, two.y) > 1) overlaps.push([one.id, two.id]);
    }
    return {
      viewport: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      section01: rect(panel), grade: rect(document.querySelector('#grade')),
      quantity: rect(document.querySelector('#quantity')), cue: rect(document.querySelector('.first-run-start')),
      results: rect(document.querySelector('#results')), controls, overlaps,
    };
  });
}

async function inspectLayout(page, scenario) {
  const measured = await geometry(page);
  scenario.geometry = measured;
  report.geometry.push({id: scenario.id, ...measured});
  await check(`${scenario.id}: unique IDs and working native labels`, async () => {
    const result = await page.evaluate(() => {
      const ids = [...document.querySelectorAll('[id]')].map(node => node.id);
      const danglingLabels = [...document.querySelectorAll('label[for]')].filter(node => !node.control).map(node => node.htmlFor);
      const unnamed = [...document.querySelectorAll('input,select,textarea')].filter(node => {
        if (node.type === 'hidden') return false;
        return !(node.getAttribute('aria-label')?.trim() || node.labels?.length ||
          node.getAttribute('aria-labelledby')?.split(/\s+/).every(id => document.getElementById(id)?.textContent.trim()));
      }).map(node => node.id || node.outerHTML);
      const danglingReferences = [...document.querySelectorAll('[aria-labelledby],[aria-controls]')].flatMap(node =>
        ['aria-labelledby', 'aria-controls'].flatMap(attribute => (node.getAttribute(attribute) || '').split(/\s+/)
          .filter(id => id && !document.getElementById(id)).map(id => ({attribute, id}))));
      return {ids, danglingLabels, unnamed, danglingReferences};
    });
    assert.equal(new Set(result.ids).size, result.ids.length);
    assert.deepEqual(result.danglingLabels, []);
    assert.deepEqual(result.unnamed, []);
    assert.deepEqual(result.danglingReferences, []);
  });
  await check(`${scenario.id}: section 01 controls fit without overlap`, () => {
    assert(measured.section01 && measured.quantity && measured.grade, 'Section 01 geometry exists');
    assert.deepEqual(measured.overlaps, []);
    for (const control of measured.controls) {
      assert(control.x >= measured.section01.x - 1 && control.right <= measured.section01.right + 1,
        `Control escapes section 01: ${JSON.stringify(control)}`);
      assert(control.y >= measured.section01.y - 1 && control.bottom <= measured.section01.bottom + 1,
        `Control escapes section 01 vertically: ${JSON.stringify(control)}`);
    }
  });
  if (scenario.variant === 'after') {
    await check(`${scenario.id}: no new horizontal overflow and usable primary controls`, () => {
      const before = observed.get(scenario.counterpart)?.geometry;
      assert(before, 'Baseline geometry is required');
      assert(measured.documentWidth <= Math.max(measured.viewport, before.documentWidth) + 1);
      assert(measured.bodyWidth <= Math.max(measured.viewport, before.bodyWidth) + 1);
      assert(measured.grade.height >= 44 && measured.quantity.height >= 44, 'Primary fields meet 44px target height');
      assert(measured.cue.height >= 44, 'Start CTA has a 44px target');
      scenario.geometryDelta = {
        section01Top: measured.section01.y - before.section01.y,
        section01Height: measured.section01.height - before.section01.height,
        primaryInputTop: measured.quantity.y - before.quantity.y,
        resultsTop: measured.results.y - before.results.y,
      };
      // Vertical position is evidence, not an inferred usability target. The
      // cohesion change can legitimately trade spacing for readability; the
      // hard gates above cover containment, overlap, overflow and target size.
      return scenario.geometryDelta;
    });
  }
}

async function undoState(page, scenario, stage, expectedHidden) {
  const value = await page.locator('#undo-inventory').evaluate(node => ({
    hidden: node.hidden, display: getComputedStyle(node).display,
    rendered: !!node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden',
  }));
  scenario.undo[stage] = value;
  await check(`${scenario.id}: Undo ${stage} semantic and rendered state`, () => {
    assert.equal(value.hidden, expectedHidden, 'The hidden property matches undo availability');
    if (expectedHidden && value.rendered) {
      const before = scenario.variant === 'before' ? value : observed.get(scenario.counterpart)?.undo[stage];
      // Narrow, evidence-based allowance only for the already-existing mobile
      // .text-button {display:inline-flex} override of the native hidden style.
      // Flex-item blockification can make its computed display 'flex'.
      const inherited = require('../qa/ui-cohesion/inherited-undo.cjs')(scenario.width, value, before);
      assert(inherited, 'Newly visible hidden Undo button; not covered by the baseline defect');
      report.baselineIssues.push({scenario: scenario.id, stage, value, baseline: before,
        classification: 'inherited/out-of-scope',
        explanation: 'Mobile .text-button display:inline-flex overrides hidden in this baseline and candidate state'});
      return {status: 'inherited-baseline-defect', ...value};
    }
    assert.equal(value.rendered, !expectedHidden, 'Undo is rendered only while available');
    return value;
  });
}

async function applyCase(page, fixture) {
  const input = fixture.input;
  await page.locator(`[data-type="${input.type}"]`).click();
  await page.locator('#grade').selectOption(String(input.grade));
  await page.locator('#quantity').fill(String(input.quantity));
  await page.locator('#mode').selectOption(input.mode);
  for (const [key, value] of Object.entries(input.reform)) await page.locator(`[data-reform="${key}"]`).fill(String(value));
  for (const field of await page.locator('[data-inventory]').all()) {
    await field.fill(String(input.inventory[await field.getAttribute('data-inventory')]));
  }
  await page.locator('#quantity').press('Tab');
  await settled(page);
  const saved = await snapshot(page);
  assert.deepEqual(saved.input, input, 'Exact fixture state must be reached through visible inputs');
  assert.deepEqual(saved.calculation, fixture.output, 'All numerical outputs equal the immutable fixture');
  const fmt = n => new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(n);
  assert.equal(saved.output.total, fmt(fixture.output.total));
  assert.equal(saved.output['material-cost'], `${fmt(fixture.output.materialCost)} z`);
  assert.equal(saved.output['npc-cost'], `${fmt(fixture.output.fees)} z`);
}

async function priceFlow(page, scenario) {
  const before = await snapshot(page);
  await page.locator('[data-price="shadowOre"]').fill('123456');
  await page.locator('[data-price="shadowOre"]').press('Tab');
  await settled(page);
  const edited = await saveStage(page, scenario, 'price-edited');
  assert.equal(edited.input.prices.shadowOre, 123456);
  assert.deepEqual(edited.input.inventory, before.input.inventory);
  await page.reload({waitUntil: 'networkidle'}); await settled(page);
  assert.deepEqual(await snapshot(page), edited, 'Price edit persists after reload');
  await page.locator('[data-price="shadowOre"]').fill('');
  await settled(page);
  const blank = await saveStage(page, scenario, 'price-blank');
  assert.equal(blank.input.prices.shadowOre, '', 'Blank remains do-not-buy');
  await page.locator('[data-price="shadowOre"]').fill('0');
  await settled(page);
  const zero = await saveStage(page, scenario, 'price-zero');
  assert.equal(zero.input.prices.shadowOre, '', 'Zero means do-not-buy');
  assert.deepEqual(zero.calculation, blank.calculation);
  await page.locator('#reset-prices').click(); await settled(page);
  const reset = await saveStage(page, scenario, 'price-reset');
  assert.deepEqual(reset, before, 'Reset restores exact original prices, output and storage without changing inventory');
}

async function inventoryFlow(page, scenario) {
  const before = await snapshot(page);
  assert(Object.values(before.input.inventory).some(value => value > 0), 'Clear/undo fixture contains real stock');
  await undoState(page, scenario, 'initial', true);
  await page.locator('#clear-inventory').click(); await settled(page);
  await undoState(page, scenario, 'cleared', false);
  const cleared = await saveStage(page, scenario, 'inventory-cleared');
  const expectedInventory = {...before.input.inventory};
  for (const key of Object.keys(expectedInventory)) {
    if (key.startsWith(before.input.type) || key.startsWith('shadow') || key.startsWith('zelunium')) expectedInventory[key] = 0;
  }
  assert.deepEqual(cleared.input.inventory, expectedInventory);
  assert.deepEqual(cleared.input.prices, before.input.prices, 'Clear never changes prices');
  await page.locator('#undo-inventory').click(); await settled(page);
  await undoState(page, scenario, 'restored', true);
  assert.deepEqual(await saveStage(page, scenario, 'inventory-restored'), before, 'Undo restores exact state, output and storage');
  await page.reload({waitUntil: 'networkidle'}); await settled(page);
  await undoState(page, scenario, 'reloaded', true);
  assert.deepEqual(await snapshot(page), before, 'Restored inventory persists after reload');
}

async function quickstartFlow(page, scenario) {
  const before = await snapshot(page);
  const toggle = page.locator('#quickstart-toggle');
  assert(await page.locator('#quickstart-body').isVisible());
  await toggle.focus(); await page.keyboard.press('Space');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('#quickstart-body').evaluate(node => node.hidden), true);
  assert.equal(await page.locator('#quickstart-body').isVisible(), false);
  const collapsed = await saveStage(page, scenario, 'quickstart-collapsed');
  assert.deepEqual(collapsed.output, before.output);
  assert.deepEqual(collapsed.input, before.input);
  assert.deepEqual(collapsed.storage, {...before.storage, [`${KEY}.quickstart-hidden`]: '1'});
  await page.reload({waitUntil: 'networkidle'}); await settled(page);
  assert.equal(await page.locator('#quickstart-body').isVisible(), false, 'Collapse persists on reload');
  await toggle.focus(); await page.keyboard.press('Space');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  assert.equal(await page.locator('#quickstart-body').evaluate(node => node.hidden), false);
  assert(await page.locator('#quickstart-body').isVisible());
  const expanded = await saveStage(page, scenario, 'quickstart-expanded');
  assert.deepEqual(expanded.output, before.output);
  assert.deepEqual(expanded.input, before.input);
  assert.deepEqual(expanded.storage, {...before.storage, [`${KEY}.quickstart-hidden`]: '0'});
}

async function keyboardFlow(page, scenario) {
  const targets = ['.first-run-start', '.first-run-result', '.hero-meta a',
    '.nav-item[href="#calculator"]', '.nav-item[href="#materials"]', '.nav-item[href="#recipe"]',
    '#quickstart-body a[href="#materials"]', '#quickstart-body a[href="#recipe"]',
    '.target-panel .reform-guide a'];
  const seen = new Set();
  // Reload gives a genuine document-entry Tab sequence, including the nav's
  // shadow-root controls. Do not programmatically focus the CTA under test.
  await page.reload({waitUntil: 'networkidle'}); await settled(page);
  for (let count = 0; count < 100 && seen.size < targets.length; count++) {
    await page.keyboard.press('Tab');
    for (const selector of targets) {
      if (seen.has(selector)) continue;
      const state = await page.locator(selector).evaluate(node => {
        const style = getComputedStyle(node);
        return {focused: document.activeElement === node, focusVisible: node.matches(':focus-visible'),
          outline: style.outlineStyle, outlineWidth: parseFloat(style.outlineWidth),
          outlineColor: style.outlineColor, shadow: style.boxShadow, href: node.getAttribute('href')};
      });
      if (!state.focused) continue;
      assert(state.focusVisible, `${selector} has keyboard focus semantics`);
      assert((state.outline !== 'none' && state.outlineWidth >= 2 && state.outlineColor !== 'rgba(0, 0, 0, 0)') ||
        state.shadow !== 'none', `${selector} shows a visible focus indicator`);
      assert(state.href, `${selector} has a real link destination`);
      seen.add(selector);
      scenario.keyboard.push({selector, ...state});
      if (selector === '.first-run-start' || selector === '.first-run-result') {
        await capture(page, `${scenario.id}-${selector.slice(1)}-keyboard-focus`);
        const before = await snapshot(page);
        await page.keyboard.press('Enter'); await settled(page);
        assert.equal(new URL(page.url()).hash, state.href);
        const after = await snapshot(page);
        assert.deepEqual(after.storage, before.storage, 'CTA activation does not write storage');
        assert.deepEqual(after.output, before.output, 'CTA activation does not alter results');
        // Native anchor activation moves the Tab starting point. Restore the
        // link after testing activation, then continue the real Tab sequence.
        await page.locator(selector).focus();
      }
    }
  }
  assert.deepEqual(targets.filter(selector => !seen.has(selector)), [], 'CTA and supporting links are keyboard reachable');
}

async function runScenario(browser, variant, url, width, colorScheme, name, action) {
  const id = `${variant}-${width}-${colorScheme}-${name}`;
  const scenario = {id, variant, width, colorScheme, counterpart: `before-${width}-${colorScheme}-${name}`,
    stages: {}, undo: {}, keyboard: [], pageErrors: []};
  report.scenarios.push(scenario); observed.set(id, scenario);
  const context = await browser.newContext({viewport: {width, height: 900}, colorScheme,
    reducedMotion: 'reduce', serviceWorkers: 'block', locale: 'en-US'});
  const page = await context.newPage();
  page.setDefaultTimeout(10000); page.setDefaultNavigationTimeout(30000);
  page.on('pageerror', error => scenario.pageErrors.push(error.message));
  try {
    const loaded = await check(`${id}: load isolated page`, async () => {
      await page.goto(url + '?qa=ui-cohesion&preserve=1', {waitUntil: 'networkidle'});
      await settled(page);
      assert.equal(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches), colorScheme === 'dark');
    });
    if (loaded) await action(page, scenario);
  } catch (error) {
    await check(`${id}: remaining scenario`, () => { throw error; });
  } finally {
    await check(`${id}: no unhandled browser errors`, () => assert.deepEqual(scenario.pageErrors, []));
    await context.close(); writeReport();
  }
}

async function main() {
  let browser;
  try {
    report.baselineManifest = verifyBase();
    report.candidateSourceHashes = Object.fromEntries(['index.html', 'styles.css', 'app.js', 'calculator.js']
      .map(file => [file, digest(fs.readFileSync(path.join(ROOT, file)))]));
    const fixture = require(path.join(BASE, 'scripts/capture-ro-suite-baseline.cjs')).capture();
    const currentFixture = require('../scripts/capture-ro-suite-baseline.cjs').capture();
    report.fixtures = fixture.cases;
    await check('Exact calculator cases and storage keys remain unchanged from the immutable capture script', () => {
      assert.deepEqual(currentFixture.cases, fixture.cases);
      assert.deepEqual(currentFixture.storageKeys, fixture.storageKeys);
      assert.deepEqual(fixture.cases.map(item => item.name), ['default-accessory-supreme-100',
        'weapon-medium-12-with-stock', 'armor-high-5-shadow-and-reform']);
    });
    const {chromium} = require('playwright');
    report.playwrightVersion = require('playwright/package.json').version;
    assert.equal(report.playwrightVersion, '1.55.1', 'Use the pinned QA browser package');
    browser = await chromium.launch(); report.browserVersion = browser.version();
    for (const [variant, root] of [['before', BASE], ['after', ROOT]]) {
      const url = await serve(root);
      for (const width of WIDTHS) for (const colorScheme of THEMES) {
        await runScenario(browser, variant, url, width, colorScheme, 'first-visit', async (page, scenario) => {
          await saveStage(page, scenario, 'initial');
          await inspectLayout(page, scenario);
          await undoState(page, scenario, 'initial', true);
          await check(`${scenario.id}: keyboard CTA and link focus/activation`, () => keyboardFlow(page, scenario));
          // Clear hash through navigation only, while preserving the current
          // isolated storage; quickstart's output/state invariants are separate.
          await page.goto(url + '?qa=ui-cohesion&preserve=1', {waitUntil: 'networkidle'}); await settled(page);
          await check(`${scenario.id}: quickstart keyboard collapse, reload and expand`, () => quickstartFlow(page, scenario));
        });
        for (const item of fixture.cases) {
          await runScenario(browser, variant, url, width, colorScheme, item.name, async (page, scenario) => {
            const applied = await check(`${scenario.id}: exact captured inputs and numerical output`, () => applyCase(page, item));
            if (!applied) return;
            const saved = await saveStage(page, scenario, 'fixture');
            await check(`${scenario.id}: fixture output and full storage survive reload`, async () => {
              await page.reload({waitUntil: 'networkidle'}); await settled(page);
              assert.deepEqual(await snapshot(page), saved);
            });
            if (item.name === 'weapon-medium-12-with-stock') {
              await check(`${scenario.id}: price edit, persistence, blank/zero and reset`, () => priceFlow(page, scenario));
              await check(`${scenario.id}: inventory clear and undo`, () => inventoryFlow(page, scenario));
            }
          });
        }
      }
    }
    await check('Baseline tree remained immutable throughout browser QA', () => assert.deepEqual(verifyBase(), report.baselineManifest));
  } catch (error) {
    await check('Browser suite setup or infrastructure', () => { throw error; });
  } finally {
    if (browser) await browser.close();
    await Promise.all(servers.map(server => new Promise(resolve => server.close(resolve))));
    report.finishedAt = new Date().toISOString();
    report.status = report.checks.some(item => item.status === 'failed') ? 'FAIL' : 'PASS';
    report.summary = {passed: report.checks.filter(item => item.status === 'passed').length,
      failed: report.checks.filter(item => item.status === 'failed').length,
      screenshots: report.screenshots.length, inheritedBaselineObservations: report.baselineIssues.length};
    writeReport();
    console.log(JSON.stringify({status: report.status, ...report.summary, report: path.join(OUT, 'report.json')}, null, 2));
    if (report.status !== 'PASS') process.exitCode = 1;
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
