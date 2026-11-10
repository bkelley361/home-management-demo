import test from 'node:test';
import assert from 'node:assert/strict';
import { generateUUID } from '../lib/utils.ts';

test('generateUUID produces valid RFC 4122 v4 UUIDs', () => {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (let i = 0; i < 50; i++) {
    const id = generateUUID();
    assert.match(id, uuidRegex);
  }
});

test('generateUUID generates unique identifiers', () => {
  const ids = new Set();
  for (let i = 0; i < 100; i++) {
    ids.add(generateUUID());
  }
  assert.equal(ids.size, 100);
});

test('generateUUID works when global crypto is undefined (e.g. React Native Hermes)', () => {
  const originalCrypto = globalThis.crypto;
  try {
    delete globalThis.crypto;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const id = generateUUID();
    assert.match(id, uuidRegex);
  } finally {
    globalThis.crypto = originalCrypto;
  }
});
