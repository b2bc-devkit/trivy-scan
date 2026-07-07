import type { PlatformTarget } from '../domain/PlatformTarget.js';

/** Resolves the host system to a supported Trivy release target. */
export interface PlatformResolver {
  /**
   * @throws UnsupportedPlatformError when no official artifact serves the host.
   */
  resolve(): PlatformTarget;
}
