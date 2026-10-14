'use strict';
const assert = require('node:assert/strict');
// Reverse exactly the reviewed module upgrade; never substitute archived HTML.
module.exports = html => {
  const candidate = './assets/ro-suite/2.0.0/nav.js';
  assert.equal(html.split(candidate).length, 2, 'exactly one reviewed dynamic navigation module');
  assert.equal(html.split('./assets/ro-suite/1.5.1/nav.js').length, 1, 'no duplicate historical module');
  return html.replace(candidate, './assets/ro-suite/1.5.1/nav.js');
};
