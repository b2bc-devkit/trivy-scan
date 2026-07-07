import { TrivyScanError } from './TrivyScanError.js';

/**
 * Raised when no trusted SHA-256 checksum can be obtained for an artifact.
 * Without a checksum the artifact is never downloaded or executed.
 */
export class ChecksumUnavailableError extends TrivyScanError {
  public constructor(message: string) {
    super(message);
  }
}
