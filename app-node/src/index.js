'use strict';

function sum(a, b) {
  return a + b;
}

function greet(name) {
  return `Hola, ${name}!`;
}

module.exports = { sum, greet };

if (require.main === module) {
  const nombre = process.argv[2] || 'mundo';
  console.log(greet(nombre));
  console.log(`sum(2, 3) = ${sum(2, 3)}`);
}
