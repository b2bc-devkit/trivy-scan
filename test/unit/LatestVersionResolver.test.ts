import assert from 'node:assert/strict';
import { test } from 'node:test';

import { VersionResolutionError } from '../../src/errors/VersionResolutionError.js';
import { LatestVersionResolver } from '../../src/version/LatestVersionResolver.js';
import { VersionCheckCache } from '../../src/version/VersionCheckCache.js';
import { FakeHttpClient } from '../helpers/FakeHttpClient.js';
import { FakeLogger } from '../helpers/FakeLogger.js';
import { TempDirectory } from '../helpers/TempDirectory.js';

const REDIRECT = 'https://github.com/aquasecurity/trivy/releases/tag/v0.99.1';

test('resolves the version from the releases/latest redirect and caches it', async () => {
  const scratch = await TempDirectory.create();
  try {
    const httpClient = new FakeHttpClient();
    httpClient.redirectLocation = REDIRECT;
    const cache = new VersionCheckCache(scratch.join('latest-version.json'));
    const resolver = new LatestVersionResolver(httpClient, cache, new FakeLogger());

    const first = await resolver.resolve();
    assert.equal(first.tag(), 'v0.99.1');
    assert.equal(httpClient.redirectCalls, 1);

    // Second resolution is served from the fresh cache — no further requests.
    const second = await resolver.resolve();
    assert.equal(second.tag(), 'v0.99.1');
    assert.equal(httpClient.redirectCalls, 1);
  } finally {
    await scratch.dispose();
  }
});

test('falls back to the last known version when the check fails, with a warning', async () => {
  const scratch = await TempDirectory.create();
  try {
    const cachePath = scratch.join('latest-version.json');
    const seeder = new FakeHttpClient();
    seeder.redirectLocation = REDIRECT;
    // TTL of zero: the cache is immediately stale, forcing an upstream check.
    await new LatestVersionResolver(seeder, new VersionCheckCache(cachePath, 0), new FakeLogger()).resolve();

    const offline = new FakeHttpClient();
    offline.failure = new Error('network unreachable');
    const logger = new FakeLogger();
    const resolver = new LatestVersionResolver(offline, new VersionCheckCache(cachePath, 0), logger);

    const version = await resolver.resolve();
    assert.equal(version.tag(), 'v0.99.1');
    assert.equal(logger.warnMessages.length, 1);
    assert.ok(logger.warnMessages[0]?.includes('network unreachable'));
  } finally {
    await scratch.dispose();
  }
});

test('fails with VersionResolutionError when offline and nothing was ever cached', async () => {
  const scratch = await TempDirectory.create();
  try {
    const offline = new FakeHttpClient();
    offline.failure = new Error('network unreachable');
    const resolver = new LatestVersionResolver(
      offline,
      new VersionCheckCache(scratch.join('latest-version.json')),
      new FakeLogger(),
    );
    await assert.rejects(() => resolver.resolve(), VersionResolutionError);
  } finally {
    await scratch.dispose();
  }
});

test('rejects redirects that do not point at a release tag', async () => {
  const scratch = await TempDirectory.create();
  try {
    const httpClient = new FakeHttpClient();
    httpClient.redirectLocation = 'https://github.com/aquasecurity/trivy/releases';
    const resolver = new LatestVersionResolver(
      httpClient,
      new VersionCheckCache(scratch.join('latest-version.json')),
      new FakeLogger(),
    );
    await assert.rejects(() => resolver.resolve(), VersionResolutionError);
  } finally {
    await scratch.dispose();
  }
});
