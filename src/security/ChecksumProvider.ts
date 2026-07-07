import type { ProvidedChecksum } from './ProvidedChecksum.js';
import type { TrivyVersion } from '../domain/TrivyVersion.js';

/** Supplies the trusted SHA-256 checksum for a release artifact. */
export interface ChecksumProvider {
  /**
   * @throws ChecksumUnavailableError when no trusted checksum exists for the artifact.
   */
  checksumFor(version: TrivyVersion, assetName: string): Promise<ProvidedChecksum>;
}
