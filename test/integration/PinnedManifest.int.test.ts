import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PinnedRelease } from '../../src/config/PinnedRelease.js';
import { TrivyReleaseUrls } from '../../src/config/TrivyReleaseUrls.js';
import { TrivyVersion } from '../../src/domain/TrivyVersion.js';
import { HttpsHttpClient } from '../../src/net/HttpsHttpClient.js';
import { ChecksumFile } from '../../src/security/ChecksumFile.js';

/**
 * Guards against pin drift: every checksum baked into the package must match
 * the official manifest GitHub serves for the pinned release, byte for byte.
 */
test('pinned checksums match the official release manifest', async () => {
  const version = TrivyVersion.of(PinnedRelease.VERSION);
  const manifestText = await new HttpsHttpClient().fetchText(TrivyReleaseUrls.checksumManifestUrl(version));
  const manifest = ChecksumFile.parse(manifestText);
  assert.ok(manifest.size() > 0, 'official manifest should not be empty');

  for (const assetName of PinnedRelease.assetNames()) {
    const official = manifest.digestFor(assetName);
    assert.ok(official !== null, `official manifest lacks ${assetName}`);
    assert.equal(PinnedRelease.checksumFor(assetName), official.toString(), `checksum drift for ${assetName}`);
  }
});
