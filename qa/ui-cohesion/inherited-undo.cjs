'use strict';

// Only the observed mobile hidden-Undo defect may be classified as inherited.
// The caller supplies the SAME width/theme/scenario/stage baseline observation.
module.exports = (width, actual, before) => width <= 640 &&
  actual?.hidden === true && actual?.rendered === true &&
  ['flex', 'inline-flex'].includes(actual.display) &&
  before?.hidden === true && before?.rendered === true && before?.display === actual.display;
