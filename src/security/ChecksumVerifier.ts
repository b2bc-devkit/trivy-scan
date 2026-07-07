import type { ProvidedChecksum } from './ProvidedChecksum.js';
import type { Sha256FileHasher } from './Sha256FileHasher.js';
import { ChecksumMismatchError } from '../errors/ChecksumMismatchError.js';

/**
 * Gatekeeper between "downloaded" and "trusted": every archive must pass
 * verification here before it is ever extracted or executed.
 */
export class ChecksumVerifier {
  private readonly hasher: Sha256FileHasher;

  public constructor(hasher: Sha256FileHasher) {
    this.hasher = hasher;
  }

  /**
   * @throws ChecksumMismatchError when the file content does not match `expected`.
   */
  public async verifyOrThrow(filePath: string, expected: ProvidedChecksum, assetName: string): Promise<void> {
    const actual = await this.hasher.hash(filePath);
    if (!expected.digest().equals(actual)) {
      throw new ChecksumMismatchError(assetName, expected.digest(), actual);
    }
  }
}
