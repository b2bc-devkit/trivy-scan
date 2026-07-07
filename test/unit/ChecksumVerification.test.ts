import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { test } from 'node:test';

import { Sha256Digest } from '../../src/domain/Sha256Digest.js';
import { ChecksumMismatchError } from '../../src/errors/ChecksumMismatchError.js';
import { ChecksumVerifier } from '../../src/security/ChecksumVerifier.js';
import { ProvidedChecksum } from '../../src/security/ProvidedChecksum.js';
import { Sha256FileHasher } from '../../src/security/Sha256FileHasher.js';
import { TempDirectory } from '../helpers/TempDirectory.js';

// Precomputed: sha256("hello world")
const HELLO_WORLD_SHA256 = 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9';

test('Sha256Digest validates and normalizes hex input', () => {
  assert.equal(Sha256Digest.ofHex(HELLO_WORLD_SHA256.toUpperCase()).toString(), HELLO_WORLD_SHA256);
  assert.ok(Sha256Digest.ofHex(HELLO_WORLD_SHA256).equals(Sha256Digest.ofHex(HELLO_WORLD_SHA256)));
  for (const bad of ['', 'zz', HELLO_WORLD_SHA256.slice(1), `${HELLO_WORLD_SHA256}00`]) {
    assert.throws(() => Sha256Digest.ofHex(bad), RangeError);
  }
});

test('hasher computes the expected digest of a file', async () => {
  const scratch = await TempDirectory.create();
  try {
    const filePath = scratch.join('payload.bin');
    await writeFile(filePath, 'hello world');
    const digest = await new Sha256FileHasher().hash(filePath);
    assert.equal(digest.toString(), HELLO_WORLD_SHA256);
  } finally {
    await scratch.dispose();
  }
});

test('verifier passes on matching checksum and hard-fails on mismatch', async () => {
  const scratch = await TempDirectory.create();
  try {
    const filePath = scratch.join('artifact.tar.gz');
    await writeFile(filePath, 'hello world');
    const verifier = new ChecksumVerifier(new Sha256FileHasher());

    const good = new ProvidedChecksum(Sha256Digest.ofHex(HELLO_WORLD_SHA256), 'test');
    await verifier.verifyOrThrow(filePath, good, 'artifact.tar.gz');

    const evil = new ProvidedChecksum(Sha256Digest.ofHex('0'.repeat(64)), 'test');
    await assert.rejects(
      () => verifier.verifyOrThrow(filePath, evil, 'artifact.tar.gz'),
      (error: unknown) => {
        assert.ok(error instanceof ChecksumMismatchError);
        assert.ok(error.message.includes('SECURITY'));
        assert.ok(error.message.includes('0'.repeat(64)), 'message should show the expected digest');
        assert.ok(error.message.includes(HELLO_WORLD_SHA256), 'message should show the actual digest');
        assert.equal(error.asset(), 'artifact.tar.gz');
        return true;
      },
    );
  } finally {
    await scratch.dispose();
  }
});
