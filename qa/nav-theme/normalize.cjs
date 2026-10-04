'use strict';
const assert = require('node:assert/strict');
module.exports = html => {
  html = require('../ui-cohesion/normalize.cjs')(html);
  for (const [before, after] of [...require('./changes.json')].reverse()) {
    assert.equal(html.split(after).length, 2, 'exactly one reviewed host-theme delta');
    html = html.replace(after, before);
  }
  return html;
};
