import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { access, constants as fsConstants } from 'node:fs/promises';
import { test } from 'node:test';
import { promisify } from 'node:util';

import { ArchiveExtractorFactory } from '../../src/archive/ArchiveExtractorFactory.js';
import { CacheDirectoryLocator } from '../../src/cache/CacheDirectoryLocator.js';
import { PinnedRelease } from '../../src/config/PinnedRelease.js';
import { VersionSpec } from '../../src/config/VersionSpec.js';
import { TrivyInstaller } from '../../src/installer/TrivyInstaller.js';
import { HttpsHttpClient } from '../../src/net/HttpsHttpClient.js';
import { NodePlatformResolver } from '../../src/platform/NodePlatformResolver.js';
import { ChecksumVerifier } from '../../src/security/ChecksumVerifier.js';
import { CompositeChecksumProvider } from '../../src/security/CompositeChecksumProvider.js';
import { PinnedChecksumProvider } from '../../src/security/PinnedChecksumProvider.js';
import { RemoteChecksumProvider } from '../../src/security/RemoteChecksumProvider.js';
import { Sha256FileHasher } from '../../src/security/Sha256FileHasher.js';
import { LatestVersionResolver } from '../../src/version/LatestVersionResolver.js';
import { VersionCheckCache } from '../../src/version/VersionCheckCache.js';
import { VersionResolutionService } from '../../src/version/VersionResolutionService.js';
import { DownloadCache } from '../helpers/DownloadCache.js';
import { FakeConfiguration } from '../helpers/FakeConfiguration.js';
import { FakeHttpClient } from '../helpers/FakeHttpClient.js';
import { FakeLogger } from '../helpers/FakeLogger.js';
import { TempDirectory } from '../helpers/TempDirectory.js';

const execFileAsync = promisify(execFile);

function buildInstaller(cacheRoot: string, httpClient: HttpsHttpClient | FakeHttpClient | DownloadCache, logger: FakeLogger): TrivyInstaller {
  const configuration = new FakeConfiguration(VersionSpec.PINNED, cacheRoot);
  const cacheLocator = new CacheDirectoryLocator(configuration);
  const versionResolver = new VersionResolutionService(
    configuration,
    new LatestVersionResolver(httpClient, new VersionCheckCache(cacheLocator.versionCheckFilePath()), logger),
    logger,
  );
  return new TrivyInstaller(
    new NodePlatformResolver(),
    versionResolver,
    new CompositeChecksumProvider(new PinnedChecksumProvider(), new RemoteChecksumProvider(httpClient, cacheLocator)),
    new ChecksumVerifier(new Sha256FileHasher()),
    new ArchiveExtractorFactory(),
    cacheLocator,
    httpClient,
    logger,
  );
}

test('full pipeline: download -> verify -> extract -> chmod -> run trivy --version', async (t) => {
  if (!NodePlatformResolver.supportedPlatformKeys().includes(`${process.platform}-${process.arch}`)) {
    t.skip(`host platform ${process.platform}-${process.arch} not supported`);
    return;
  }
  const scratch = await TempDirectory.create();
  try {
    const logger = new FakeLogger();
    const installer = buildInstaller(scratch.path(), new DownloadCache(new HttpsHttpClient()), logger);

    const binaryPath = await installer.ensureInstalled();
    await access(binaryPath, fsConstants.X_OK);
    assert.ok(logger.infoMessages.some((message) => message.includes('checksum OK')));

    const { stdout } = await execFileAsync(binaryPath, ['--version']);
    assert.ok(stdout.includes(`Version: ${PinnedRelease.VERSION}`), `unexpected --version output:\n${stdout}`);

    // Second call must be a pure cache hit: a client that rejects every
    // request proves that no network traffic happens at all.
    const offline = new FakeHttpClient();
    offline.failure = new Error('network must not be touched on cache hits');
    const cachedPath = await buildInstaller(scratch.path(), offline, new FakeLogger()).ensureInstalled();
    assert.equal(cachedPath, binaryPath);
  } finally {
    await scratch.dispose();
  }
});
