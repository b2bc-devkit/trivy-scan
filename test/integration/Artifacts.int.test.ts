import assert from 'node:assert/strict';
import { open } from 'node:fs/promises';
import { test } from 'node:test';

import { ArchiveExtractorFactory } from '../../src/archive/ArchiveExtractorFactory.js';
import { PinnedRelease } from '../../src/config/PinnedRelease.js';
import { TrivyReleaseUrls } from '../../src/config/TrivyReleaseUrls.js';
import { TrivyVersion } from '../../src/domain/TrivyVersion.js';
import { HttpsHttpClient } from '../../src/net/HttpsHttpClient.js';
import { NodePlatformResolver } from '../../src/platform/NodePlatformResolver.js';
import { ChecksumVerifier } from '../../src/security/ChecksumVerifier.js';
import { PinnedChecksumProvider } from '../../src/security/PinnedChecksumProvider.js';
import { Sha256FileHasher } from '../../src/security/Sha256FileHasher.js';
import { DownloadCache } from '../helpers/DownloadCache.js';
import { TempDirectory } from '../helpers/TempDirectory.js';

interface ArtifactCase {
  platform: NodeJS.Platform;
  arch: string;
  /** Accepted executable magic numbers (first bytes). */
  magics: Buffer[];
}

// One artifact per OS family: exercises the tar.gz path (ELF + Mach-O) and
// the zip path (PE/MZ) against real release binaries.
const CASES: readonly ArtifactCase[] = [
  { platform: 'linux', arch: 'x64', magics: [Buffer.from([0x7f, 0x45, 0x4c, 0x46])] },
  { platform: 'darwin', arch: 'arm64', magics: [Buffer.from([0xcf, 0xfa, 0xed, 0xfe]), Buffer.from([0xca, 0xfe, 0xba, 0xbe])] },
  { platform: 'win32', arch: 'x64', magics: [Buffer.from([0x4d, 0x5a])] },
];

async function readLeadingBytes(filePath: string, count: number): Promise<Buffer> {
  const handle = await open(filePath, 'r');
  try {
    const buffer = Buffer.alloc(count);
    await handle.read(buffer, 0, count, 0);
    return buffer;
  } finally {
    await handle.close();
  }
}

for (const artifactCase of CASES) {
  test(`downloads, verifies and extracts a real ${artifactCase.platform}-${artifactCase.arch} binary`, async () => {
    const version = TrivyVersion.of(PinnedRelease.VERSION);
    const target = new NodePlatformResolver(artifactCase.platform, artifactCase.arch).resolve();
    const assetName = target.assetNameFor(version);

    const scratch = await TempDirectory.create();
    try {
      const archivePath = scratch.join(assetName);
      await new DownloadCache(new HttpsHttpClient()).downloadFile(
        TrivyReleaseUrls.downloadUrl(version, assetName),
        archivePath,
      );

      // Verify against the checksum pinned inside the package.
      const checksum = await new PinnedChecksumProvider().checksumFor(version, assetName);
      await new ChecksumVerifier(new Sha256FileHasher()).verifyOrThrow(archivePath, checksum, assetName);

      // Extract the executable and check it is the expected binary format.
      const binaryPath = scratch.join(target.executableName());
      const extractor = new ArchiveExtractorFactory().forFormat(target.archiveFormat());
      await extractor.extract(archivePath, target.executableName(), binaryPath);

      const leading = await readLeadingBytes(binaryPath, 4);
      const matches = artifactCase.magics.some((magic) => leading.subarray(0, magic.length).equals(magic));
      assert.ok(matches, `unexpected executable magic ${leading.toString('hex')} for ${assetName}`);
    } finally {
      await scratch.dispose();
    }
  });
}
