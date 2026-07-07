import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PinnedRelease } from '../../src/config/PinnedRelease.js';
import { VersionSpec } from '../../src/config/VersionSpec.js';
import { TrivyVersion } from '../../src/domain/TrivyVersion.js';
import { VersionResolutionError } from '../../src/errors/VersionResolutionError.js';
import type { VersionResolver } from '../../src/version/VersionResolver.js';
import { VersionResolutionService } from '../../src/version/VersionResolutionService.js';
import { FakeConfiguration } from '../helpers/FakeConfiguration.js';
import { FakeLogger } from '../helpers/FakeLogger.js';

class StubLatestResolver implements VersionResolver {
  public result: TrivyVersion | null = null;

  public resolve(): Promise<TrivyVersion> {
    return this.result === null
      ? Promise.reject(new VersionResolutionError('stubbed failure'))
      : Promise.resolve(this.result);
  }
}

test('EXPLICIT spec short-circuits to the requested version', async () => {
  const service = new VersionResolutionService(
    new FakeConfiguration(VersionSpec.explicit(TrivyVersion.of('v0.71.0'))),
    new StubLatestResolver(),
    new FakeLogger(),
  );
  assert.equal((await service.resolve()).tag(), 'v0.71.0');
});

test('PINNED spec returns the packaged release without touching the resolver', async () => {
  const service = new VersionResolutionService(
    new FakeConfiguration(VersionSpec.PINNED),
    new StubLatestResolver(),
    new FakeLogger(),
  );
  assert.equal((await service.resolve()).semver(), PinnedRelease.VERSION);
});

test('LATEST spec delegates to the latest resolver', async () => {
  const stub = new StubLatestResolver();
  stub.result = TrivyVersion.of('9.9.9');
  const service = new VersionResolutionService(new FakeConfiguration(VersionSpec.LATEST), stub, new FakeLogger());
  assert.equal((await service.resolve()).semver(), '9.9.9');
});

test('LATEST spec degrades to the pinned release when resolution fails, with a warning', async () => {
  const logger = new FakeLogger();
  const service = new VersionResolutionService(new FakeConfiguration(VersionSpec.LATEST), new StubLatestResolver(), logger);
  assert.equal((await service.resolve()).semver(), PinnedRelease.VERSION);
  assert.equal(logger.warnMessages.length, 1);
  assert.ok(logger.warnMessages[0]?.includes('stubbed failure'));
});
