import type { VersionSpec } from './VersionSpec.js';

/** Read-only view of all user-tunable wrapper settings. */
export interface Configuration {
  /** Which Trivy version to install and run. */
  versionSpec(): VersionSpec;

  /** Custom cache root directory, or null to use the platform default. */
  cacheDirectoryOverride(): string | null;
}
