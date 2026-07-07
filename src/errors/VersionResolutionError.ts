import { TrivyScanError } from './TrivyScanError.js';

/** Raised when the Trivy version to install cannot be determined. */
export class VersionResolutionError extends TrivyScanError {
  public constructor(message: string) {
    super(message);
  }
}
