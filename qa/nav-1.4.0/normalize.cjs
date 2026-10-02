'use strict';
const assert = require('node:assert/strict');
const changes = require('./changes.json');
module.exports = html => {
  for (const [before, after] of [...changes].reverse()) {
    assert.equal(html.split(after).length, 2, 'exactly one reviewed nav 1.4 presentation delta');
    html = html.replace(after, before);
  }
  return html;
};
