import assert from 'node:assert/strict';
import { test } from 'node:test';

import { PinnedRelease } from '../../src/config/PinnedRelease.js';
import { TrivyVersion } from '../../src/domain/TrivyVersion.js';
import { NodePlatformResolver } from '../../src/platform/NodePlatformResolver.js';

test('pinned version is a well-formed release version', () => {
  assert.match(PinnedRelease.VERSION, /^\d+\.\d+\.\d+$/);
});

test('every supported platform has a pinned checksum (matrix coverage invariant)', () => {
  const pinnedVersion = TrivyVersion.of(PinnedRelease.VERSION);
  for (const target of NodePlatformResolver.supportedTargets()) {
    const assetName = target.assetNameFor(pinnedVersion);
    const checksum = PinnedRelease.checksumFor(assetName);
    assert.ok(checksum !== undefined, `missing pinned checksum for ${assetName} — run: npm run update-pinned`);
    assert.match(checksum, /^[0-9a-f]{64}$/, `malformed checksum for ${assetName}`);
  }
});

test('unknown artifacts have no checksum', () => {
  assert.equal(PinnedRelease.checksumFor('trivy_9.9.9_Amiga-68k.lha'), undefined);
});

test('assetNames() exposes exactly the pinned artifacts', () => {
  const names = PinnedRelease.assetNames();
  assert.ok(names.length >= 8);
  for (const name of names) {
    assert.ok(PinnedRelease.checksumFor(name) !== undefined);
  }
});
