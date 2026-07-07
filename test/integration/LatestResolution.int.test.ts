import assert from 'node:assert/strict';
import { test } from 'node:test';

import { HttpsHttpClient } from '../../src/net/HttpsHttpClient.js';
import { LatestVersionResolver } from '../../src/version/LatestVersionResolver.js';
import { VersionCheckCache } from '../../src/version/VersionCheckCache.js';
import { FakeLogger } from '../helpers/FakeLogger.js';
import { TempDirectory } from '../helpers/TempDirectory.js';

test('resolves the real latest Trivy release via the redirect (no GitHub API)', async () => {
  const scratch = await TempDirectory.create();
  try {
    const cache = new VersionCheckCache(scratch.join('latest-version.json'));
    const resolver = new LatestVersionResolver(new HttpsHttpClient(), cache, new FakeLogger());

    const version = await resolver.resolve();
    assert.match(version.semver(), /^\d+\.\d+\.\d+$/);

    // The lookup must be memoized on disk for subsequent runs.
    assert.ok((await cache.readFresh())?.equals(version));
  } finally {
    await scratch.dispose();
  }
});
