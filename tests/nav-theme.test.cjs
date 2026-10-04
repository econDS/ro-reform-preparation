'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file));
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
test('theme rollout preserves all existing production bytes after two exact integration reversals', () => {
  for (const [file, digest] of Object.entries(require('../qa/nav-theme/production-baseline.json').files)) {
    const bytes = file === 'index.html' ? require('../qa/nav-theme/normalize.cjs')(read(file).toString()) : file === 'styles.css' ? require('../qa/ui-cohesion/normalize.cjs')(read(file), file) : read(file);
    assert.equal(hash(bytes), digest, file);
  }
});
test('nav 1.5.1 is the immutable Portal release with unchanged catalog and eight host semantic tokens', () => {
  for (const [file, digest] of Object.entries(require('../qa/nav-theme/frozen-1.5.0-hashes.json'))) assert.equal(hash(read('assets/ro-suite/1.5.0/' + file)), digest, 'frozen 1.5.0: ' + file);
  const dir = 'assets/ro-suite/1.5.1/';
  const lock = JSON.parse(read(dir + 'nav.lock.json'));
  assert.equal(lock.bundleVersion, '1.5.1');
  assert.equal(lock.sourceCommit, '44b090748afc1dbf13eb5d4b78d2a0102d9d9e9c');
  for (const [file, digest] of Object.entries(require('../qa/nav-theme/release-hashes.json'))) assert.equal(hash(read(dir + file)), digest, file);
  for (const [file, data] of Object.entries(lock.files)) assert.equal(hash(read(dir + file)), data.sha256, file);
  assert.deepEqual(JSON.parse(read(dir + 'catalog.snapshot.json')), JSON.parse(read('assets/ro-suite/1.4.1/catalog.snapshot.json')));
  const css = read('assets/ro-suite/host-theme.css').toString();
  const bindings = require('../qa/nav-theme/bindings.json');
  assert.equal(Object.keys(bindings).length, 8);
  for (const [key, value] of Object.entries(bindings)) assert.ok(css.includes(`--ro-suite-${key}: ${value};`), key);
  assert.doesNotMatch(css, /::part|::shadow|!important|\.bar|#tools|(?:max-width|min-height|padding)\s*:/);
  assert.match(css, /font-family: var\(--ro-suite-font-family\)/);
  assert.match(css, /outline: 2px solid var\(--ro-suite-focus\)/);
  assert.match(read('index.html').toString(), /assets\/ro-suite\/1\.5\.1\/nav\.js/);
});
