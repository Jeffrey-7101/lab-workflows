'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { sum, greet } = require('../src/index.js');

test('sum(2, 3) === 5', () => {
  assert.equal(sum(2, 3), 5);
});

test('greet("G4") === "Hola, G4!"', () => {
  assert.equal(greet('G4'), 'Hola, G4!');
});
