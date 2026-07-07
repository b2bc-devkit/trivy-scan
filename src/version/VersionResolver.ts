import type { TrivyVersion } from '../domain/TrivyVersion.js';

/** Determines which Trivy version should be installed and run. */
export interface VersionResolver {
  /**
   * @throws VersionResolutionError when no version can be determined.
   */
  resolve(): Promise<TrivyVersion>;
}
