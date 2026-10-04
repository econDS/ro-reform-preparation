'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const manifest = require('./changes.json');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

// Reverse only the reviewed UI delta from LIVE source. No archived fixture is
// substituted. Missing/duplicated deltas and any unrelated byte change fail.
function normalize(source, file = 'index.html') {
  const entry = manifest.files[file];
  assert.ok(entry, `reviewed UI transition exists: ${file}`);
  let result = source.toString();
  for (const [before, after] of [...entry.changes].reverse()) {
    assert.equal(result.split(after).length, 2, `${file}: exactly one reviewed UI delta`);
    result = result.replace(after, before);
  }
  assert.equal(hash(result), entry.beforeSha256, `${file}: all bytes outside reviewed UI deltas preserved`);
  return result;
}

// Calculation capture remains unchanged and runs the actual application. Its
// CSS fingerprint is compared through the same exact live-source transition.
normalize.capture = actual => {
  const css = fs.readFileSync(path.resolve(__dirname, '../../styles.css'));
  assert.equal(actual.preservedSourceSha256['styles.css'], hash(css), 'capture fingerprint describes live CSS');
  return {...actual, preservedSourceSha256: {...actual.preservedSourceSha256,
    'styles.css': hash(normalize(css, 'styles.css'))}};
};
module.exports = normalize;
