'use strict';

// Run with the workflow's temporary, pinned Playwright install on NODE_PATH.
// No browser dependency, app bundle, or production package manifest is changed.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const outputDir = path.resolve(process.env.RO_QA_OUTPUT || path.join(root, 'artifacts/ro-suite-nav'));
const baseURL = process.env.RO_QA_URL || 'http://127.0.0.1:4173/ro-reform-preparation/';
const portalURL = 'https://econds.github.io/ro_tools_portal/';
const navPath = '/ro-reform-preparation/assets/ro-suite/1.3.0/nav.js';
const query = '?qa=preserve%20query&count=3';
const storageKey = 'reform-workshop.v1';
const report = {
  startedAt: new Date().toISOString(),
  status: 'running',
  browser: 'Chromium',
  themeMethod: 'Browser prefers-color-scheme emulation; no app theme switch',
  checks: [], scenarios: [], screenshots: [],
  scopeNotes: [
    'The app has no import/export or query-based state-sharing feature.',
    'Only exact Google Fonts network failures and the deliberately blocked nav module are explained separately; unknown errors are compared with the pre-integration page.',
    'Portal activation is intercepted with a local test response; tests do not leave the calculator for a live external site.'
  ]
};
fs.mkdirSync(outputDir, {recursive: true});

function saveReport() {
  fs.writeFileSync(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2) + '\n');
}
async function check(name, fn) {
  try {
    const detail = await fn();
    report.checks.push({name, status: 'passed', ...(detail === undefined ? {} : {detail})});
    console.log(`PASS ${name}`);
    return true;
  } catch (error) {
    report.checks.push({name, status: 'failed', error: error.stack || String(error)});
    console.error(`FAIL ${name}: ${error.message}`);
    return false;
  } finally { saveReport(); }
}
function observe(page) {
  const events = [];
  page.on('console', message => {
    if (message.type() === 'error') events.push({kind: 'console', text: message.text(), url: message.location().url || ''});
  });
  page.on('pageerror', error => events.push({kind: 'pageerror', text: error.message, url: ''}));
  page.on('requestfailed', request => events.push({kind: 'requestfailed', text: request.failure()?.errorText || 'unknown failure', url: request.url()}));
  page.on('response', response => {
    if (response.status() >= 400) events.push({kind: 'http', text: String(response.status()), url: response.url()});
  });
  return events;
}
function explained(event, blockedModule) {
  let url;
  try { url = new URL(event.url); } catch { return null; }
  const isNetworkError = event.kind === 'requestfailed' || event.kind === 'http' ||
    (event.kind === 'console' && /^Failed to load resource:/.test(event.text));
  if (!isNetworkError) return null;
  if (['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) {
    return 'Pre-existing styles.css Google Fonts dependency: external network/resource failure';
  }
  if (blockedModule && url.origin === new URL(baseURL).origin && url.pathname === navPath) {
    return 'Expected failure: this scenario deliberately aborts the exact nav.js request';
  }
  return null;
}
function eventKey(event) { return JSON.stringify([event.kind, event.text, event.url]); }
function compareErrors(events, baseline, blockedModule) {
  const inherited = new Set(baseline.map(eventKey));
  const classified = events.map(event => ({...event, explanation: explained(event, blockedModule) ||
    (inherited.has(eventKey(event)) ? 'Also observed on the original, pre-integration page' : null)}));
  return {events: classified, newErrors: classified.filter(event => !event.explanation)};
}
async function settled(page) {
  await page.locator('#quantity').waitFor();
  await page.waitForFunction(() => window.Reform && document.querySelector('#total').textContent !== '125,300,000');
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function focused(locator) {
  return locator.evaluate(element => element.getRootNode().activeElement === element);
}
async function geometry(page, navExpected = true) {
  const result = await page.evaluate(navExpected => {
    const rect = element => {
      const r = element.getBoundingClientRect();
      return {left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height};
    };
    const host = document.querySelector('ro-suite-nav');
    const nav = host?.shadowRoot?.querySelector('nav');
    const items = nav ? [...nav.querySelectorAll('a,button')].filter(element => element.getClientRects().length).map(element => ({text: element.textContent, ...rect(element)})) : [];
    const overlaps = [];
    for (let a = 0; a < items.length; a++) for (let b = a + 1; b < items.length; b++) {
      const one = items[a], two = items[b];
      if (Math.min(one.right, two.right) - Math.max(one.left, two.left) > 1 &&
          Math.min(one.bottom, two.bottom) - Math.max(one.top, two.top) > 1) overlaps.push([one.text, two.text]);
    }
    return {
      viewport: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      nav: nav ? rect(nav) : null,
      header: rect(document.querySelector('.site-header')),
      hero: rect(document.querySelector('.hero')),
      controls: items,
      overlaps,
      navExpected
    };
  }, navExpected);
  assert.ok(result.documentWidth <= result.viewport + 1, `Document overflow: ${JSON.stringify(result)}`);
  assert.ok(result.bodyWidth <= result.viewport + 1, `Body overflow: ${JSON.stringify(result)}`);
  if (navExpected) {
    assert.ok(result.nav, 'The upgraded shadow navigation exists');
    assert.ok(result.nav.left >= -1 && result.nav.right <= result.viewport + 1, 'Navigation fits viewport');
    assert.ok(result.nav.bottom <= result.header.top + 1, 'Navigation does not overlap the existing app header');
    assert.ok(result.header.bottom <= result.hero.top + 1, 'Existing header does not overlap hero at page top');
    for (const control of result.controls) {
      assert.ok(control.width >= 44 && control.height >= 44, `Under-sized nav target: ${JSON.stringify(control)}`);
      assert.ok(control.left >= -1 && control.right <= result.viewport + 1, `Offscreen nav target: ${JSON.stringify(control)}`);
    }
    assert.deepEqual(result.overlaps, [], 'Navigation controls do not overlap');
  }
  return result;
}
async function textContrast(page) {
  const results = await page.evaluate(() => {
    const nav = document.querySelector('ro-suite-nav').shadowRoot.querySelector('nav');
    const channels = color => {
      const match = /^rgba?\(([^)]+)\)$/.exec(color);
      if (!match) throw new Error(`Unsupported computed color: ${color}`);
      return match[1].split(',').map(Number);
    };
    const luminance = color => channels(color).slice(0, 3).map(value => {
      value /= 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    return [...nav.querySelectorAll('a,button,.current,li > span,p')]
      .filter(element => element.getClientRects().length && element.textContent.trim())
      .map(element => {
        const foreground = getComputedStyle(element).color;
        let ancestor = element, background;
        while (ancestor) {
          background = getComputedStyle(ancestor).backgroundColor;
          const values = channels(background);
          if (values.length < 4 || values[3] === 1) break;
          ancestor = ancestor.parentElement;
        }
        if (!ancestor) throw new Error('Navigation text has no opaque background');
        const one = luminance(foreground), two = luminance(background);
        return {text: element.textContent.trim(), foreground, background, contrast: (Math.max(one, two) + 0.05) / (Math.min(one, two) + 0.05)};
      });
  });
  for (const result of results) assert.ok(result.contrast >= 4.5, `Navigation text contrast is below 4.5:1: ${JSON.stringify(result)}`);
  return results;
}
async function screenshot(page, label) {
  const file = `${label}.png`;
  await page.screenshot({path: path.join(outputDir, file), fullPage: false, animations: 'disabled'});
  report.screenshots.push(file);
}
async function applyCase(page, fixtureCase, storageKeys) {
  const input = fixtureCase.input;
  // Reset only the documented app keys in this isolated browser context.
  // Never erase unrelated origin storage.
  await page.evaluate(keys => keys.forEach(key => localStorage.removeItem(key)), storageKeys);
  await page.reload({waitUntil: 'networkidle'});
  await settled(page);
  await page.locator(`[data-type="${input.type}"]`).click();
  await page.locator('#grade').selectOption(String(input.grade));
  await page.locator('#quantity').fill(String(input.quantity));
  await page.locator('#mode').selectOption(input.mode);
  for (const [key, value] of Object.entries(input.reform)) await page.locator(`[data-reform="${key}"]`).fill(String(value));
  for (const field of await page.locator('[data-inventory]').all()) {
    await field.fill(String(input.inventory[await field.getAttribute('data-inventory')]));
  }
  // Current fixture prices are unchanged defaults. Fail if that ever changes
  // rather than silently bypassing the price input UI in a future fixture.
  const prices = await page.evaluate(() => JSON.parse(localStorage.getItem('reform-workshop.v1')).prices);
  assert.deepEqual(prices, input.prices, 'Baseline prices match the visible app initialization');
  const expectedTotal = new Intl.NumberFormat('en-US', {maximumFractionDigits: 2}).format(fixtureCase.output.total);
  await page.waitForFunction(total => document.querySelector('#total').textContent === total, expectedTotal);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('reform-workshop.v1')));
  assert.deepEqual(saved, input, 'Input-driven state equals the pre-integration case');
  assert.deepEqual(await page.evaluate(input => window.Reform.calculate(input), saved), fixtureCase.output, 'Every calculated output matches the frozen baseline');
  assert.equal(await page.locator('#material-cost').textContent(), new Intl.NumberFormat('en-US').format(fixtureCase.output.materialCost) + ' z');
  assert.equal(await page.locator('#npc-cost').textContent(), new Intl.NumberFormat('en-US').format(fixtureCase.output.fees) + ' z');
  const urlBefore = page.url();
  await page.reload({waitUntil: 'networkidle'});
  await settled(page);
  assert.equal(await page.locator('#total').textContent(), expectedTotal, 'Saved calculation survives reload');
  assert.equal(page.url(), urlBefore, 'Reload preserves query and hash');
  return {name: fixtureCase.name, displayedTotal: expectedTotal, output: fixtureCase.output};
}

async function main() {
  const fixture = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/ro-suite-nav-baseline.json'), 'utf8'));
  report.baseCommit = '9d577c00b8fd13fd8687fbb936657ae035473917';
  report.commit = process.env.RO_QA_COMMIT || execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root, encoding: 'utf8'}).trim();
  const sourcesValid = await check('App, calculator, and CSS match the frozen baseline byte-for-byte', () => {
    for (const [file, expected] of Object.entries(fixture.preservedSourceSha256)) {
      assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'), expected, file);
    }
  });
  if (!sourcesValid) throw new Error('Baseline source identity failed; console baseline would not be trustworthy');
  const baselineHTML = execFileSync('git', ['show', `${report.baseCommit}:index.html`], {cwd: root, encoding: 'utf8'});
  const {chromium} = require('playwright');
  report.playwrightVersion = require('playwright/package.json').version;
  const browser = await chromium.launch();
  report.browserVersion = browser.version();
  try {
    for (const width of [360, 390, 768, 1440]) for (const colorScheme of ['light', 'dark']) {
      const label = `${width}-${colorScheme}`;
      const viewport = {width, height: width >= 768 ? 1000 : 844};
      const scenario = {label, viewport, colorScheme};
      report.scenarios.push(scenario);
      const baselineContext = await browser.newContext({viewport, colorScheme});
      const baselinePage = await baselineContext.newPage();
      const baselineEvents = observe(baselinePage);
      // The original HTML loads the exact same app/CSS assets, whose hashes
      // were checked above. Only the new suite component is absent.
      await baselinePage.route(url => url.origin === new URL(baseURL).origin && url.pathname === new URL(baseURL).pathname,
        route => route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: baselineHTML}));
      await check(`${label}: original page baseline`, async () => {
        await baselinePage.goto(baseURL, {waitUntil: 'networkidle'});
        await settled(baselinePage);
        assert.equal(await baselinePage.locator('#total').textContent(), fixture.initialDisplayedTotal);
        scenario.baselineGeometry = await geometry(baselinePage, false);
        for (const fixtureCase of fixture.cases) await applyCase(baselinePage, fixtureCase, fixture.storageKeys);
      });
      scenario.baselineErrors = baselineEvents;
      await baselineContext.close();

      const context = await browser.newContext({viewport, colorScheme});
      const page = await context.newPage();
      page.setDefaultTimeout(10000);
      const events = observe(page);
      try {
        const loaded = await check(`${label}: initial calculation and closed navigation`, async () => {
          await page.goto(baseURL, {waitUntil: 'networkidle'});
          await settled(page);
          if ([390, 1440].includes(width)) await screenshot(page, `${label}-closed`);
          await page.locator('ro-suite-nav button').waitFor();
          assert.equal(await page.locator('#total').textContent(), fixture.initialDisplayedTotal);
          assert.equal(await page.locator('ro-suite-nav').getAttribute('theme'), null, 'Theme follows browser preference');
          assert.equal(await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches), colorScheme === 'dark');
          assert.equal(await page.locator('ro-suite-nav').evaluate(host => getComputedStyle(host).colorScheme), colorScheme);
          scenario.closedGeometry = await geometry(page);
          scenario.closedTextContrast = await textContrast(page);
        });
        if (loaded) {
          await check(`${label}: live system-theme changes preserve calculation and storage`, async () => {
            const before = await page.evaluate(() => ({
              total: document.querySelector('#total').textContent,
              storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
              url: location.href
            }));
            try {
              for (const scheme of [colorScheme === 'light' ? 'dark' : 'light', colorScheme]) {
                await page.emulateMedia({colorScheme: scheme});
                await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
                assert.equal(await page.locator('ro-suite-nav').evaluate(host => getComputedStyle(host).colorScheme), scheme);
                assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme), scheme);
                await textContrast(page);
                assert.deepEqual(await page.evaluate(() => ({
                  total: document.querySelector('#total').textContent,
                  storage: Object.fromEntries(Object.keys(localStorage).sort().map(key => [key, localStorage.getItem(key)])),
                  url: location.href
                })), before, 'Theme change leaves calculator state and URL untouched');
              }
            } finally { await page.emulateMedia({colorScheme}); }
          });
          await check(`${label}: Tab, Enter, Space, Escape, focus return and open layout`, async () => {
            const nav = page.locator('ro-suite-nav');
            const toggle = nav.getByRole('button', {name: 'เครื่องมืออื่น'});
            const portal = nav.getByRole('link', {name: 'กลับ RO Tools Portal'});
            await page.keyboard.press('Tab');
            assert.ok(await focused(page.locator('.skip')), 'Existing skip link stays first');
            await page.keyboard.press('Tab');
            assert.ok(await focused(portal), 'Portal is the first suite navigation tab stop');
            await page.keyboard.press('Tab');
            assert.ok(await focused(toggle), 'Toggle is reachable using Tab');
            assert.notEqual(await toggle.evaluate(element => getComputedStyle(element).outlineStyle), 'none', 'Keyboard focus is visible');
            await page.keyboard.press('Enter');
            assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
            const current = nav.locator('a[aria-current="page"]');
            assert.equal(await current.count(), 1);
            assert.equal((await current.textContent()).trim(), 'Reform Workshop');
            assert.equal(await current.getAttribute('href'), fixture.publicUrl);
            assert.equal(await nav.getByRole('link', {name:'Best Status',exact:true}).getAttribute('href'),'https://econds.github.io/ro-best-status/');
            assert.equal(await nav.getByRole('link', {name:'Grade & Refine',exact:true}).count(),0);
            assert.equal(await nav.locator('#tools a').count(),5);
            if ([390, 1440].includes(width)) await screenshot(page, `${label}-open`);
            scenario.openGeometry = await geometry(page);
            scenario.openTextContrast = await textContrast(page);
            const links = nav.locator('#tools a');
            await page.keyboard.press('Tab');
            assert.ok(await focused(links.first()), 'Tab enters the expanded tools');
            await page.keyboard.press('Escape');
            assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
            assert.ok(await focused(toggle), 'Escape returns focus to the opener');
            await page.keyboard.press('Space');
            assert.equal(await toggle.getAttribute('aria-expanded'), 'true', 'Space opens the native button');
            for (const link of await links.all()) {
              await page.keyboard.press('Tab');
              assert.ok(await focused(link), 'Tool link is in ordinary Tab order');
            }
            await page.keyboard.press('Tab');
            assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'Tab away dismisses the tools');
            assert.ok(await focused(page.locator('.brand')), 'Focus continues into the original app');
            await toggle.focus();
            await page.keyboard.press('Space');
            await page.keyboard.press('Space');
            assert.equal(await toggle.getAttribute('aria-expanded'), 'false', 'Repeated activation closes the tools');
          });
          await check(`${label}: query/hash and calculator state survive navigation interaction`, async () => {
            await page.goto(baseURL + query + '#calculator', {waitUntil: 'networkidle'});
            await settled(page);
            const original = page.url();
            const originalState = await page.evaluate(() => localStorage.getItem('reform-workshop.v1'));
            await page.locator('ro-suite-nav button').click();
            await page.keyboard.press('Escape');
            assert.equal(page.url(), original);
            assert.equal(await page.evaluate(() => localStorage.getItem('reform-workshop.v1')), originalState);
            for (const fixtureCase of fixture.cases) await applyCase(page, fixtureCase, fixture.storageKeys);
            const beforePrice = await page.locator('#total').textContent();
            await page.locator('[data-price="shadowOre"]').fill('123456');
            const customState = await page.evaluate(() => JSON.parse(localStorage.getItem('reform-workshop.v1')));
            assert.equal(customState.prices.shadowOre,123456);
            await page.waitForFunction(previous => document.querySelector('#total').textContent !== previous, beforePrice);
            assert.equal(await page.locator('#total').textContent(),new Intl.NumberFormat('en-US').format(await page.evaluate(input => window.Reform.calculate(input).total,customState)));
            await page.reload({waitUntil:'networkidle'});
            assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('reform-workshop.v1')).prices.shadowOre),123456);
            await applyCase(page, fixture.cases.at(-1), fixture.storageKeys);
            assert.equal(page.url(), original, 'Calculation inputs preserve query and hash');
            await page.locator('#quickstart-toggle').click();
            assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).sort()), fixture.storageKeys, 'No suite navigation storage keys are added');
            for (const hash of fixture.share.hashAnchors) {
              await page.goto(baseURL + query + hash, {waitUntil: 'networkidle'});
              assert.equal(new URL(page.url()).search, query);
              assert.equal(new URL(page.url()).hash, hash);
              assert.equal(await page.locator('#total').textContent(), new Intl.NumberFormat('en-US').format(fixture.cases.at(-1).output.total));
            }
            return {cases: fixture.cases.map(item => ({name: item.name, total: item.output.total})), query, hashes: fixture.share.hashAnchors};
          });
        }
      } finally {
        scenario.errorComparison = compareErrors(events, baselineEvents, false);
        await check(`${label}: no new console, page, request or HTTP errors`, () => assert.deepEqual(scenario.errorComparison.newErrors, []));
        await context.close();
      }

      const fallbackContext = await browser.newContext({viewport, colorScheme});
      const fallbackPage = await fallbackContext.newPage();
      fallbackPage.setDefaultTimeout(10000);
      const fallbackEvents = observe(fallbackPage);
      let blockedRequests = 0;
      await fallbackPage.route(url => url.origin === new URL(baseURL).origin && url.pathname === navPath, route => {
        blockedRequests++;
        return route.abort('failed');
      });
      try {
        await check(`${label}: blocked nav.js retains functional fallback and calculator`, async () => {
          await fallbackPage.goto(baseURL + query + '#calculator', {waitUntil: 'networkidle'});
          await settled(fallbackPage);
          assert.ok(blockedRequests > 0, 'The exact module request was actually blocked');
          assert.equal(await fallbackPage.locator('ro-suite-nav').evaluate(host => host.shadowRoot), null);
          const fallback = fallbackPage.locator('ro-suite-nav > nav > a');
          await fallback.waitFor({state: 'visible'});
          assert.equal(await fallback.getAttribute('href'), portalURL);
          const bounds = await fallback.boundingBox();
          assert.ok(bounds && bounds.width >= 44 && bounds.height >= 44, `Fallback target is at least 44 × 44 CSS pixels: ${JSON.stringify(bounds)}`);
          for (const fixtureCase of fixture.cases) await applyCase(fallbackPage, fixtureCase, fixture.storageKeys);
          assert.equal(new URL(fallbackPage.url()).search, query);
          assert.equal(new URL(fallbackPage.url()).hash, '#calculator');
          await fallbackPage.evaluate(() => window.scrollTo({top: 0, left: 0, behavior: 'instant'}));
          await fallbackPage.waitForFunction(() => window.scrollY === 0 && window.scrollX === 0);
          await fallbackPage.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const screenshotBounds = await fallback.boundingBox();
          assert.ok(screenshotBounds && screenshotBounds.x >= 0 && screenshotBounds.y >= 0 &&
            screenshotBounds.x + screenshotBounds.width <= viewport.width &&
            screenshotBounds.y + screenshotBounds.height <= viewport.height,
          'The fallback is fully within the screenshot viewport after scrolling settles');
          if ([390, 1440].includes(width)) await screenshot(fallbackPage, `${label}-blocked-module`);
          scenario.fallbackGeometry = await geometry(fallbackPage, false);
          await fallbackPage.route(portalURL, route => route.fulfill({status: 200, contentType: 'text/html', body: '<title>Portal fallback destination</title><p>Test destination</p>'}));
          await fallbackPage.locator('.skip').focus();
          await fallbackPage.keyboard.press('Tab');
          assert.ok(await focused(fallback), 'Fallback is keyboard reachable');
          await Promise.all([fallbackPage.waitForURL(portalURL), fallbackPage.keyboard.press('Enter')]);
          assert.equal(await fallbackPage.title(), 'Portal fallback destination', 'Fallback link activates without nav.js');
          return {blockedRequests, fallbackBounds: bounds};
        });
      } finally {
        scenario.fallbackErrorComparison = compareErrors(fallbackEvents, baselineEvents, true);
        await check(`${label}: no unexpected errors with module blocked`, () => assert.deepEqual(scenario.fallbackErrorComparison.newErrors, []));
        await fallbackContext.close();
      }
    }
  await check('Optional catalog failure uses all bundled tools without changing application state', async () => {
      const context = await browser.newContext();
      const page = await context.newPage();
      const catalogURL = 'https://econds.github.io/ro_tools_portal/catalog/v1/tools.json';
      let requests = 0;
      await page.route(catalogURL, route => { requests++; return route.abort('failed'); });
      await page.goto(baseURL + query + '#calculator', {waitUntil:'networkidle'});
      await settled(page);
      const before = await page.evaluate(() => ({url:location.href, state:localStorage.getItem('reform-workshop.v1'), total:document.querySelector('#total').textContent}));
      await page.locator('ro-suite-nav').evaluate((host,url) => host.setAttribute('catalog-url',url),catalogURL);
      await page.locator('ro-suite-nav button').click();
      await page.waitForTimeout(1700);
      assert.equal(requests,1);
      assert.equal(await page.locator('ro-suite-nav #tools a').count(),5);
      assert.equal(await page.locator('ro-suite-nav').getByRole('link',{name:'Best Status',exact:true}).getAttribute('href'),'https://econds.github.io/ro-best-status/');
      assert.deepEqual(await page.evaluate(() => ({url:location.href, state:localStorage.getItem('reform-workshop.v1'), total:document.querySelector('#total').textContent})), before);
      await context.close();
    });
  } finally { await browser.close(); }
}

main().catch(error => {
  report.fatal = error.stack || String(error);
  console.error(report.fatal);
}).finally(() => {
  report.finishedAt = new Date().toISOString();
  report.status = report.fatal || report.checks.some(check => check.status === 'failed') ? 'failed' : 'passed';
  saveReport();
  console.log(`Browser QA ${report.status}; report: ${path.join(outputDir, 'report.json')}`);
  if (report.status !== 'passed') process.exitCode = 1;
});
