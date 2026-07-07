import type { ChecksumProvider } from './ChecksumProvider.js';
import { ProvidedChecksum } from './ProvidedChecksum.js';
import { PinnedRelease } from '../config/PinnedRelease.js';
import { Sha256Digest } from '../domain/Sha256Digest.js';
import type { TrivyVersion } from '../domain/TrivyVersion.js';
import { ChecksumUnavailableError } from '../errors/ChecksumUnavailableError.js';

/**
 * Serves the checksums baked into this package at publish time — the
 * strongest trust anchor available, requiring no network access at all.
 * Only covers the pinned release version.
 */
export class PinnedChecksumProvider implements ChecksumProvider {
  private static readonly PROVENANCE = 'checksum pinned inside the trivy-scan package';

  /** True when this provider can vouch for the given artifact offline. */
  public covers(version: TrivyVersion, assetName: string): boolean {
    return version.semver() === PinnedRelease.VERSION && PinnedRelease.checksumFor(assetName) !== undefined;
  }

  public checksumFor(version: TrivyVersion, assetName: string): Promise<ProvidedChecksum> {
    const hex = version.semver() === PinnedRelease.VERSION ? PinnedRelease.checksumFor(assetName) : undefined;
    if (hex === undefined) {
      return Promise.reject(
        new ChecksumUnavailableError(`no pinned checksum for ${assetName} (pinned release is v${PinnedRelease.VERSION})`),
      );
    }
    return Promise.resolve(new ProvidedChecksum(Sha256Digest.ofHex(hex), PinnedChecksumProvider.PROVENANCE));
  }
}
