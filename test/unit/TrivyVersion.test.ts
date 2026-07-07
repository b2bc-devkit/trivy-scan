import assert from 'node:assert/strict';
import { test } from 'node:test';

import { TrivyVersion } from '../../src/domain/TrivyVersion.js';
import { ConfigurationError } from '../../src/errors/ConfigurationError.js';

test('accepts plain and v-prefixed versions and normalizes both forms', () => {
  for (const raw of ['0.72.0', 'v0.72.0', '  v0.72.0  ']) {
    const version = TrivyVersion.of(raw);
    assert.equal(version.semver(), '0.72.0');
    assert.equal(version.tag(), 'v0.72.0');
    assert.equal(version.toString(), 'v0.72.0');
  }
});

test('equals() compares by normalized value', () => {
  assert.ok(TrivyVersion.of('0.72.0').equals(TrivyVersion.of('v0.72.0')));
  assert.ok(!TrivyVersion.of('0.72.0').equals(TrivyVersion.of('0.72.1')));
});

test('rejects malformed or malicious version strings', () => {
  const invalid = ['latest', '0.72', 'v1.2.3.4', '0.72.0-rc1', 'v0.72.0/../evil', '', '0.72.0;rm -rf /'];
  for (const raw of invalid) {
    assert.throws(() => TrivyVersion.of(raw), ConfigurationError, `should reject "${raw}"`);
  }
});
