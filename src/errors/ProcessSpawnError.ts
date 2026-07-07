import { TrivyScanError } from './TrivyScanError.js';

/** Raised when the cached Trivy binary exists but cannot be started. */
export class ProcessSpawnError extends TrivyScanError {
  public constructor(binaryPath: string, cause: unknown) {
    super(`failed to start Trivy at ${binaryPath}: ${TrivyScanError.describe(cause)}`);
  }
}
