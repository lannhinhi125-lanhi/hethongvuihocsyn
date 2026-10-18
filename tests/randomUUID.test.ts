import assert from 'node:assert/strict';
import {randomUUID} from '../src/lib/randomUUID';

const original = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
try {
  const native = globalThis.crypto;
  Object.defineProperty(globalThis, 'crypto', {
    configurable: true,
    value: {getRandomValues: native.getRandomValues.bind(native)},
  });
  const ids = Array.from({length: 1000}, () => randomUUID());
  assert.ok(ids.every(id => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id)));
  assert.equal(new Set(ids).size, ids.length);
  const expected = native.randomUUID();
  Object.defineProperty(globalThis, 'crypto', {configurable: true, value: {randomUUID: () => expected}});
  assert.equal(randomUUID(), expected);
} finally {
  if (original) Object.defineProperty(globalThis, 'crypto', original);
}
console.log('PASS: UUID generation with and without secure-context randomUUID');
