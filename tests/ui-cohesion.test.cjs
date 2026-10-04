'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const normalize = require('../qa/ui-cohesion/normalize.cjs');
const manifest = require('../qa/ui-cohesion/changes.json');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const html = read('index.html'), css = read('styles.css');
const beforeHtml = normalize(html), beforeCSS = normalize(css, 'styles.css');
const matches = (text, regex) => [...text.matchAll(regex)].map(match => match[0]);

test('reviewed cohesion deltas reverse live HTML and CSS to the immutable main hashes', () => {
  assert.equal(manifest.baseCommit, '00975def134eb9e0098f944e98b8286d8bc3bfdd');
  for (const [file, entry] of Object.entries(manifest.files)) {
    assert.equal(hash(read(file)), entry.reviewedSha256, `reviewed live source: ${file}`);
    assert.equal(hash(normalize(read(file), file)), entry.beforeSha256, `immutable baseline: ${file}`);
  }
});

test('live light/dark palette, navigation integration and scripts are unchanged', () => {
  assert.deepEqual(matches(css, /:root\s*\{[^}]*\}/g), matches(beforeCSS, /:root\s*\{[^}]*\}/g));
  for (const regex of [/<script\b[^>]*>[\s\S]*?<\/script>/g, /<ro-suite-nav\b[\s\S]*?<\/ro-suite-nav>/g,
    /<style>\s*ro-suite-nav[\s\S]*?<\/style>/g, /<link[^>]*host-theme\.css[^>]*>/g]) {
    assert.deepEqual(matches(html, regex), matches(beforeHtml, regex));
  }
  const expected = require('./fixtures/ro-suite-nav-baseline.json').preservedSourceSha256;
  for (const file of ['app.js', 'calculator.js']) assert.equal(hash(read(file)), expected[file], file);
});

test('live control contracts, IDs, destinations, advisories and first-run path remain intact', () => {
  const ids = text => [...text.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]).sort();
  assert.deepEqual(ids(html), ids(beforeHtml));
  assert.equal(new Set(ids(html)).size, ids(html).length);
  const urls = text => [...new Set([...text.matchAll(/\bhref="([^"]+)"/g)].map(match => match[1]))].sort();
  assert.deepEqual(urls(html), urls(beforeHtml));
  assert.deepEqual(matches(html, /<(?:input|select)\b[^>]*>/g), matches(beforeHtml, /<(?:input|select)\b[^>]*>/g));
  for (const text of ['ไม่ใช่ราคาสด', 'ไม่บังคับ', '/navi', 'เว็บไม่ดึงราคาสด']) assert.ok(html.includes(text), text);
  assert.match(html, /class="first-run-start" href="#main"/);
  assert.match(html, /class="first-run-result" href="#results"/);
  assert.ok(html.indexOf('id="results"') < html.indexOf('id="materials"'));
  assert.equal(matches(html, /<style>/g).length, 1, 'only the immutable navigation inline stylesheet remains');
});

test('strict transition rejects missing, duplicate and unrelated HTML/CSS mutations', () => {
  for (const file of ['index.html', 'styles.css']) {
    const source = read(file), fragment = manifest.files[file].changes[0][1];
    assert.throws(() => normalize(source.replace(fragment, ''), file), /exactly one reviewed UI delta/);
    assert.throws(() => normalize(source + fragment, file), /exactly one reviewed UI delta/);
    assert.throws(() => normalize(source + '\n/* unreviewed bytes */', file), /all bytes outside reviewed UI deltas preserved/);
  }
  for (const [from, to] of [['id="quantity"', 'id="other"'], ['tool-id="reform-workshop"', 'tool-id="other"'],
    ['src="app.js"', 'src="other.js"']]) assert.throws(() => normalize(html.replace(from, to)));
  assert.throws(() => normalize(css.replace('--accent:#c6ef7a', '--accent:#000000'), 'styles.css'));
});

test('capture transition validates live CSS and cannot hide calculation or storage mutations', () => {
  const actual = require('../scripts/capture-ro-suite-baseline.cjs').capture();
  const baseline = require('./fixtures/ro-suite-nav-baseline.json');
  assert.deepEqual(normalize.capture(actual), baseline);
  const wrongHash = structuredClone(actual); wrongHash.preservedSourceSha256['styles.css'] = 'unrelated';
  assert.throws(() => normalize.capture(wrongHash), /capture fingerprint describes live CSS/);
  for (const mutate of [value => value.cases[0].output.total++, value => value.storageKeys.push('unexpected')]) {
    const changed = structuredClone(actual); mutate(changed);
    assert.throws(() => assert.deepEqual(normalize.capture(changed), baseline));
  }
});
