import type { ChecksumProvider } from './ChecksumProvider.js';
import type { PinnedChecksumProvider } from './PinnedChecksumProvider.js';
import type { ProvidedChecksum } from './ProvidedChecksum.js';
import type { TrivyVersion } from '../domain/TrivyVersion.js';

/**
 * Prefers package-pinned checksums (offline, publish-time trust anchor) and
 * falls back to the official release manifest for any other version.
 */
export class CompositeChecksumProvider implements ChecksumProvider {
  private readonly pinnedProvider: PinnedChecksumProvider;
  private readonly remoteProvider: ChecksumProvider;

  public constructor(pinnedProvider: PinnedChecksumProvider, remoteProvider: ChecksumProvider) {
    this.pinnedProvider = pinnedProvider;
    this.remoteProvider = remoteProvider;
  }

  public checksumFor(version: TrivyVersion, assetName: string): Promise<ProvidedChecksum> {
    if (this.pinnedProvider.covers(version, assetName)) {
      return this.pinnedProvider.checksumFor(version, assetName);
    }
    return this.remoteProvider.checksumFor(version, assetName);
  }
}
