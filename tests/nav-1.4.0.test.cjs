'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '..');
const baseline = require('../qa/nav-1.4.0/production-baseline.json');
const release = path.join(root, 'assets/ro-suite/1.4.0');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const read = file => fs.readFileSync(path.join(root, file));
test('nav 1.4 files are identical to the immutable Portal release', () => {
  const expected = require('../qa/nav-1.4.0/release-hashes.json');
  for (const [file, digest] of Object.entries(expected)) assert.equal(hash(fs.readFileSync(path.join(release, file))), digest, file);
  const lock = JSON.parse(fs.readFileSync(path.join(release, 'nav.lock.json')));
  assert.equal(lock.bundleVersion, '1.4.0');
  assert.equal(lock.sourceCommit, '24ca1068c8f6868b38d6224e661f818fec9897f9');
  for (const [file, data] of Object.entries(lock.files)) assert.equal(expected[file], data.sha256, file);
  assert.deepEqual(JSON.parse(read('assets/ro-suite/1.3.0/catalog.snapshot.json')), JSON.parse(fs.readFileSync(path.join(release, 'catalog.snapshot.json'))), 'destinations and tool identities are unchanged');
});
test('every existing production file including first-run UI and old releases is byte-preserved after exact nav delta reversal', () => {
  for (const [file, digest] of Object.entries(baseline.files)) {
    const bytes = file === 'index.html' ? require('../qa/nav-1.4.0/normalize.cjs')(read(file).toString()) : read(file);
    assert.equal(hash(bytes), digest, file);
  }
  const html = read('index.html').toString();
  assert.equal((html.match(/<ro-suite-nav\b/g) || []).length, 1);
  assert.equal((html.match(/type="module" src=".\/assets\/ro-suite\/1\.4\.0\/nav\.js"/g) || []).length, 1);
  assert.doesNotMatch(html, /<ro-suite-nav[^>]*(?:theme|catalog-url)=/);
  assert.match(html, /ro-suite-nav > nav[^}]*min-height:\s*52px/);
  assert.match(html, /ro-suite-nav > nav > a[^}]*min-height:\s*44px/);
  assert.match(html, /ro-suite-nav > nav > a[^}]*min-width:\s*44px/);
  assert.match(html, /ro-suite-nav > nav > a[^}]*padding:\s*8px 0[;}]/, 'fallback text starts on the same content edge');
});
test('exact latest-main calculation, saved settings and serialization fixtures remain unchanged', () => {
  const script = baseline.repository.endsWith('/ro-leveling-map') ? 'tests/capture-leveling-baseline.cjs' : 'scripts/capture-ro-suite-baseline.cjs';
  const actual = JSON.parse(execFileSync(process.execPath, [script], {cwd: root, encoding: 'utf8'}));
  assert.deepEqual(actual, require('../qa/nav-1.4.0/calculation-baseline.json'));
});
