import { TrivyScanError } from './TrivyScanError.js';
import type { Sha256Digest } from '../domain/Sha256Digest.js';

/**
 * Raised when a downloaded artifact does not match its trusted SHA-256 checksum.
 *
 * This is treated as a hard security failure: the artifact is discarded by the
 * installer and is never extracted or executed.
 */
export class ChecksumMismatchError extends TrivyScanError {
  private readonly assetName: string;
  private readonly expectedDigest: Sha256Digest;
  private readonly actualDigest: Sha256Digest;

  public constructor(assetName: string, expected: Sha256Digest, actual: Sha256Digest) {
    super(
      [
        `SECURITY: SHA-256 checksum mismatch for ${assetName}.`,
        `  expected: ${expected.toString()}`,
        `  actual:   ${actual.toString()}`,
        'The downloaded file has been discarded and was never executed.',
        'This usually indicates a corrupted download, but it can also indicate a tampered artifact.',
        'Re-run the command to retry; if the mismatch persists, investigate before trusting the source.',
      ].join('\n'),
    );
    this.assetName = assetName;
    this.expectedDigest = expected;
    this.actualDigest = actual;
  }

  public asset(): string {
    return this.assetName;
  }

  public expected(): Sha256Digest {
    return this.expectedDigest;
  }

  public actual(): Sha256Digest {
    return this.actualDigest;
  }
}
