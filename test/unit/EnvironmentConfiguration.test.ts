import assert from 'node:assert/strict';
import { test } from 'node:test';

import { EnvironmentConfiguration } from '../../src/config/EnvironmentConfiguration.js';
import { ConfigurationError } from '../../src/errors/ConfigurationError.js';

test('defaults to the LATEST strategy when the variable is absent or empty', () => {
  for (const env of [{}, { TRIVY_SCAN_VERSION: '' }, { TRIVY_SCAN_VERSION: '  ' }, { TRIVY_SCAN_VERSION: 'latest' }]) {
    assert.ok(new EnvironmentConfiguration(env).versionSpec().isLatest());
  }
});

test('recognizes the PINNED strategy case-insensitively', () => {
  for (const value of ['pinned', 'PINNED', 'Pinned']) {
    assert.ok(new EnvironmentConfiguration({ TRIVY_SCAN_VERSION: value }).versionSpec().isPinned());
  }
});

test('treats anything else as an explicit version', () => {
  const spec = new EnvironmentConfiguration({ TRIVY_SCAN_VERSION: 'v0.71.0' }).versionSpec();
  assert.ok(spec.isExplicit());
  assert.equal(spec.explicitVersion().tag(), 'v0.71.0');
});

test('rejects malformed explicit versions with a descriptive error', () => {
  assert.throws(
    () => new EnvironmentConfiguration({ TRIVY_SCAN_VERSION: 'newest' }).versionSpec(),
    ConfigurationError,
  );
});

test('cache directory override is null unless set to a non-blank value', () => {
  assert.equal(new EnvironmentConfiguration({}).cacheDirectoryOverride(), null);
  assert.equal(new EnvironmentConfiguration({ TRIVY_SCAN_CACHE_DIR: '  ' }).cacheDirectoryOverride(), null);
  assert.equal(
    new EnvironmentConfiguration({ TRIVY_SCAN_CACHE_DIR: '/tmp/custom' }).cacheDirectoryOverride(),
    '/tmp/custom',
  );
});
